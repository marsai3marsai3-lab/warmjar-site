import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberSession } from "@/lib/member/session";
import { canCustomerCancelAppointment } from "@/lib/booking/customerCancelPolicy";
import { writeAuditLog } from "@/lib/booking/auditLog";
import { broadcastCalendarChange } from "@/lib/admin/realtime";

type Params = Promise<{ id: string }>;

export async function POST(_request: Request, { params }: { params: Params }) {
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ error: "請重新登入" }, { status: 401 });

  const { id: appointmentId } = await params;
  const supabase = createAdminClient();

  const current = await supabase
    .from("appointments")
    .select("id, customer_id, status, start_at, appointment_date")
    .eq("id", appointmentId)
    .maybeSingle();
  if (current.error || !current.data) {
    return NextResponse.json({ error: "找不到這筆預約" }, { status: 404 });
  }

  // 只能取消自己的預約——customerId 一律從 member_session 解出，不接受
  // URL 之外任何客戶端自稱的身分（Phase 6 D.2）。
  if (current.data.customer_id !== session.customerId) {
    return NextResponse.json({ error: "無法操作這筆預約" }, { status: 403 });
  }

  const startAt = new Date(current.data.start_at ?? current.data.appointment_date);
  if (!canCustomerCancelAppointment(current.data.status, startAt)) {
    return NextResponse.json({ error: "這筆預約目前無法自助取消，請來電 0979-050-630" }, { status: 400 });
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: "customer_cancelled" })
    .eq("id", appointmentId);
  if (error) {
    return NextResponse.json({ error: "取消失敗，請稍後再試" }, { status: 500 });
  }

  const customerRes = await supabase.from("customers").select("profile_id").eq("id", session.customerId).maybeSingle();

  await writeAuditLog(supabase, {
    actorId: customerRes.data?.profile_id ?? null,
    action: "member.appointment.cancel",
    targetTable: "appointments",
    targetId: appointmentId,
    before: { status: current.data.status },
    after: { status: "cancelled", cancel_reason: "customer_cancelled" },
  });

  await broadcastCalendarChange({ appointmentId, date: current.data.appointment_date });

  return NextResponse.json({ ok: true });
}
