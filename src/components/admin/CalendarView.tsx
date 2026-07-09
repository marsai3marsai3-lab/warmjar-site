"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CALENDAR_CHANNEL, CALENDAR_EVENT } from "@/lib/admin/realtime";
import type { CalendarAppointment, StaffOption } from "@/lib/admin/calendarData";
import { CalendarNav } from "./CalendarNav";
import { DayView } from "./DayView";
import { WeekView } from "./WeekView";
import { AppointmentDetailPanel } from "./AppointmentDetailPanel";

type CalendarViewProps = {
  view: "day" | "week";
  date: string;
  rangeStart: string;
  rangeEnd: string;
  appointments: CalendarAppointment[];
  staffOptions: StaffOption[];
  isOwner: boolean;
};

export function CalendarView({ view, date, rangeStart, appointments, staffOptions, isOwner }: CalendarViewProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(CALENDAR_CHANNEL)
      .on("broadcast", { event: CALENDAR_EVENT }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const selected = appointments.find((a) => a.id === selectedId) ?? null;

  return (
    <div>
      <CalendarNav view={view} date={date} />

      {view === "day" ? (
        <DayView date={date} appointments={appointments} staffOptions={staffOptions} onSelect={setSelectedId} />
      ) : (
        <WeekView rangeStart={rangeStart} appointments={appointments} staffOptions={staffOptions} />
      )}

      {selected && (
        <AppointmentDetailPanel appointment={selected} isOwner={isOwner} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
