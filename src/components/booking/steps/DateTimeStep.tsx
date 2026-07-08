"use client";

import type { DaySlots } from "../types";

type SlotChoice = { startTime: string; endTime: string; availableStaffIds: string[] };

type DateTimeStepProps = {
  dateRange: string[];
  days: DaySlots[] | null;
  loading: boolean;
  error: string | null;
  selectedDate: string | null;
  selectedSlot: SlotChoice | null;
  onSelectDate: (date: string) => void;
  onSelectSlot: (slot: SlotChoice) => void;
};

function formatDateLabel(dateISO: string): { weekday: string; day: string } {
  const d = new Date(`${dateISO}T00:00:00`);
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return { weekday: `週${weekday}`, day: String(d.getDate()) };
}

export function DateTimeStep({
  dateRange,
  days,
  loading,
  error,
  selectedDate,
  selectedSlot,
  onSelectDate,
  onSelectSlot,
}: DateTimeStepProps) {
  const slotsByDate = new Map((days ?? []).map((d) => [d.date, d.slots]));
  const activeSlots = selectedDate ? (slotsByDate.get(selectedDate) ?? []) : [];

  return (
    <div className="px-4 py-6">
      <h2 className="font-heading text-xl font-semibold text-ink mb-1">選擇日期與時段</h2>
      <p className="text-ink-muted text-sm mb-4">僅顯示目前真正可預約的時段。</p>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {dateRange.map((date) => {
          const { weekday, day } = formatDateLabel(date);
          const hasSlots = (slotsByDate.get(date)?.length ?? 0) > 0;
          const isSelected = selectedDate === date;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate(date)}
              disabled={!days}
              className={`flex shrink-0 flex-col items-center rounded-2xl border px-3.5 py-2.5 transition-colors ${
                isSelected
                  ? "border-terracotta bg-terracotta text-cream"
                  : hasSlots
                    ? "border-cream-border bg-white text-ink"
                    : "border-cream-border bg-cream-dark text-ink-light"
              }`}
            >
              <span className="text-xs">{weekday}</span>
              <span className="text-base font-medium">{day}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {loading && <p className="text-sm text-ink-light">正在查詢可預約時段…</p>}
        {error && <p className="text-sm text-terracotta-dark">{error}</p>}
        {!loading && !error && selectedDate && activeSlots.length === 0 && (
          <p className="text-sm text-ink-light">這天沒有可預約的時段了，請選其他日期。</p>
        )}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {activeSlots.map((slot) => {
            const isSelected = selectedSlot?.startTime === slot.startTime;
            return (
              <button
                key={slot.startTime}
                type="button"
                onClick={() => onSelectSlot(slot)}
                className={`rounded-xl border py-2.5 text-sm transition-colors ${
                  isSelected
                    ? "border-terracotta bg-terracotta text-cream"
                    : "border-cream-border bg-white text-ink hover:border-terracotta"
                }`}
              >
                {slot.startTime}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
