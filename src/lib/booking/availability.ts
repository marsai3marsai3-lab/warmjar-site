export type TimeString = `${number}:${number}`;

export type ServiceSelection = {
  id: string;
  durationMinutes: number;
  requiredResourceIds?: string[];
};

export type DateRange = {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
};

export type StaffSchedule = {
  staffId: string;
  date: string; // YYYY-MM-DD
  startTime: TimeString;
  endTime: TimeString;
  isDayOff?: boolean;
};

export type StaffRecurringAvailability = {
  staffId: string;
  weekday: number; // 0-6, 0=Sunday
  startTime: TimeString;
  endTime: TimeString;
  isActive?: boolean;
};

export type StaffScheduleOverride = {
  staffId: string;
  date: string;
  isDayOff?: boolean;
  startTime?: TimeString;
  endTime?: TimeString;
};

export type AppointmentLike = {
  id: string;
  date: string;
  startTime: TimeString;
  endTime: TimeString;
  staffId?: string | null;
  status: string;
  expiresAt?: string | null;
  resourceIds?: string[];
};

export type CalendarEvent = {
  id: string;
  date: string;
  startTime: TimeString;
  endTime: TimeString;
  staffId?: string | null;
};

export type ResourceBooking = {
  id: string;
  resourceId: string;
  date: string;
  startTime: TimeString;
  endTime: TimeString;
};

export type StaffServiceSkill = {
  staffId: string;
  serviceId: string;
  canPerform?: boolean;
};

export type AvailabilityInput = {
  dateRange: DateRange;
  services: ServiceSelection[];
  bufferMinutes: number;
  designatedStaffId?: string;
  slotIntervalMinutes?: number;
  now?: Date;
  timezone?: string;
  staffSchedules?: StaffSchedule[];
  staffRecurringAvailabilities?: StaffRecurringAvailability[];
  staffScheduleOverrides?: StaffScheduleOverride[];
  appointments?: AppointmentLike[];
  calendarEvents?: CalendarEvent[];
  resourceBookings?: ResourceBooking[];
  resourceCapacities?: Record<string, number>;
  staffServiceSkills?: StaffServiceSkill[];
};

export type AvailableSlot = {
  date: string;
  startTime: TimeString;
  endTime: TimeString;
  availableStaffIds: string[];
};

