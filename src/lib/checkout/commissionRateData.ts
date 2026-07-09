import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { resolveCommissionRate, type ResolvedCommissionRate } from "./commissionRate";

export type ServiceCommissionRow = { id: string; name: string; defaultCommissionRate: number };
export type StaffCommissionRow = { id: string; name: string; defaultCommissionRate: number };
export type StaffServiceOverrideRow = {
  staffId: string;
  serviceId: string;
  serviceName: string;
  commissionRateOverride: number | null;
};

export async function fetchServiceCommissionDefaults(
  supabase: SupabaseClient<Database>
): Promise<ServiceCommissionRow[]> {
  const { data, error } = await supabase
    .from("services")
    .select("id, name, default_commission_rate")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((s) => ({ id: s.id, name: s.name, defaultCommissionRate: s.default_commission_rate }));
}

export async function fetchStaffCommissionDefaults(
  supabase: SupabaseClient<Database>
): Promise<StaffCommissionRow[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("id, name, default_commission_rate")
    .eq("status", "active")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((s) => ({ id: s.id, name: s.name, defaultCommissionRate: s.default_commission_rate }));
}

/** 一位師傅對每個現行服務項目的覆蓋設定（沒設定的服務 commissionRateOverride 為 null）。 */
export async function fetchStaffServiceOverrides(
  supabase: SupabaseClient<Database>,
  staffId: string
): Promise<StaffServiceOverrideRow[]> {
  const [servicesRes, overridesRes] = await Promise.all([
    supabase.from("services").select("id, name").eq("is_active", true).order("sort_order"),
    supabase.from("staff_service_skills").select("service_id, commission_rate_override").eq("staff_id", staffId),
  ]);
  if (servicesRes.error) throw servicesRes.error;
  if (overridesRes.error) throw overridesRes.error;

  const overrideByService = new Map(
    (overridesRes.data ?? []).map((o) => [o.service_id, o.commission_rate_override])
  );

  return (servicesRes.data ?? []).map((s) => ({
    staffId,
    serviceId: s.id,
    serviceName: s.name,
    commissionRateOverride: overrideByService.get(s.id) ?? null,
  }));
}

/**
 * 結帳時批次解析多個 (staffId, serviceId) 組合的有效抽成率——一次查完
 * 三張表，不對每個項目各打一輪查詢。key 格式 `${staffId}:${serviceId}`。
 */
export async function fetchEffectiveCommissionRates(
  supabase: SupabaseClient<Database>,
  pairs: { staffId: string; serviceId: string }[]
): Promise<Map<string, ResolvedCommissionRate>> {
  const result = new Map<string, ResolvedCommissionRate>();
  if (pairs.length === 0) return result;

  const staffIds = [...new Set(pairs.map((p) => p.staffId))];
  const serviceIds = [...new Set(pairs.map((p) => p.serviceId))];

  const [staffRes, serviceRes, overrideRes] = await Promise.all([
    supabase.from("staff").select("id, default_commission_rate").in("id", staffIds),
    supabase.from("services").select("id, default_commission_rate").in("id", serviceIds),
    supabase
      .from("staff_service_skills")
      .select("staff_id, service_id, commission_rate_override")
      .in("staff_id", staffIds)
      .in("service_id", serviceIds),
  ]);
  if (staffRes.error) throw staffRes.error;
  if (serviceRes.error) throw serviceRes.error;
  if (overrideRes.error) throw overrideRes.error;

  const staffDefault = new Map((staffRes.data ?? []).map((s) => [s.id, s.default_commission_rate]));
  const serviceDefault = new Map((serviceRes.data ?? []).map((s) => [s.id, s.default_commission_rate]));
  const overrideMap = new Map(
    (overrideRes.data ?? []).map((o) => [`${o.staff_id}:${o.service_id}`, o.commission_rate_override])
  );

  for (const { staffId, serviceId } of pairs) {
    const key = `${staffId}:${serviceId}`;
    result.set(
      key,
      resolveCommissionRate({
        staffServiceOverride: overrideMap.get(key),
        serviceDefaultRate: serviceDefault.get(serviceId),
        staffDefaultRate: staffDefault.get(staffId) ?? 0,
      })
    );
  }
  return result;
}
