import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

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
  let profileId: string | null;

  if (existing.data) {
    customerId = existing.data.id;
    profileId = existing.data.profile_id;
  } else {
    const inserted = await supabase
      .from("customers")
      .insert({ phone, name: displayName?.trim() || "LINE 會員", source: "line" })
      .select("id, profile_id")
      .single();

    if (inserted.error) {
      // 併發的兩次首次綁定用同一支新手機的邊界情況，比照 findOrCreateCustomer 的做法重查一次。
      if ((inserted.error as { code?: string }).code === "23505") {
        const retry = await supabase.from("customers").select("id, profile_id").eq("phone", phone).single();
        if (retry.error) throw retry.error;
        customerId = retry.data.id;
        profileId = retry.data.profile_id;
      } else {
        throw inserted.error;
      }
    } else {
      customerId = inserted.data.id;
      profileId = inserted.data.profile_id;
    }
  }

  if (profileId) {
    // 理論上不該發生（有 profile_id 代表已經綁過 LINE），這裡是防禦性補寫，不覆蓋既有資料以外的欄位。
    const { error } = await supabase.from("profiles").update({ line_user_id: lineUserId }).eq("id", profileId);
    if (error) throw error;
    return { customerId };
  }

  const profileIns = await supabase
    .from("profiles")
    .insert({ role: "customer", line_user_id: lineUserId, phone, display_name: displayName ?? null })
    .select("id")
    .single();
  if (profileIns.error) throw profileIns.error;

  const linkRes = await supabase.from("customers").update({ profile_id: profileIns.data.id }).eq("id", customerId);
  if (linkRes.error) throw linkRes.error;

  return { customerId };
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
