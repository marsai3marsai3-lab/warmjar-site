"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminForAction } from "@/lib/admin/auth";
import { fetchAvailabilityInput } from "@/lib/booking/availabilityData";
import { calculateAvailability, type TimeString } from "@/lib/booking/availability";
import { splitServiceSlots } from "@/lib/booking/splitServiceSlots";
import { createMultiServiceAppointments } from "@/lib/booking/createAppointment";
import { createSupabaseAppointmentSqlClient } from "@/lib/booking/appointmentSqlClient";
import { createAppointmentRepository } from "@/lib/booking/supabaseAppointmentRepository";
import { findOrCreateCustomer } from "@/lib/booking/customers";
import { writeAuditLog } from "@/lib/booking/auditLog";
import { broadcastCalendarChange } from "@/lib/admin/realtime";
import { BOOKING_BUFFER_MINUTES } from "@/lib/booking/constants";

type ActionResult = { ok: true; appointmentIds: string[] } | { ok: false; error: string };

export async function createManualAppointment(input: {
  serviceVariantIds: string[];
  staffId?: string;
  date: string;
  startTime: string;
  customerName: string;
  customerPhone: string;
  source: "walk_in" | "phone" | "line_oa" | "instagram" | "admin";
  customerNote?: string;
}): Promise<ActionResult> {
  try {
    const { profile } = await requireAdminForAction();
    const supabase = createAdminClient();

    // 跟 /book 送出前的重新驗證同一套邏輯：後台建單一樣要防止跟其他預約撞單。
    const availabilityResult = await fetchAvailabilityInput(supabase, {
      serviceVariantIds: input.serviceVariantIds,
      staffId: input.staffId,
      dateRange: { startDate: input.date, endDate: input.date },
      bufferMinutes: BOOKING_BUFFER_MINUTES,
    });
    if (!availabilityResult.ok) return { ok: false, error: availabilityResult.error };

    const freshSlots = calculateAvailability(availabilityResult.input);
    const matchingSlot = freshSlots.find((s) => s.date === input.date && s.startTime === input.startTime);
    if (!matchingSlot) return { ok: false, error: "此時段沒有空檔，請重新選擇" };

    const resolvedStaffId = input.staffId ?? matchingSlot.availableStaffIds[0];
    if (!resolvedStaffId) return { ok: false, error: "此時段沒有空檔，請重新選擇" };

    const variantsRes = await supabase
      .from("service_variants")
      .select("id, duration_minutes")
      .in("id", input.serviceVariantIds);
    if (variantsRes.error || !variantsRes.data) return { ok: false, error: "服務項目資料錯誤" };

    const durationById = new Map(variantsRes.data.map((v) => [v.id, v.duration_minutes]));
    const orderedDurations = input.serviceVariantIds.map((id) => ({
      serviceVariantId: id,
      durationMinutes: durationById.get(id) ?? 0,
    }));
    const slots = splitServiceSlots(orderedDurations, input.startTime as TimeString);

    const customer = await findOrCreateCustomer(supabase, input.customerPhone, input.customerName);

    const sqlClient = createSupabaseAppointmentSqlClient(supabase);

    // 後台代客建單一律直接 confirmed，不走訂金流程——臨櫃/電話當下就能
    // 決定，不需要客人自己在 ECPay 頁面付款。
    const result = await createMultiServiceAppointments(
      (serviceVariantId) =>
        createAppointmentRepository(sqlClient, {
          serviceVariantId,
          source: input.source,
          status: "confirmed",
          expiresAt: null,
        }),
      (appointmentId) => sqlClient.cancelAppointment(appointmentId, "slot_conflict_rollback"),
      { customerId: customer.id, staffId: resolvedStaffId, date: input.date },
      slots
    );

    if (!result.ok) return { ok: false, error: result.message };

    if (input.customerNote) {
      await supabase
        .from("appointments")
        .update({ customer_note: input.customerNote })
        .eq("id", result.appointmentIds[0]);
    }

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.appointment.create_manual",
      targetTable: "appointments",
      targetId: result.appointmentIds[0],
      after: {
        appointmentIds: result.appointmentIds,
        customerId: customer.id,
        staffId: resolvedStaffId,
        date: input.date,
        startTime: input.startTime,
        source: input.source,
      },
    });

    await broadcastCalendarChange({ appointmentId: result.appointmentIds[0], date: input.date });

    return { ok: true, appointmentIds: result.appointmentIds };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}
