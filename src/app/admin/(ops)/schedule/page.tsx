import { createAdminClient } from "@/lib/supabase/admin";
import { fetchStaffOptions } from "@/lib/admin/calendarData";
import { fetchRecurringSchedule, fetchScheduleExceptions } from "@/lib/admin/scheduleData";
import { taipeiTodayISO } from "@/lib/admin/dateUtils";
import { ScheduleEditor } from "@/components/admin/ScheduleEditor";

type SearchParams = Promise<{ staffId?: string }>;

export default async function AdminSchedulePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = createAdminClient();

  const staffOptions = await fetchStaffOptions(supabase);
  const staffId = params.staffId ?? staffOptions[0]?.id ?? null;

  if (!staffId) {
    return <p className="px-4 py-10 text-center text-sm text-ink-light">目前沒有可排班的師傅。</p>;
  }

  const [recurring, exceptions] = await Promise.all([
    fetchRecurringSchedule(supabase, staffId),
    fetchScheduleExceptions(supabase, staffId, taipeiTodayISO()),
  ]);

  return (
    <ScheduleEditor
      staffOptions={staffOptions}
      selectedStaffId={staffId}
      recurring={recurring}
      exceptions={exceptions}
    />
  );
}
