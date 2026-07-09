import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  AppointmentLike,
  AvailabilityInput,
  ServiceSelection,
  StaffRecurringAvailability,
  StaffSchedule,
  StaffServiceSkill,
  TimeString,
} from "./availability";

export type StaffOption = { id: string; name: string };

export type FetchAvailabilityInputResult =
  | {
      ok: true;
      input: AvailabilityInput;
      staffOptions: StaffOption[];
      totalDurationMinutes: number;
    }
  | { ok: false; error: string };

const OCCUPYING_STATUSES = ["pending", "confirmed", "completed", "pending_deposit"] as const;

export async function fetchAvailabilityInput(
  supabase: SupabaseClient<Database>,
  params: {
    serviceVariantIds: string[];
    staffId?: string;
    dateRange: { startDate: string; endDate: string };
    bufferMinutes: number;
    now?: Date;
    // 改期/換師傅時，正在被改的那筆預約本身還在 DB 裡佔著舊時段，查詢
    // 出來的 occupying appointments 會包含它自己——排除掉，否則它會把
    // 自己的舊時段（或跟新時段有 buffer 重疊的鄰近時段）誤判成衝突。
    excludeAppointmentId?: string;
  }
): Promise<FetchAvailabilityInputResult> {
  const variantsRes = await supabase
    .from("service_variants")
    .select("id, service_id, duration_minutes, is_active")
    .in("id", params.serviceVariantIds);
  if (variantsRes.error) throw variantsRes.error;

  const variants = variantsRes.data ?? [];
  if (variants.length !== params.serviceVariantIds.length || variants.some((v) => !v.is_active)) {
    return { ok: false, error: "服務項目不存在或已下架，請重新選擇" };
  }

  const services: ServiceSelection[] = variants.map((v) => ({
    id: v.service_id,
    durationMinutes: v.duration_minutes,
  }));
  const totalDurationMinutes = variants.reduce((sum, v) => sum + v.duration_minutes, 0);

  const [staffRes, recurringRes, schedulesRes, appointmentsRes, skillsRes] = await Promise.all([
    supabase.from("staff").select("id, name").eq("status", "active"),
    supabase
      .from("staff_recurring_availability")
      .select("staff_id, weekday, start_time, end_time, is_active"),
    supabase
      .from("staff_schedules")
      .select("staff_id, work_date, start_time, end_time, is_day_off")
      .gte("work_date", params.dateRange.startDate)
      .lte("work_date", params.dateRange.endDate),
    supabase
      .from("appointments")
      .select("id, appointment_date, start_time, end_time, staff_id, status, expires_at")
      .gte("appointment_date", params.dateRange.startDate)
      .lte("appointment_date", params.dateRange.endDate)
      .in("status", OCCUPYING_STATUSES),
    supabase.from("staff_service_skills").select("staff_id, service_id, can_perform"),
  ]);

  if (staffRes.error) throw staffRes.error;
  if (recurringRes.error) throw recurringRes.error;
  if (schedulesRes.error) throw schedulesRes.error;
  if (appointmentsRes.error) throw appointmentsRes.error;
  if (skillsRes.error) throw skillsRes.error;

  const activeStaffIds = new Set((staffRes.data ?? []).map((s) => s.id));

  const staffRecurringAvailabilities: StaffRecurringAvailability[] = (recurringRes.data ?? [])
    .filter((r) => activeStaffIds.has(r.staff_id))
    .map((r) => ({
      staffId: r.staff_id,
      weekday: r.weekday,
      startTime: r.start_time.slice(0, 5) as TimeString,
      endTime: r.end_time.slice(0, 5) as TimeString,
      isActive: r.is_active,
    }));

  const staffSchedules: StaffSchedule[] = (schedulesRes.data ?? [])
    .filter((s) => activeStaffIds.has(s.staff_id))
    .map((s) => ({
      staffId: s.staff_id,
      date: s.work_date,
      startTime: (s.start_time ?? "00:00").slice(0, 5) as TimeString,
      endTime: (s.end_time ?? "00:00").slice(0, 5) as TimeString,
      isDayOff: s.is_day_off,
    }));

  const appointments: AppointmentLike[] = (appointmentsRes.data ?? [])
    .filter((a) => a.id !== params.excludeAppointmentId)
    .map((a) => ({
      id: a.id,
      date: a.appointment_date,
      startTime: a.start_time.slice(0, 5) as TimeString,
      endTime: a.end_time.slice(0, 5) as TimeString,
      staffId: a.staff_id,
      status: a.status,
      expiresAt: a.expires_at,
    }));

  const staffServiceSkills: StaffServiceSkill[] = (skillsRes.data ?? []).map((s) => ({
    staffId: s.staff_id,
    serviceId: s.service_id,
    canPerform: s.can_perform,
  }));

  const input: AvailabilityInput = {
    dateRange: params.dateRange,
    services,
    bufferMinutes: params.bufferMinutes,
    designatedStaffId: params.staffId,
    now: params.now,
    staffSchedules,
    staffRecurringAvailabilities,
    appointments,
    staffServiceSkills,
  };

  const staffOptions: StaffOption[] = (staffRes.data ?? []).map((s) => ({ id: s.id, name: s.name }));

  return { ok: true, input, staffOptions, totalDurationMinutes };
}
