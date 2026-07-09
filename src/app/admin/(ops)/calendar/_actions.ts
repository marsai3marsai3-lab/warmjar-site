"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminForAction, requireOwnerForAction } from "@/lib/admin/auth";
import { writeAuditLog } from "@/lib/booking/auditLog";
import { broadcastCalendarChange } from "@/lib/admin/realtime";
import { fetchAvailabilityInput } from "@/lib/booking/availabilityData";
import { calculateAvailability, type TimeString } from "@/lib/booking/availability";
import { splitServiceSlots } from "@/lib/booking/splitServiceSlots";
import { isExclusionConflictError } from "@/lib/booking/createAppointment";
import { BOOKING_BUFFER_MINUTES } from "@/lib/booking/constants";
import {
  buildAppointmentUpdate,
  canRescheduleAppointment,
  isAppointmentActionAllowed,
  type AppointmentAdminAction,
} from "@/lib/admin/appointmentActions";
import { canForfeitDeposit, canMarkDepositRefunded } from "@/lib/admin/depositActions";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Phase 4 §5.2 決策：訂金沒收掛在 no_show 確認框上，不是自動的，
 * `forfeitDeposit` 由呼叫端的勾選框決定（預設勾選、可取消，保留人情
 * 彈性）。只有 action==='no_show' 時這個參數才有意義，其餘動作忽略。
 */
