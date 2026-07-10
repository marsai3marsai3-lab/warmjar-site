import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { evaluateDepositPolicy } from "@/lib/booking/depositPolicy";
import { fetchCustomerDepositHistory } from "@/lib/booking/depositHistory";

export type TagOption = { id: string; name: string; color: string | null };

export type MemberListFilters = {
  search?: string;
  tagIds?: string[];
  blacklistedOnly?: boolean;
  birthdayThisMonth?: boolean;
  requiresDepositOnly?: boolean;
  hasNoShowHistory?: boolean;
  hasStoredValueBalance?: boolean;
};

export type MemberListRow = {
  id: string;
  name: string;
  phone: string | null;
  tags: TagOption[];
  lastVisitAt: string | null;
  // Phase 4 接上真值：Σ 已完成結帳單的 total_paid_amount（作廢的單不算）。
  totalSpend: number;
  noShowCount: number;
  lineBound: boolean;
};

const LIST_LIMIT = 200;
const PHONE_SEARCH_MIN_LENGTH = 4;
const NAME_SEARCH_MIN_LENGTH = 2;

/** 沿用 CustomerSearchField 的門檻規則：純數字≥4碼當電話前綴，否則≥2字當姓名子字串。 */
export function classifySearch(search: string): { field: "phone" | "name"; value: string } | null {
  const trimmed = search.trim();
  if (/^\d+$/.test(trimmed)) {
    return trimmed.length >= PHONE_SEARCH_MIN_LENGTH ? { field: "phone", value: trimmed } : null;
  }
  return trimmed.length >= NAME_SEARCH_MIN_LENGTH ? { field: "name", value: trimmed } : null;
}

export function isBirthdayInMonth(birthday: string | null, month: number): boolean {
  if (!birthday) return false;
  return Number(birthday.slice(5, 7)) === month;
}

/**
 * last_visit_at 是結帳流程（Phase 4）才會寫入的欄位，現在永遠是 NULL。
 * 在那之前用「最近一筆 completed 預約日期」當替代值——語意不完全一樣
 * （少了「有結帳但沒消費」這種邊界情況），但比顯示空白更有參考價值。
 * Phase 4 一旦開始有真實寫入，這裡優先採用真實值。
 */
export function resolveLastVisit(
  cachedLastVisitAt: string | null,
  fallbackLastCompletedDate: string | null
): string | null {
  return cachedLastVisitAt ?? fallbackLastCompletedDate;
}

