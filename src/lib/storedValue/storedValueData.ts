import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type StoredValuePlan = {
  id: string;
  tier: string;
  name: string;
  principalAmount: number;
  bonusAmount: number;
  isActive: boolean;
};

export type StoredValueAccount = {
  customerId: string;
  principalBalance: number;
  bonusBalance: number;
};

export type StoredValueTransaction = {
  id: string;
  type: string;
  principalDelta: number;
  bonusDelta: number;
  planName: string | null;
  soldByName: string | null;
  relatedCheckoutId: string | null;
  relatedTopupOrderId: string | null;
  note: string | null;
  createdAt: string;
};

export async function fetchStoredValuePlans(
  supabase: SupabaseClient<Database>,
  activeOnly = false
): Promise<StoredValuePlan[]> {
  let query = supabase
    .from("stored_value_plans")
    .select("id, tier, name, principal_amount, bonus_amount, is_active")
    .order("sort_order");
  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    tier: p.tier,
    name: p.name,
    principalAmount: p.principal_amount,
    bonusAmount: p.bonus_amount,
    isActive: p.is_active,
  }));
}

export async function fetchStoredValueAccount(
  supabase: SupabaseClient<Database>,
  customerId: string
): Promise<StoredValueAccount> {
  const { data, error } = await supabase
    .from("stored_value_accounts")
    .select("customer_id, principal_balance, bonus_balance")
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { customerId, principalBalance: 0, bonusBalance: 0 };
  return { customerId: data.customer_id, principalBalance: data.principal_balance, bonusBalance: data.bonus_balance };
}

/** 批次查詢，供會員列表「有儲值餘額」篩選用，避免逐一查詢。 */
export async function fetchStoredValueBalances(
  supabase: SupabaseClient<Database>,
  customerIds: string[]
): Promise<Map<string, StoredValueAccount>> {
  const result = new Map<string, StoredValueAccount>();
  if (customerIds.length === 0) return result;

  const { data, error } = await supabase
    .from("stored_value_accounts")
    .select("customer_id, principal_balance, bonus_balance")
    .in("customer_id", customerIds);
  if (error) throw error;

  for (const row of data ?? []) {
    result.set(row.customer_id, {
      customerId: row.customer_id,
      principalBalance: row.principal_balance,
      bonusBalance: row.bonus_balance,
    });
  }
  return result;
}

export async function fetchStoredValueTransactions(
  supabase: SupabaseClient<Database>,
  customerId: string
): Promise<StoredValueTransaction[]> {
  const { data, error } = await supabase
    .from("stored_value_transactions")
    .select(
      `id, type, principal_delta, bonus_delta, related_checkout_id, related_topup_order_id, note, created_at,
       stored_value_plans ( name ), staff ( name )`
    )
    .eq("account_customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((t) => ({
    id: t.id,
    type: t.type,
    principalDelta: t.principal_delta,
    bonusDelta: t.bonus_delta,
    planName: t.stored_value_plans?.name ?? null,
    soldByName: t.staff?.name ?? null,
    relatedCheckoutId: t.related_checkout_id,
    relatedTopupOrderId: t.related_topup_order_id,
    note: t.note,
    createdAt: t.created_at,
  }));
}

/**
 * 增減一位客人的儲值餘額，帳戶不存在就先建立——topup/consume/refund/
 * void_reversal 四種異動共用同一個底層寫入邏輯，各自呼叫端只需要決定
 * `principalDelta`/`bonusDelta` 要傳正還是負。
 */
export async function adjustStoredValueBalance(
  supabase: SupabaseClient<Database>,
  customerId: string,
  principalDelta: number,
  bonusDelta: number
): Promise<void> {
  const existing = await supabase
    .from("stored_value_accounts")
    .select("principal_balance, bonus_balance")
    .eq("customer_id", customerId)
    .maybeSingle();
  if (existing.error) throw existing.error;

  if (existing.data) {
    const { error } = await supabase
      .from("stored_value_accounts")
      .update({
        principal_balance: existing.data.principal_balance + principalDelta,
        bonus_balance: existing.data.bonus_balance + bonusDelta,
      })
      .eq("customer_id", customerId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("stored_value_accounts").insert({
      customer_id: customerId,
      principal_balance: principalDelta,
      bonus_balance: bonusDelta,
    });
    if (error) throw error;
  }
}

/**
 * 儲值購買「上帳」的共用函式——櫃檯付現/刷卡（B.1）跟未來的 ECPay
 * webhook（B.2）都呼叫這個，不要各自實作一份。呼叫前提：
 * `stored_value_topup_orders` 那筆訂單已經存在且金額已經確定
 * （櫃檯流程當下建立；線上流程等 webhook 確認付款成功後才呼叫）。
 */
export async function applyStoredValueTopup(
  supabase: SupabaseClient<Database>,
  topupOrderId: string,
  operatorId: string | null
): Promise<void> {
  const orderRes = await supabase
    .from("stored_value_topup_orders")
    .select("customer_id, principal_amount, bonus_amount, plan_id, sold_by")
    .eq("id", topupOrderId)
    .single();
  if (orderRes.error || !orderRes.data) throw orderRes.error ?? new Error("找不到儲值訂單");
  const order = orderRes.data;

  // 流水帳先寫、餘額快取後更新（原因見 checkout/_actions.ts 的
  // 相同註解）。
  const { error: txError } = await supabase.from("stored_value_transactions").insert({
    account_customer_id: order.customer_id,
    type: "topup",
    principal_delta: order.principal_amount,
    bonus_delta: order.bonus_amount,
    related_topup_order_id: topupOrderId,
    plan_id: order.plan_id,
    sold_by: order.sold_by,
    operator_id: operatorId,
  });
  if (txError) throw txError;

  await adjustStoredValueBalance(supabase, order.customer_id, order.principal_amount, order.bonus_amount);
}
