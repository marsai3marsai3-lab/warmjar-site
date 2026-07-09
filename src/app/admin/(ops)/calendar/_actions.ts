"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminForAction } from "@/lib/admin/auth";
import { writeAuditLog } from "@/lib/booking/auditLog";
import { broadcastCalendarChange } from "@/lib/admin/realtime";
import {
  buildAppointmentUpdate,
  isAppointmentActionAllowed,
  type AppointmentAdminAction,
} from "@/lib/admin/appointmentActions";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function performAppointmentAction(
  appointmentId: string,
  action: AppointmentAdminAction
): Promise<ActionResult> {
  try {
    const { profile } = await requireAdminForAction();
    const supabase = createAdminClient();

    const current = await supabase
      .from("appointments")
      .select("id, status, checked_in_at, appointment_date")
      .eq("id", appointmentId)
      .single();
    if (current.error || !current.data) {
      return { ok: false, error: "找不到這筆預約" };
    }

    if (!isAppointmentActionAllowed(current.data.status, !!current.data.checked_in_at, action)) {
      return { ok: false, error: "這個狀態不能執行這個操作" };
    }

    const update = buildAppointmentUpdate(action);
    const { error } = await supabase.from("appointments").update(update).eq("id", appointmentId);
    if (error) {
      return { ok: false, error: "更新失敗，請稍後再試" };
    }

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: `admin.appointment.${action}`,
      targetTable: "appointments",
      targetId: appointmentId,
      before: current.data,
      after: update,
    });

    await broadcastCalendarChange({ appointmentId, date: current.data.appointment_date });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

export async function waiveAppointmentDeposit(
  appointmentId: string,
  reason?: string
): Promise<ActionResult> {
  try {
    const { profile } = await requireAdminForAction();
    const supabase = createAdminClient();

    const appt = await supabase
      .from("appointments")
      .select("id, appointment_date")
      .eq("id", appointmentId)
      .single();
    if (appt.error || !appt.data) {
      return { ok: false, error: "找不到這筆預約" };
    }

    const deposit = await supabase
      .from("deposit_records")
      .select("id, status, covered_appointment_ids")
      .contains("covered_appointment_ids", [appointmentId])
      .maybeSingle();
    if (deposit.error || !deposit.data) {
      return { ok: false, error: "找不到這筆訂金紀錄" };
    }
    if (deposit.data.status !== "pending") {
      return { ok: false, error: "這筆訂金已經不是待付款狀態，無法免收" };
    }

    const { error: depositError } = await supabase
      .from("deposit_records")
      .update({
        status: "waived",
        waived_by: profile.id,
        waived_by_at: new Date().toISOString(),
        note: reason ?? null,
      })
      .eq("id", deposit.data.id);
    if (depositError) {
      return { ok: false, error: "更新失敗，請稍後再試" };
    }

    const { error: apptError } = await supabase
      .from("appointments")
      .update({ status: "confirmed", expires_at: null })
      .in("id", deposit.data.covered_appointment_ids);
    if (apptError) {
      return { ok: false, error: "訂金已免收，但預約狀態更新失敗，請手動確認" };
    }

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.deposit.waive",
      targetTable: "deposit_records",
      targetId: deposit.data.id,
      before: { status: deposit.data.status },
      after: { status: "waived", reason: reason ?? null, coveredAppointmentIds: deposit.data.covered_appointment_ids },
    });

    await broadcastCalendarChange({ appointmentId, date: appt.data.appointment_date });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}
