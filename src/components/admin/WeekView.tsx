"use client";

import { useRouter } from "next/navigation";
import { addDaysISO, formatDayNumber, formatWeekdayLabel, taipeiTodayISO } from "@/lib/admin/dateUtils";
import { STATUS_DOT_STYLE } from "@/lib/admin/labels";
import type { CalendarAppointment, StaffOption } from "@/lib/admin/calendarData";

type WeekViewProps = {
  rangeStart: string;
  appointments: CalendarAppointment[];
  staffOptions: StaffOption[];
};

function weekDates(rangeStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(rangeStart, i));
}

export function WeekView({ rangeStart, appointments, staffOptions }: WeekViewProps) {
  const router = useRouter();
  const dates = weekDates(rangeStart);
  const today = taipeiTodayISO();

  function goToDay(date: string) {
    router.push(`/admin/calendar?date=${date}&view=day`);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-24 px-2 py-2 text-left text-xs text-ink-light">師傅</th>
            {dates.map((d) => (
              <th
                key={d}
                onClick={() => goToDay(d)}
                className={`cursor-pointer px-2 py-2 text-center font-medium ${
                  d === today ? "text-terracotta" : "text-ink"
                }`}
              >
                <div className="text-xs text-ink-light">週{formatWeekdayLabel(d)}</div>
                <div>{formatDayNumber(d)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {staffOptions.map((staff) => (
            <tr key={staff.id} className="border-t border-cream-border">
              <td className="px-2 py-3 font-medium text-ink">{staff.name}</td>
              {dates.map((d) => {
                const dayAppts = appointments.filter((a) => a.date === d && a.staffId === staff.id);
                const counts = new Map<string, number>();
                for (const a of dayAppts) counts.set(a.status, (counts.get(a.status) ?? 0) + 1);

                return (
                  <td
                    key={d}
                    onClick={() => goToDay(d)}
                    className="cursor-pointer px-2 py-3 text-center hover:bg-cream-dark/50"
                  >
                    {dayAppts.length === 0 ? (
                      <span className="text-xs text-ink-light">–</span>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-medium text-ink">{dayAppts.length}</span>
                        <div className="flex gap-0.5">
                          {[...counts.entries()].map(([status, count]) => (
                            <span
                              key={status}
                              title={`${status}: ${count}`}
                              className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_STYLE[status] ?? "bg-ink-light"}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
