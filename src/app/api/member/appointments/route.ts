import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberSession } from "@/lib/member/session";
import { resolveCancelButtonState } from "@/lib/booking/customerCancelPolicy";
import { buildDepositPaymentUrl } from "@/lib/line/liffLinks";

export async function GET() {
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ error: "請重新登入" }, { status: 401 });

  const supabase = createAdminClient();
  const appointmentsRes = await supabase
    .from("appointments")
    .select(
      `id, appointment_date, start_time, end_time, status, start_at,
       service_variants ( name ), staff ( name )`
    )
    .eq("customer_id", session.customerId)
    .order("appointment_date", { ascending: false })
    .order("start_time", { ascending: false })
    .returns<
      Array<{
        id: string;
        appointment_date: string;
        start_time: string;
        end_time: string;
        status: string;
        start_at: string | null;
        service_variants: { name: string } | null;
        staff: { name: string } | null;
      }>
    >();
  if (appointmentsRes.error) {
    return NextResponse.json({ error: "查詢失敗，請稍後再試" }, { status: 500 });
  }

  const appointments = appointmentsRes.data ?? [];
  const pendingIds = appointments.filter((a) => a.status === "pending_deposit").map((a) => a.id);

  const depositsRes =
    pendingIds.length > 0
      ? await supabase
          .from("deposit_records")
          .select("amount, merchant_trade_no, covered_appointment_ids, status")
          .overlaps("covered_appointment_ids", pendingIds)
          .eq("status", "pending")
      : { data: [], error: null };

  const now = new Date();

  const result = appointments.map((a) => {
    const deposit = (depositsRes.data ?? []).find((d) => d.covered_appointment_ids.includes(a.id));
    const startAt = new Date(a.start_at ?? `${a.appointment_date}T${a.start_time}+08:00`);
    return {
      id: a.id,
      date: a.appointment_date,
      startTime: a.start_time.slice(0, 5),
      endTime: a.end_time.slice(0, 5),
      status: a.status,
      serviceName: a.service_variants?.name ?? "",
      staffName: a.staff?.name ?? "未指定",
      cancelButtonState: resolveCancelButtonState(a.status, startAt, now),
      deposit: deposit ? { amount: deposit.amount, paymentUrl: buildDepositPaymentUrl(deposit.merchant_trade_no) } : null,
    };
  });

  return NextResponse.json({ appointments: result });
}