export async function fetchMemberTagOptions(supabase: SupabaseClient<Database>): Promise<TagOption[]> {
  const { data, error } = await supabase.from("tags").select("id, name, color").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchMemberList(
  supabase: SupabaseClient<Database>,
  filters: MemberListFilters,
  todayISO: string
): Promise<MemberListRow[]> {
  let query = supabase
    .from("customers")
    .select("id, name, phone, status, birthday, last_visit_at, profile_id, profiles ( line_user_id )")
    .limit(LIST_LIMIT);

  const parsedSearch = filters.search ? classifySearch(filters.search) : null;
  if (parsedSearch?.field === "phone") {
    query = query.like("phone", `${parsedSearch.value}%`);
  } else if (parsedSearch?.field === "name") {
    query = query.ilike("name", `%${parsedSearch.value}%`);
  }

  if (filters.blacklistedOnly) {
    query = query.eq("status", "blacklisted");
  }

  if (filters.tagIds && filters.tagIds.length > 0) {
    const tagged = await supabase.from("customer_tags").select("customer_id").in("tag_id", filters.tagIds);
    if (tagged.error) throw tagged.error;
    const taggedIds = [...new Set((tagged.data ?? []).map((r) => r.customer_id))];
    if (taggedIds.length === 0) return [];
    query = query.in("id", taggedIds);
  }

  const customersRes = await query.order("name");
  if (customersRes.error) throw customersRes.error;
  let candidates = customersRes.data ?? [];

  if (filters.birthdayThisMonth) {
    const thisMonth = Number(todayISO.slice(5, 7));
    candidates = candidates.filter((c) => isBirthdayInMonth(c.birthday, thisMonth));
  }

  if (candidates.length === 0) return [];
  const candidateIds = candidates.map((c) => c.id);

  const [tagsRes, noShowRes, completedRes, checkoutsRes] = await Promise.all([
    supabase.from("customer_tags").select("customer_id, tags ( id, name, color )").in("customer_id", candidateIds),
    supabase.from("appointments").select("customer_id").eq("status", "no_show").in("customer_id", candidateIds),
    supabase
      .from("appointments")
      .select("customer_id, appointment_date")
      .eq("status", "completed")
      .in("customer_id", candidateIds)
      .order("appointment_date", { ascending: false }),
    supabase
      .from("checkouts")
      .select("customer_id, total_paid_amount")
      .eq("status", "completed")
      .in("customer_id", candidateIds),
  ]);
  if (tagsRes.error) throw tagsRes.error;
  if (noShowRes.error) throw noShowRes.error;
  if (completedRes.error) throw completedRes.error;
  if (checkoutsRes.error) throw checkoutsRes.error;

  if (filters.hasStoredValueBalance) {
    const balancesRes = await supabase
      .from("stored_value_accounts")
      .select("customer_id")
      .in("customer_id", candidateIds)
      .or("principal_balance.gt.0,bonus_balance.gt.0");
    if (balancesRes.error) throw balancesRes.error;
    const hasBalanceIds = new Set((balancesRes.data ?? []).map((r) => r.customer_id));
    candidates = candidates.filter((c) => hasBalanceIds.has(c.id));
  }

  const totalSpendByCustomer = new Map<string, number>();
  for (const row of checkoutsRes.data ?? []) {
    totalSpendByCustomer.set(row.customer_id, (totalSpendByCustomer.get(row.customer_id) ?? 0) + row.total_paid_amount);
  }

  const tagsByCustomer = new Map<string, TagOption[]>();
  for (const row of tagsRes.data ?? []) {
    if (!row.tags) continue;
    const list = tagsByCustomer.get(row.customer_id) ?? [];
    list.push(row.tags);
    tagsByCustomer.set(row.customer_id, list);
  }

  const noShowCountByCustomer = new Map<string, number>();
  for (const row of noShowRes.data ?? []) {
    noShowCountByCustomer.set(row.customer_id, (noShowCountByCustomer.get(row.customer_id) ?? 0) + 1);
  }

  const lastCompletedByCustomer = new Map<string, string>();
  for (const row of completedRes.data ?? []) {
    if (!lastCompletedByCustomer.has(row.customer_id)) {
      lastCompletedByCustomer.set(row.customer_id, row.appointment_date);
    }
  }

  if (filters.hasNoShowHistory) {
    candidates = candidates.filter((c) => (noShowCountByCustomer.get(c.id) ?? 0) > 0);
  }

  if (filters.requiresDepositOnly) {
    // 候選集合已經被前面的篩選限縮到 <= LIST_LIMIT，逐一查歷史是有界的，
    // 不是對全部會員做 N+1——重用既有、已測試過的 evaluateDepositPolicy，
    // 不重造一套判斷邏輯。
    const flags = await Promise.all(
      candidates.map(async (c) => {
        const history = await fetchCustomerDepositHistory(supabase, c.id);
        return evaluateDepositPolicy({ customerHistory: history, totalFaceValue: 0 }).requiresDeposit;
      })
    );
    candidates = candidates.filter((_, i) => flags[i]);
  }

  return candidates.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    tags: tagsByCustomer.get(c.id) ?? [],
    lastVisitAt: resolveLastVisit(c.last_visit_at, lastCompletedByCustomer.get(c.id) ?? null),
    totalSpend: totalSpendByCustomer.get(c.id) ?? 0,
    noShowCount: noShowCountByCustomer.get(c.id) ?? 0,
    lineBound: !!c.profiles?.line_user_id,
  }));
}
