"use client";

import {
  DISPLAY_END_TIME,
  DISPLAY_START_TIME,
  PX_PER_MINUTE,
  computeBlockPosition,
  currentTimeOffset,
  timeToMinutes,
  totalGridHeight,
} from "@/lib/admin/calendarLayout";
import { STATUS_BLOCK_STYLE } from "@/lib/admin/labels";
import { taipeiTodayISO } from "@/lib/admin/dateUtils";
import type { CalendarAppointment, StaffOption } from "@/lib/admin/calendarData";

type DayViewProps = {
  date: string;
  appointments: CalendarAppointment[];
  staffOptions: StaffOption[];
  onSelect: (appointmentId: string) => void;
};

function hourMarks(): number[] {
  const [startH] = DISPLAY_START_TIME.split(":").map(Number);
  const [endH] = DISPLAY_END_TIME.split(":").map(Number);
  const marks: number[] = [];
  for (let h = startH; h <= endH; h++) marks.push(h);
  return marks;
}

function taipeiNowMinutes(): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return Number(map.hour) * 60 + Number(map.minute);
}

export function DayView({ date, appointments, staffOptions, onSelect }: DayViewProps) {
  const dayAppointments = appointments.filter((a) => a.date === date);
  const isToday = date === taipeiTodayISO();
  const nowOffset = isToday ? currentTimeOffset(taipeiNowMinutes()) : null;
  const gridHeight = totalGridHeight();
  const marks = hourMarks();

  if (staffOptions.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-ink-light">目前沒有可排班的師傅。</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max">
        <div className="sticky left-0 z-10 w-12 shrink-0 bg-cream">
          <div className="h-9 border-b border-cream-border" />
          <div className="relative" style={{ height: gridHeight }}>
            {marks.map((h) => (
              <div
                key={h}
                className="absolute right-1 -translate-y-1/2 text-[11px] text-ink-light"
                style={{ top: (h * 60 - timeToMinutes(DISPLAY_START_TIME)) * PX_PER_MINUTE }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
        </div>

        {staffOptions.map((staff) => (
          <div key={staff.id} className="w-40 shrink-0 border-l border-cream-border">
            <div className="sticky top-0 z-10 flex h-9 items-center justify-center border-b border-cream-border bg-white text-sm font-medium text-ink">
              {staff.name}
            </div>
            <div className="relative" style={{ height: gridHeight }}>
              {marks.map((h) => (
                <div
                  key={h}
                  className="absolute w-full border-t border-cream-border/60"
                  style={{ top: (h * 60 - timeToMinutes(DISPLAY_START_TIME)) * PX_PER_MINUTE }}
                />
              ))}

              {nowOffset !== null && (
                <div
                  className="absolute z-20 w-full border-t-2 border-terracotta-dark"
                  style={{ top: nowOffset }}
                />
              )}

              {dayAppointments
                .filter((a) => a.staffId === staff.id)
                .map((appt) => {
                  const { top, height } = computeBlockPosition(appt.startTime, appt.endTime);
                  const showCheckedIn = appt.checkedInAt && appt.status !== "completed";
                  return (
                    <button
                      key={appt.id}
                      onClick={() => onSelect(appt.id)}
                      style={{ top, height: Math.max(height, 24) }}
                      className={`absolute left-0.5 right-0.5 overflow-hidden rounded-lg px-1.5 py-1 text-left text-xs shadow-sm ${
                        STATUS_BLOCK_STYLE[appt.status] ?? "bg-cream-dark text-ink"
                      } ${showCheckedIn ? "ring-2 ring-olive" : ""}`}
                    >
                      <div className="truncate font-medium">{appt.customerName || "（無姓名）"}</div>
                      <div className="truncate opacity-80">{appt.serviceName}</div>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
