import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type BindLineUserIdOutcome =
  | { ok: true }
  | { ok: false; reason: "already_bound_to_different_line_user" };

/**
 * 純函式：profile 既有 line_user_id 已經非 NULL（代表這次的條件式
 * UPDATE 沒搶到）時，判斷這是「同一人重試/網路重送」（冪等成功，不擋）
 * 還是「被別人先綁走了」（衝突，回錯誤）。見
 * docs/phase-7a-early-launch-draft.md §4.3「單次失效設計」。
 */
export function decideExistingBindOutcome(
  currentLineUserId: string,
  incomingLineUserId: string
): BindLineUserIdOutcome {
  return currentLineUserId === incomingLineUserId
    ? { ok: true }
    : { ok: false, reason: "already_bound_to_different_line_user" };
}

/**
 * 共用尾段：把一個已知的 customerId 綁定到一個 line_user_id。
 * findOrCreateCustomerForMember（OTP 路徑）跟 counter-bind-complete
 * （櫃檯代客綁定路徑，Wave 2）共用同一份邏輯，不各自寫一份——差別只在
 * 「customerId 怎麼來的」（前者用手機找/建，後者由店員產生的 grant
 * token 直接指定），綁定本身的邏輯完全相同，理由見
 * design-log.md 2026-07-11 條目「多入口優先抽共用函式」。
 *
 * 單次失效設計：
 * - customer 已有 profiles 列時，用 `.is("line_user_id", null)` 條件式
 *   UPDATE，只有目前是 NULL 才會真的寫入——資料庫層級原子操作，第一個
 *   成功呼叫的人才會綁到，沒有 TOCTOU 漏洞。沒搶到的呼叫重查一次目前值
 *   交給 decideExistingBindOutcome 判斷是冪等成功還是衝突。
 * - customer 從未有過 profiles 列時，新建後用 `.is("profile_id", null)`
 *   條件式 UPDATE 串上 customers，同樣道理保護大部分情況；仍有一個極窄
 *   的殘餘競態窗口（兩個請求同時幫同一位「這輩子第一次」的客人建
 *   profiles），這跟本檔案既有對「同一支新手機併發首次綁定」的容忍
 *   （見下方 catch 23505 那段）屬於同一等級的已知風險，本輪不加碼工程
 *   去堵死它。
 */
export async function bindLineUserIdToCustomer(
  supabase: SupabaseClient<Database>,
  customerId: string,
  lineUserId: string,
  displayName?: string | null
): Promise<BindLineUserIdOutcome> {
  const customerRes = await supabase
    .from("customers")
    .select("id, profile_id, phone")
    .eq("id", customerId)
    .maybeSingle();
  if (customerRes.error) throw customerRes.error;
  if (!customerRes.data) throw new Error(`customer not found: ${customerId}`);

  const { profile_id: profileId, phone } = customerRes.data;

  if (profileId) {
    const updateRes = await supabase
      .from("profiles")
      .update({ line_user_id: lineUserId })
      .eq("id", profileId)
      .is("line_user_id", null)
      .select("id");
    if (updateRes.error) throw updateRes.error;
    if (updateRes.data && updateRes.data.length > 0) {
      return { ok: true };
    }

    const currentRes = await supabase.from("profiles").select("line_user_id").eq("id", profileId).maybeSingle();
    if (currentRes.error) throw currentRes.error;
    const currentLineUserId = currentRes.data?.line_user_id ?? null;
    if (!currentLineUserId) {
      // 理論上不該發生（條件式 UPDATE 沒搶到代表當下非 NULL），保守當衝突處理。
      return { ok: false, reason: "already_bound_to_different_line_user" };
    }
    return decideExistingBindOutcome(currentLineUserId, lineUserId);
  }

  const profileIns = await supabase
    .from("profiles")
    .insert({ role: "customer", line_user_id: lineUserId, phone, display_name: displayName ?? null })
    .select("id")
    .single();
  if (profileIns.error) throw profileIns.error;

  const linkRes = await supabase
    .from("customers")
    .update({ profile_id: profileIns.data.id })
    .eq("id", customerId)
    .is("profile_id", null)
    .select("id");
  if (linkRes.error) throw linkRes.error;
  if (linkRes.data && linkRes.data.length > 0) {
    return { ok: true };
  }

  // 輸了上面說的極窄殘餘競態窗口：另一個並發請求已經先幫這位客人綁定過了。
  return { ok: false, reason: "already_bound_to_different_line_user" };
}