const TAIPEI_TZ = "Asia/Taipei";
const OCCUPYING_STATUSES = new Set(["pending", "confirmed", "completed", "pending_deposit"]);

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function toTimeString(minutes: number): TimeString {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}` as TimeString;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dateDiffDays(startDate: string, endDate: string): number {
  const s = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const e = new Date(`${endDate}T00:00:00.000Z`).getTime();
  return Math.floor((e - s) / 86400000);
}

function getTaipeiDateTime(now: Date, tz: string): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const map = new Map(parts.map((p) => [p.type, p.value]));
  const date = `${map.get("year")}-${map.get("month")}-${map.get("day")}`;
  const minutes = Number(map.get("hour")) * 60 + Number(map.get("minute"));
  return { date, minutes };
}

function getWeekday(date: string): number {
  const d = new Date(`${date}T00:00:00.000Z`);
  return d.getUTCDay();
}

function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

function collectRequiredResources(services: ServiceSelection[]): string[] {
  const set = new Set<string>();
  for (const svc of services) {
    for (const rid of svc.requiredResourceIds ?? []) {
      set.add(rid);
    }
  }
  return [...set];
}

function canStaffPerformAllServices(
  staffId: string,
  services: ServiceSelection[],
  staffServiceSkills: StaffServiceSkill[]
): boolean {
  if (!staffServiceSkills.length) return true;

  for (const svc of services) {
    const found = staffServiceSkills.some(
      (s) => s.staffId === staffId && s.serviceId === svc.id && s.canPerform !== false
    );
    if (!found) return false;
  }
  return true;
}

function buildDailyWindows(
  date: string,
  staffId: string,
  staffSchedules: StaffSchedule[],
  recurring: StaffRecurringAvailability[],
  overrides: StaffScheduleOverride[]
): Array<{ start: number; end: number }> {
  const explicit = staffSchedules.filter((s) => s.staffId === staffId && s.date === date);
  let windows: Array<{ start: number; end: number }> = [];

  if (explicit.length > 0) {
    windows = explicit
      .filter((s) => !s.isDayOff)
      .map((s) => ({ start: toMinutes(s.startTime), end: toMinutes(s.endTime) }));
  } else {
    const weekday = getWeekday(date);
    windows = recurring
      .filter((r) => r.staffId === staffId && r.weekday === weekday && r.isActive !== false)
      .map((r) => ({ start: toMinutes(r.startTime), end: toMinutes(r.endTime) }));
  }

  const dayOverrides = overrides.filter((o) => o.staffId === staffId && o.date === date);
  if (dayOverrides.length === 0) return windows;

  if (dayOverrides.some((o) => o.isDayOff)) {
    return [];
  }

  const overrideWindows = dayOverrides
    .filter((o) => o.startTime && o.endTime)
    .map((o) => ({ start: toMinutes(o.startTime as string), end: toMinutes(o.endTime as string) }));

  if (overrideWindows.length > 0) {
    return overrideWindows;
  }

  return windows;
}

function isAppointmentOccupying(a: AppointmentLike, now: Date): boolean {
  if (!OCCUPYING_STATUSES.has(a.status)) return false;

  if (a.status === "pending_deposit") {
    if (!a.expiresAt) return true;
    return new Date(a.expiresAt).getTime() > now.getTime();
  }

  return true;
}

export function calculateAvailability(input: AvailabilityInput): AvailableSlot[] {
  const interval = input.slotIntervalMinutes ?? 30;
  const timezone = input.timezone ?? TAIPEI_TZ;
  const now = input.now ?? new Date();

  const staffSchedules = input.staffSchedules ?? [];
  const recurring = input.staffRecurringAvailabilities ?? [];
  const overrides = input.staffScheduleOverrides ?? [];
  const appointments = input.appointments ?? [];
  const calendarEvents = input.calendarEvents ?? [];
  const resourceBookings = input.resourceBookings ?? [];
  const resourceCapacities = input.resourceCapacities ?? {};
  const staffServiceSkills = input.staffServiceSkills ?? [];

  const totalDuration =
    input.services.reduce((sum, svc) => sum + svc.durationMinutes, 0) + input.bufferMinutes;
  const requiredResources = collectRequiredResources(input.services);

  const staffCandidates = new Set<string>();
  for (const s of staffSchedules) staffCandidates.add(s.staffId);
  for (const s of recurring) staffCandidates.add(s.staffId);
  for (const s of overrides) staffCandidates.add(s.staffId);
  for (const s of staffServiceSkills) staffCandidates.add(s.staffId);

  const allStaffIds = [...staffCandidates].filter((sid) =>
    canStaffPerformAllServices(sid, input.services, staffServiceSkills)
  );

  const targetStaffIds = input.designatedStaffId
    ? allStaffIds.filter((id) => id === input.designatedStaffId)
    : allStaffIds;

  const taipeiNow = getTaipeiDateTime(now, timezone);
  const minStartToday = Math.ceil((taipeiNow.minutes + 120) / interval) * interval;

  const results = new Map<string, AvailableSlot>();
  const days = dateDiffDays(input.dateRange.startDate, input.dateRange.endDate);

  for (let d = 0; d <= days; d++) {
    const date = addDays(input.dateRange.startDate, d);

    for (const staffId of targetStaffIds) {
      const windows = buildDailyWindows(date, staffId, staffSchedules, recurring, overrides);

      for (const window of windows) {
        let cursor = window.start;
        while (cursor + totalDuration <= window.end) {
          const end = cursor + totalDuration;

          if (date === taipeiNow.date && cursor < minStartToday) {
            cursor += interval;
            continue;
          }

          const hasStaffAppointmentConflict = appointments.some((a) => {
            if (a.date !== date) return false;
            if (!isAppointmentOccupying(a, now)) return false;
            if (!a.staffId || a.staffId !== staffId) return false;
            return overlaps(cursor, end, toMinutes(a.startTime), toMinutes(a.endTime));
          });

          if (hasStaffAppointmentConflict) {
            cursor += interval;
            continue;
          }

          const hasCalendarConflict = calendarEvents.some((e) => {
            if (e.date !== date) return false;
            if (e.staffId && e.staffId !== staffId) return false;
            return overlaps(cursor, end, toMinutes(e.startTime), toMinutes(e.endTime));
          });

          if (hasCalendarConflict) {
            cursor += interval;
            continue;
          }

          const resourcesBlocked = requiredResources.some((rid) => {
            const capacity = resourceCapacities[rid] ?? 1;

            const occupiedByResourceBookings = resourceBookings.filter((b) => {
              if (b.resourceId !== rid || b.date !== date) return false;
              return overlaps(cursor, end, toMinutes(b.startTime), toMinutes(b.endTime));
            }).length;

            const occupiedByAppointments = appointments.filter((a) => {
              if (a.date !== date) return false;
              if (!isAppointmentOccupying(a, now)) return false;
              if (!a.resourceIds?.includes(rid)) return false;
              return overlaps(cursor, end, toMinutes(a.startTime), toMinutes(a.endTime));
            }).length;

            return occupiedByResourceBookings + occupiedByAppointments >= capacity;
          });

          if (resourcesBlocked) {
            cursor += interval;
            continue;
          }

          const key = `${date}_${toTimeString(cursor)}`;
          const existing = results.get(key);
          if (existing) {
            if (!existing.availableStaffIds.includes(staffId)) {
              existing.availableStaffIds.push(staffId);
              existing.availableStaffIds.sort();
            }
          } else {
            results.set(key, {
              date,
              startTime: toTimeString(cursor),
              endTime: toTimeString(end),
              availableStaffIds: [staffId],
            });
          }

          cursor += interval;
        }
      }
    }
  }

  return [...results.values()].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });
}
