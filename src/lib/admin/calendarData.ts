import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type CalendarAppointment = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  checkedInAt: string | null;
  expiresAt: string | null;
  staffId: string | null;
  staffName: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerNote: string | null;
  serviceName: string;
  faceValue: number;
  deposit: {
    id: string;
    status: string;
    amount: number;
    merchantTradeNo: string;
    ecpayTradeNo: string | null;
  } | null;
};

export type StaffOption = { id: string; name: string };

export async function fetchStaffOptions(supabase: SupabaseClient<Database>): Promise<StaffOption[]> {
  const { data, error } = await supabase
    .from("staff")
    .select("id, name")
    .eq("status", "active")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchCalendarAppointments(
  supabase: SupabaseClient<Database>,
  range: { startDate: string; endDate: string }
): Promise<CalendarAppointment[]> {
  const apptRes = await supabase
    .from("appointments")
    .select(
      `id, appointment_date, start_time, end_time, status, checked_in_at, expires_at,
       customer_note, staff_id, customer_id,
       customers ( name, phone ),
       service_variants ( name, face_value_price ),
       staff ( name )`
    )
    .gte("appointment_date", range.startDate)
    .lte("appointment_date", range.endDate)
    .order("start_time");
  if (apptRes.error) throw apptRes.error;

  const appointments = apptRes.data ?? [];
  const appointmentIds = appointments.map((a) => a.id);

  const depositRes =
    appointmentIds.length > 0
      ? await supabase
          .from("deposit_records")
          .select("id, status, amount, merchant_trade_no, ecpay_trade_no, covered_appointment_ids")
          .overlaps("covered_appointment_ids", appointmentIds)
      : { data: [], error: null };
  if (depositRes.error) throw depositRes.error;

  const depositByAppointmentId = new Map<string, CalendarAppointment["deposit"]>();
  for (const record of depositRes.data ?? []) {
    for (const id of record.covered_appointment_ids) {
      depositByAppointmentId.set(id, {
        id: record.id,
        status: record.status,
        amount: record.amount,
        merchantTradeNo: record.merchant_trade_no,
        ecpayTradeNo: record.ecpay_trade_no,
      });
    }
  }

  return appointments.map((a) => ({
    id: a.id,
    date: a.appointment_date,
    startTime: a.start_time.slice(0, 5),
    endTime: a.end_time.slice(0, 5),
    status: a.status,
    checkedInAt: a.checked_in_at,
    expiresAt: a.expires_at,
    staffId: a.staff_id,
    staffName: a.staff?.name ?? "未指定",
    customerId: a.customer_id,
    customerName: a.customers?.name ?? "",
    customerPhone: a.customers?.phone ?? null,
    customerNote: a.customer_note,
    serviceName: a.service_variants?.name ?? "",
    faceValue: a.service_variants?.face_value_price ?? 0,
    deposit: depositByAppointmentId.get(a.id) ?? null,
  }));
}
