import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { taipeiDayRangeUTC } from "@/lib/admin/dateUtils";
import { canBringIntoCheckout } from "./checkoutState";

export type CheckoutCandidateAppointment = {
  id: string;
  date: string;
  startTime: string;
  serviceVariantId: string;
  serviceId: string;
  serviceName: string;
  faceValue: number;
  staffId: string | null;
  staffName: string;
};

export type CheckoutEntryAppointment = {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  appointment: CheckoutCandidateAppointment;
};

const ELIGIBLE_STATUSES = ["completed", "confirmed"] as const;

/** 已經被（非作廢）結帳單收進去的預約，不能再被撈出來重複結帳一次。 */
async function fetchCheckedOutAppointmentIds(
  supabase: SupabaseClient<Database>,
  appointmentIds: string[]
): Promise<Set<string>> {
  if (appointmentIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from("checkout_items")
    .select("appointment_id, checkouts ( status )")
    .in("appointment_id", appointmentIds);
  if (error) throw error;

  return new Set(
    (data ?? [])
      .filter((row) => row.appointment_id && row.checkouts?.status !== "voided")
      .map((row) => row.appointment_id as string)
  );
}

function mapAppointmentRow(a: {
  id: string;
  appointment_date: string;
  start_time: string;
  staff_id: string | null;
  service_variant_id: string;
  service_variants: { name: string; face_value_price: number; service_id: string } | null;
  staff: { name: string } | null;
}): CheckoutCandidateAppointment {
  return {
    id: a.id,
    date: a.appointment_date,
    startTime: a.start_time.slice(0, 5),
    serviceVariantId: a.service_variant_id,
    serviceId: a.service_variants?.service_id ?? "",
    serviceName: a.service_variants?.name ?? "",
    faceValue: a.service_variants?.face_value_price ?? 0,
    staffId: a.staff_id,
    staffName: a.staff?.name ?? "未指定",
  };
}

/**
 * 從行事曆帶入結帳的入口（A.1）：單一預約的完整帶入資料，含客人資訊。
 * 只接受 completed，或 confirmed 且已報到的預約——跟
 * `canBringIntoCheckout` 用同一組規則（見該函式說明）。
 */
export async function fetchAppointmentForCheckout(
  supabase: SupabaseClient<Database>,
  appointmentId: string
): Promise<CheckoutEntryAppointment | null> {
  const { data, error } = await supabase
    .from("appointments")
    .select(
      `id, appointment_date, start_time, staff_id, service_variant_id, customer_id,
       customers ( name, phone ),
       service_variants ( name, face_value_price, service_id ),
       staff ( name )`
    )
    .eq("id", appointmentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    customerId: data.customer_id,
    customerName: data.customers?.name ?? "",
    customerPhone: data.customers?.phone ?? null,
    appointment: mapAppointmentRow(data),
  };
}

/**
 * 同店到訪合併（見 docs/phase-4-checkout-draft.md 1.1）：同一位客人
 * 當天其他 completed／已報到、還沒被結帳過的預約，讓店員勾選要不要
 * 一起結帳。
 */
export async function fetchSameDayCheckoutCandidates(
  supabase: SupabaseClient<Database>,
  customerId: string,
  date: string,
  excludeAppointmentId?: string
): Promise<CheckoutCandidateAppointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(
      `id, appointment_date, start_time, checked_in_at, status, staff_id, service_variant_id,
       service_variants ( name, face_value_price, service_id ),
       staff ( name )`
    )
    .eq("customer_id", customerId)
    .eq("appointment_date", date)
    .in("status", ELIGIBLE_STATUSES);
  if (error) throw error;

  const eligible = (data ?? []).filter(
    (a) => a.id !== excludeAppointmentId && canBringIntoCheckout(a.status, !!a.checked_in_at)
  );

  const checkedOutIds = await fetchCheckedOutAppointmentIds(
    supabase,
    eligible.map((a) => a.id)
  );

  return eligible.filter((a) => !checkedOutIds.has(a.id)).map(mapAppointmentRow);
}

export type AvailableDeposit = { id: string; amount: number };

/** 找這批預約裡有沒有還沒被用掉的已付訂金（見草案 1.4）。 */
export async function fetchAvailableDeposit(
  supabase: SupabaseClient<Database>,
  appointmentIds: string[]
): Promise<AvailableDeposit | null> {
  if (appointmentIds.length === 0) return null;
  const { data, error } = await supabase
    .from("deposit_records")
    .select("id, amount")
    .eq("status", "paid")
    .is("applied_checkout_id", null)
    .overlaps("covered_appointment_ids", appointmentIds)
    .limit(1);
  if (error) throw error;
  return data && data.length > 0 ? { id: data[0].id, amount: data[0].amount } : null;
}