export async function performAppointmentAction(
  appointmentId: string,
  action: AppointmentAdminAction,
  options?: { forfeitDeposit?: boolean }
): Promise<ActionResult> {
  try {
    const { profile } = await requireAdminForAction();
    const supabase = createAdminClient();

    const current = await supabase
      .from("appointments")
      .select("id, status, checked_in_at, appointment_date, customer_id")
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

    if (action === "no_show" && options?.forfeitDeposit) {
      const depositRes = await supabase
        .from("deposit_records")
        .select("id, status, amount")
        .contains("covered_appointment_ids", [appointmentId])
        .maybeSingle();

      if (!depositRes.error && depositRes.data && canForfeitDeposit(depositRes.data.status)) {
        await supabase.from("deposit_records").update({ status: "forfeited" }).eq("id", depositRes.data.id);

        await supabase.from("revenue_records").insert({
          revenue_type: "forfeited_deposit",
          amount: depositRes.data.amount,
          source_table: "deposit_records",
          source_id: depositRes.data.id,
          customer_id: current.data.customer_id,
          recorded_by: profile.id,
          note: "客人爽約，標記報到時同時確認沒收訂金",
        });

        await writeAuditLog(supabase, {
          actorId: profile.id,
          action: "admin.deposit.forfeit",
          targetTable: "deposit_records",
          targetId: depositRes.data.id,
          before: { status: depositRes.data.status },
          after: { status: "forfeited", amount: depositRes.data.amount },
        });
      }
    }

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

type RescheduleResult = { ok: true } | { ok: false; error: string; code?: "SLOT_ALREADY_BOOKED" };

/**
 * Phase 3-3 C.1。跟 create-appointment 送出前的重新驗證同一套邏輯（走
 * fetchAvailabilityInput + calculateAvailability 防撞單），差別是這裡
 * 修改的是既有的一筆 appointments row，不是 INSERT 一筆新的——用
 * excludeAppointmentId 把它自己從衝突檢查的候選集合裡拿掉（見
 * availabilityData.ts 的說明），並且 UPDATE 本身仍然受 EXCLUDE 約束
 * 保護，兩層防線疊在一起。
 */
export async function rescheduleAppointment(
  appointmentId: string,
  input: { date: string; startTime: string; staffId?: string }
): Promise<RescheduleResult> {
  try {
    const { profile } = await requireAdminForAction();
    const supabase = createAdminClient();

    const current = await supabase
      .from("appointments")
      .select("id, status, checked_in_at, appointment_date, start_time, end_time, staff_id, service_variant_id")
      .eq("id", appointmentId)
      .single();
    if (current.error || !current.data) {
      return { ok: false, error: "找不到這筆預約" };
    }

    if (!canRescheduleAppointment(current.data.status, !!current.data.checked_in_at)) {
      return { ok: false, error: "這個狀態不能改期" };
    }

    const variantRes = await supabase
      .from("service_variants")
      .select("duration_minutes")
      .eq("id", current.data.service_variant_id)
      .single();
    if (variantRes.error || !variantRes.data) {
      return { ok: false, error: "服務項目資料錯誤" };
    }

    const availabilityResult = await fetchAvailabilityInput(supabase, {
      serviceVariantIds: [current.data.service_variant_id],
      staffId: input.staffId,
      dateRange: { startDate: input.date, endDate: input.date },
      bufferMinutes: BOOKING_BUFFER_MINUTES,
      excludeAppointmentId: appointmentId,
    });
    if (!availabilityResult.ok) {
      return { ok: false, error: availabilityResult.error };
    }

    const freshSlots = calculateAvailability(availabilityResult.input);
    const matchingSlot = freshSlots.find((s) => s.date === input.date && s.startTime === input.startTime);
    if (!matchingSlot) {
      return { ok: false, error: "此時段沒有空檔，請重新選擇", code: "SLOT_ALREADY_BOOKED" };
    }

    const resolvedStaffId = input.staffId ?? matchingSlot.availableStaffIds[0];
    if (!resolvedStaffId) {
      return { ok: false, error: "此時段沒有空檔，請重新選擇", code: "SLOT_ALREADY_BOOKED" };
    }

    const [{ endTime }] = splitServiceSlots(
      [{ serviceVariantId: current.data.service_variant_id, durationMinutes: variantRes.data.duration_minutes }],
      input.startTime as TimeString
    );

    const before = {
      date: current.data.appointment_date,
      startTime: current.data.start_time,
      endTime: current.data.end_time,
      staffId: current.data.staff_id,
    };
    const after = { date: input.date, startTime: input.startTime, endTime, staffId: resolvedStaffId };

    const { error: updateError } = await supabase
      .from("appointments")
      .update({
        appointment_date: after.date,
        start_time: after.startTime,
        end_time: after.endTime,
        staff_id: after.staffId,
      })
      .eq("id", appointmentId);

    if (updateError) {
      if (isExclusionConflictError(updateError)) {
        return { ok: false, error: "此時段剛被預約，請重新選擇", code: "SLOT_ALREADY_BOOKED" };
      }
      return { ok: false, error: "更新失敗，請稍後再試" };
    }

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.appointment.reschedule",
      targetTable: "appointments",
      targetId: appointmentId,
      before,
      after,
    });

    await broadcastCalendarChange({ appointmentId, date: before.date });
    await broadcastCalendarChange({ appointmentId, date: after.date });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

/**
 * Phase 3-3 C.2。owner 限定，不呼叫 ECPay 退款 API——只更新
 * deposit_records 狀態＋寫稽核。實際退款目前是人工作業（見
 * docs/phase-3-3-members-draft.md C.2），呼叫端的 UI 文案要把這件事
 * 講清楚，不能讓店員以為按了這顆按鈕客人就自動收到退款。
 */
export async function markDepositRefunded(depositId: string, note?: string): Promise<ActionResult> {
  try {
    const { profile } = await requireOwnerForAction();
    const supabase = createAdminClient();

    const deposit = await supabase
      .from("deposit_records")
      .select("id, status, covered_appointment_ids")
      .eq("id", depositId)
      .single();
    if (deposit.error || !deposit.data) {
      return { ok: false, error: "找不到這筆訂金紀錄" };
    }
    if (!canMarkDepositRefunded(deposit.data.status)) {
      return { ok: false, error: "只有已付款的訂金才能標記退款" };
    }

    const { error: updateError } = await supabase
      .from("deposit_records")
      .update({ status: "refunded", refunded_at: new Date().toISOString(), note: note ?? null })
      .eq("id", depositId);
    if (updateError) {
      return { ok: false, error: "更新失敗，請稍後再試" };
    }

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.deposit.mark_refunded",
      targetTable: "deposit_records",
      targetId: depositId,
      before: { status: deposit.data.status },
      after: { status: "refunded", note: note ?? null },
    });

    const anchor = deposit.data.covered_appointment_ids[0];
    if (anchor) {
      const appt = await supabase
        .from("appointments")
        .select("appointment_date")
        .eq("id", anchor)
        .maybeSingle();
      if (appt.data) {
        await broadcastCalendarChange({ appointmentId: anchor, date: appt.data.appointment_date });
      }
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}
