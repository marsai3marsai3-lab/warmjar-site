import { createAdminClient } from "@/lib/supabase/admin";
import { fetchCalendarAppointments, fetchStaffOptions } from "@/lib/admin/calendarData";
import { addDaysISO, startOfWeekISO, taipeiTodayISO } from "@/lib/admin/dateUtils";
import { CalendarView } from "@/components/admin/CalendarView";

type SearchParams = Promise<{ date?: string; view?: string }>;

export default async function AdminCalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const view = params.view === "week" ? "week" : "day";
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : taipeiTodayISO();

  const rangeStart = view === "week" ? startOfWeekISO(date) : date;
  const rangeEnd = view === "week" ? addDaysISO(rangeStart, 6) : date;

  const supabase = createAdminClient();
  const [appointments, staffOptions] = await Promise.all([
    fetchCalendarAppointments(supabase, { startDate: rangeStart, endDate: rangeEnd }),
    fetchStaffOptions(supabase),
  ]);

  return (
    <CalendarView
      view={view}
      date={date}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      appointments={appointments}
      staffOptions={staffOptions}
    />
  );
}
