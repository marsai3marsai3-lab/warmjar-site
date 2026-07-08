import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { DepositHistoryEntry } from "./depositPolicy";

const SETTLED_STATUSES = ["completed", "cancelled", "no_show"] as const;

// 有意義的結算事件不會無限累積（顧客不會有幾千筆已結案預約），這裡抓最近
// 200 筆已足夠找到「最近一次結算事件」，同時避免對長年老客戶查出整段歷史。
const HISTORY_LIMIT = 200;

export async function fetchCustomerDepositHistory(
  supabase: SupabaseClient<Database>,
  customerId: string
): Promise<DepositHistoryEntry[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("status, start_at, cancelled_at")
    .eq("customer_id", customerId)
    .in("status", SETTLED_STATUSES)
    .order("start_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.start_at !== null)
    .map((row) => ({
      status: row.status,
      startAt: row.start_at as string,
      cancelledAt: row.cancelled_at,
    }));
}
