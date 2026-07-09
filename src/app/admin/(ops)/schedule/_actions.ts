"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminForAction } from "@/lib/admin/auth";
import { writeAuditLog } from "@/lib/booking/auditLog";
import type { RecurringDay } from "@/lib/admin/scheduleData";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveRecurringSchedule(staffId: string, days: RecurringDay[]): Promise<ActionResult> {
  try {
    const { profile } = await requireAdminForAction();
    const supabase = createAdminClient();

    // Enforce a single row per (staff, weekday) at the app layer even though
    // the table itself doesn't have that constraint — replace-on-save keeps
    // the editor's "one row per weekday" model simple and predictable.
    const del = await supabase.from("staff_recurring_availability").delete().eq("staff_id", staffId);
    if (del.error) return { ok: false, error: "更新失敗，請稍後再試" };

    const rowsToInsert = days
      .filter((d) => !d.isDayOff)
      .map((d) => ({
        staff_id: staffId,
        weekday: d.weekday,
        start_time: d.startTime,
        end_time: d.endTime,
        is_active: true,
      }));

    if (rowsToInsert.length > 0) {
      const ins = await supabase.from("staff_recurring_availability").insert(rowsToInsert);
      if (ins.error) return { ok: false, error: "更新失敗，請稍後再試" };
    }

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.schedule.save_recurring",
      targetTable: "staff_recurring_availability",
      targetId: staffId,
      after: days,
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

export async function saveScheduleException(input: {
  staffId: string;
  workDate: string;
  isDayOff: boolean;
  startTime?: string;
  endTime?: string;
  note?: string;
}): Promise<ActionResult> {
  try {
    const { profile } = await requireAdminForAction();
    const supabase = createAdminClient();

    const { error } = await supabase.from("staff_schedules").upsert(
      {
        staff_id: input.staffId,
        work_date: input.workDate,
        is_day_off: input.isDayOff,
        start_time: input.isDayOff ? null : (input.startTime ?? null),
        end_time: input.isDayOff ? null : (input.endTime ?? null),
        note: input.note ?? null,
      },
      { onConflict: "staff_id,work_date" }
    );
    if (error) return { ok: false, error: "更新失敗，請稍後再試" };

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.schedule.save_exception",
      targetTable: "staff_schedules",
      targetId: input.staffId,
      after: input,
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

export async function deleteScheduleException(exceptionId: string): Promise<ActionResult> {
  try {
    const { profile } = await requireAdminForAction();
    const supabase = createAdminClient();

    const { error } = await supabase.from("staff_schedules").delete().eq("id", exceptionId);
    if (error) return { ok: false, error: "刪除失敗，請稍後再試" };

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.schedule.delete_exception",
      targetTable: "staff_schedules",
      targetId: exceptionId,
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}