/**
 * Phase 6 A.3：LIFF 首次綁定的「查不到就用手機找/建」邏輯。跟
 * findOrCreateCustomer()（/book 用）的差異：這裡除了 customers 之外
 * 還要處理 profiles（role='customer', line_user_id）並把兩者串起來
 * ——老客人（門市留過手機、customers 已存在）只補一個 profiles 身分，
 * 既有的預約/儲值/服務紀錄歷史原樣接上；真正新客人才兩張表都新建。
 */
export async function findOrCreateCustomerForMember(
  supabase: SupabaseClient<Database>,
  phone: string,
  lineUserId: string,
  displayName?: string
): Promise<{ customerId: string }> {
  const existing = await supabase.from("customers").select("id, profile_id").eq("phone", phone).maybeSingle();
  if (existing.error) throw existing.error;

  let customerId: string;

  if (existing.data) {
    customerId = existing.data.id;
  } else {
    const inserted = await supabase
      .from("customers")
      .insert({ phone, name: displayName?.trim() || "LINE 會員", source: "line" })
      .select("id, profile_id")
      .single();

    if (inserted.error) {
      // 併發的兩次首次綁定用同一支新手機的邊界情況，重查一次拿既有那筆。
      if ((inserted.error as { code?: string }).code === "23505") {
        const retry = await supabase.from("customers").select("id, profile_id").eq("phone", phone).single();
        if (retry.error) throw retry.error;
        customerId = retry.data.id;
      } else {
        throw inserted.error;
      }
    } else {
      customerId = inserted.data.id;
    }
  }

  const bindResult = await bindLineUserIdToCustomer(supabase, customerId, lineUserId, displayName ?? null);
  if (!bindResult.ok) {
    // 理論上不該發生：這條路徑呼叫前，呼叫端已經用 findCustomerIdByLineUserId
    // 確認過這個 lineUserId 沒有綁過任何人。若這裡仍回報衝突，代表發生了
    // 競態或資料不一致，往外拋讓呼叫端回應錯誤，不靜默吞掉或覆蓋既有綁定。
    throw new Error(`LINE 綁定衝突：customer ${customerId} 已綁定不同的 line_user_id`);
  }

  return { customerId };
}

/**
 * 型別筆記：這支查詢一定要包在一個宣告 `supabase: SupabaseClient<Database>`
 * 的函式裡才能正確推論出 profiles 是單一物件（不是陣列）——
 * createAdminClient() 本身沒有帶 <Database> 泛型，直接在呼叫端
 * （例如 _actions.ts）inline 這個 embedded select 會讓 TS 退回成
 * one-to-many 推論，導致 line_user_id 存取失敗。這支 helper 存在的
 * 理由之一就是提供這層型別邊界，不是單純偷懶少寫一行查詢。
 */
export async function customerHasLineBinding(
  supabase: SupabaseClient<Database>,
  customerId: string
): Promise<boolean> {
  const res = await supabase
    .from("customers")
    .select("profiles ( line_user_id )")
    .eq("id", customerId)
    .maybeSingle();
  if (res.error) throw res.error;
  return !!res.data?.profiles?.line_user_id;
}

export async function findCustomerIdByLineUserId(
  supabase: SupabaseClient<Database>,
  lineUserId: string
): Promise<string | null> {
  const profileRes = await supabase.from("profiles").select("id").eq("line_user_id", lineUserId).maybeSingle();
  if (profileRes.error) throw profileRes.error;
  if (!profileRes.data) return null;

  const customerRes = await supabase.from("customers").select("id").eq("profile_id", profileRes.data.id).maybeSingle();
  if (customerRes.error) throw customerRes.error;
  return customerRes.data?.id ?? null;
}
