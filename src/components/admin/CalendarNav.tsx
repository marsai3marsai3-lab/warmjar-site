"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDaysISO, formatWeekdayLabel, taipeiTodayISO } from "@/lib/admin/dateUtils";

type CalendarNavProps = {
  view: "day" | "week";
  date: string;
};

export function CalendarNav({ view, date }: CalendarNavProps) {
  const step = view === "week" ? 7 : 1;
  const prevDate = addDaysISO(date, -step);
  const nextDate = addDaysISO(date, step);
  const today = taipeiTodayISO();

  const dateLabel =
    view === "day"
      ? `${date}（週${formatWeekdayLabel(date)}）`
      : `${date} 那一週`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-border bg-white px-4 py-3">
      <div className="flex items-center gap-1.5">
        <Link
          href={`/admin/calendar?date=${prevDate}&view=${view}`}
          className="rounded-full p-1.5 text-ink-muted hover:bg-cream-dark"
        >
          <ChevronLeft size={20} />
        </Link>
        <Link
          href={`/admin/calendar?date=${today}&view=${view}`}
          className="rounded-full border border-cream-border px-3 py-1 text-sm text-ink-muted hover:border-terracotta"
        >
          今天
        </Link>
        <Link
          href={`/admin/calendar?date=${nextDate}&view=${view}`}
          className="rounded-full p-1.5 text-ink-muted hover:bg-cream-dark"
        >
          <ChevronRight size={20} />
        </Link>
        <span className="ml-1 text-sm font-medium text-ink">{dateLabel}</span>
      </div>

      <div className="flex overflow-hidden rounded-full border border-cream-border text-sm">
        <Link
          href={`/admin/calendar?date=${date}&view=day`}
          className={`px-3 py-1.5 ${view === "day" ? "bg-terracotta text-cream" : "text-ink-muted"}`}
        >
          日
        </Link>
        <Link
          href={`/admin/calendar?date=${date}&view=week`}
          className={`px-3 py-1.5 ${view === "week" ? "bg-terracotta text-cream" : "text-ink-muted"}`}
        >
          週
        </Link>
      </div>
    </div>
  );
}
