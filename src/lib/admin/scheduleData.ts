import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type RecurringDay = {
  weekday: number;
  isDayOff: boolean;
  startTime: string;
  endTime: string;
};

export type ScheduleException = {
  id: string;
  workDate: string;
  isDayOff: boolean;
  startTime: string | null;
  endTime: string | null;
  note: string | null;
};

const DEFAULT_START = "10:00";
const DEFAULT_END = "22:00";

export async function fetchRecurringSchedule(
  supabase: SupabaseClient<Database>,
  staffId: string
): Promise<RecurringDay[]> {
  const { data, error } = await supabase
    .from("staff_recurring_availability")
    .select("weekday, start_time, end_time, is_active")
    .eq("staff_id", staffId);
  if (error) throw error;

  const byWeekday = new Map(data?.map((r) => [r.weekday, r]));

  return Array.from({ length: 7 }, (_, weekday) => {
    const row = byWeekday.get(weekday);
    if (!row) return { weekday, isDayOff: true, startTime: DEFAULT_START, endTime: DEFAULT_END };
    return {
      weekday,
      isDayOff: !row.is_active,
      startTime: row.start_time.slice(0, 5),
      endTime: row.end_time.slice(0, 5),
    };
  });
}

export async function fetchScheduleExceptions(
  supabase: SupabaseClient<Database>,
  staffId: string,
  fromDate: string
): Promise<ScheduleException[]> {
  const { data, error } = await supabase
    .from("staff_schedules")
    .select("id, work_date, is_day_off, start_time, end_time, note")
    .eq("staff_id", staffId)
    .gte("work_date", fromDate)
    .order("work_date");
  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    workDate: r.work_date,
    isDayOff: r.is_day_off,
    startTime: r.start_time ? r.start_time.slice(0, 5) : null,
    endTime: r.end_time ? r.end_time.slice(0, 5) : null,
    note: r.note,
  }));
}