export type CheckoutListRow = {
  id: string;
  checkoutAt: string;
  customerName: string;
  totalPaidAmount: number;
  status: string;
};

export async function fetchCheckoutsForDate(
  supabase: SupabaseClient<Database>,
  dateISO: string
): Promise<CheckoutListRow[]> {
  const { start, end } = taipeiDayRangeUTC(dateISO);
  const { data, error } = await supabase
    .from("checkouts")
    .select("id, checkout_at, total_paid_amount, status, customers ( name )")
    .gte("checkout_at", start)
    .lt("checkout_at", end)
    .order("checkout_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((c) => ({
    id: c.id,
    checkoutAt: c.checkout_at,
    customerName: c.customers?.name ?? "",
    totalPaidAmount: c.total_paid_amount,
    status: c.status,
  }));
}

export type CheckoutDetailItem = {
  id: string;
  serviceVariantId: string | null;
  serviceName: string;
  staffId: string | null;
  staffName: string;
  faceValue: number;
  paidAmount: number;
  quantity: number;
  commissionAmount: number | null;
  commissionRate: number | null;
  commissionVoided: boolean;
};

export type CheckoutDetail = {
  id: string;
  customerId: string;
  customerName: string;
  checkoutAt: string;
  subtotalFaceValue: number;
  discountAmount: number;
  depositApplied: number;
  totalPaidAmount: number;
  status: string;
  voidReason: string | null;
  voidedAt: string | null;
  reopenedFromCheckoutId: string | null;
  items: CheckoutDetailItem[];
  payments: { id: string; method: string; amount: number }[];
};

export async function fetchCheckoutDetail(
  supabase: SupabaseClient<Database>,
  checkoutId: string
): Promise<CheckoutDetail | null> {
  const checkoutRes = await supabase
    .from("checkouts")
    .select(
      `id, customer_id, checkout_at, subtotal_face_value, discount_amount, deposit_applied,
       total_paid_amount, status, void_reason, voided_at, reopened_from_checkout_id,
       customers ( name )`
    )
    .eq("id", checkoutId)
    .maybeSingle();
  if (checkoutRes.error) throw checkoutRes.error;
  if (!checkoutRes.data) return null;

  const [itemsRes, paymentsRes] = await Promise.all([
    supabase
      .from("checkout_items")
      .select(
        `id, face_value, paid_amount, quantity, service_variant_id, staff_id,
         service_variants ( name ), staff ( name ),
         commission_records ( commission_amount, commission_rate, voided )`
      )
      .eq("checkout_id", checkoutId),
    supabase.from("checkout_payments").select("id, method, amount").eq("checkout_id", checkoutId),
  ]);
  if (itemsRes.error) throw itemsRes.error;
  if (paymentsRes.error) throw paymentsRes.error;

  return {
    id: checkoutRes.data.id,
    customerId: checkoutRes.data.customer_id,
    customerName: checkoutRes.data.customers?.name ?? "",
    checkoutAt: checkoutRes.data.checkout_at,
    subtotalFaceValue: checkoutRes.data.subtotal_face_value,
    discountAmount: checkoutRes.data.discount_amount,
    depositApplied: checkoutRes.data.deposit_applied,
    totalPaidAmount: checkoutRes.data.total_paid_amount,
    status: checkoutRes.data.status,
    voidReason: checkoutRes.data.void_reason,
    voidedAt: checkoutRes.data.voided_at,
    reopenedFromCheckoutId: checkoutRes.data.reopened_from_checkout_id,
    items: (itemsRes.data ?? []).map((i) => ({
      id: i.id,
      serviceVariantId: i.service_variant_id,
      serviceName: i.service_variants?.name ?? "",
      staffId: i.staff_id,
      staffName: i.staff?.name ?? "未指定",
      faceValue: i.face_value,
      paidAmount: i.paid_amount,
      quantity: i.quantity,
      commissionAmount: i.commission_records?.commission_amount ?? null,
      commissionRate: i.commission_records?.commission_rate ?? null,
      commissionVoided: i.commission_records?.voided ?? false,
    })),
    payments: (paymentsRes.data ?? []).map((p) => ({ id: p.id, method: p.method, amount: p.amount })),
  };
}
