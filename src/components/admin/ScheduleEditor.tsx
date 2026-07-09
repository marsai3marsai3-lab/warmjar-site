"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { RecurringDay, ScheduleException } from "@/lib/admin/scheduleData";
import type { StaffOption } from "@/lib/admin/calendarData";
import {
  deleteScheduleException,
  saveRecurringSchedule,
  saveScheduleException,
} from "@/app/admin/(ops)/schedule/_actions";

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

type ScheduleEditorProps = {
  staffOptions: StaffOption[];
  selectedStaffId: string;
  recurring: RecurringDay[];
  exceptions: ScheduleException[];
};

export function ScheduleEditor({ staffOptions, selectedStaffId, recurring, exceptions }: ScheduleEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [days, setDays] = useState<RecurringDay[]>(recurring);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [exceptionDate, setExceptionDate] = useState("");
  const [exceptionIsDayOff, setExceptionIsDayOff] = useState(true);
  const [exceptionStart, setExceptionStart] = useState("10:00");
  const [exceptionEnd, setExceptionEnd] = useState("22:00");
  const [exceptionNote, setExceptionNote] = useState("");

  function updateDay(weekday: number, patch: Partial<RecurringDay>) {
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
  }

  function handleSaveRecurring() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await saveRecurringSchedule(selectedStaffId, days);
      if (!result.ok) setError(result.error);
      else setMessage("週固定班表已儲存");
    });
  }

  function handleAddException() {
    if (!exceptionDate) {
      setError("請選擇日期");
      return;
    }
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await saveScheduleException({
        staffId: selectedStaffId,
        workDate: exceptionDate,
        isDayOff: exceptionIsDayOff,
        startTime: exceptionIsDayOff ? undefined : exceptionStart,
        endTime: exceptionIsDayOff ? undefined : exceptionEnd,
        note: exceptionNote || undefined,
      });
      if (!result.ok) setError(result.error);
      else {
        setMessage("例外班表已儲存");
        setExceptionDate("");
        setExceptionNote("");
        router.refresh();
      }
    });
  }

  function handleDeleteException(id: string) {
    if (!window.confirm("確定要刪除這筆例外班表嗎？")) return;
    startTransition(async () => {
      const result = await deleteScheduleException(id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="px-4 py-5">
      <div className="mb-5 flex gap-2 overflow-x-auto">
        {staffOptions.map((staff) => (
          <a
            key={staff.id}
            href={`/admin/schedule?staffId=${staff.id}`}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm ${
              staff.id === selectedStaffId
                ? "bg-terracotta text-cream"
                : "border border-cream-border text-ink-muted"
            }`}
          >
            {staff.name}
          </a>
        ))}
      </div>

      {message && <p className="mb-3 text-sm text-olive-dark">{message}</p>}
      {error && <p className="mb-3 text-sm text-terracotta-dark">{error}</p>}

      <section className="mb-8">
        <h2 className="mb-3 font-heading text-lg font-semibold text-ink">週固定班表</h2>
        <div className="space-y-2">
          {days.map((day) => (
            <div
              key={day.weekday}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-cream-border bg-white p-3"
            >
              <span className="w-6 shrink-0 font-medium text-ink">週{WEEKDAY_LABELS[day.weekday]}</span>
              <label className="flex items-center gap-1.5 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  checked={day.isDayOff}
                  onChange={(e) => updateDay(day.weekday, { isDayOff: e.target.checked })}
                />
                公休
              </label>
              {!day.isDayOff && (
                <div className="flex items-center gap-1.5 text-sm">
                  <input
                    type="time"
                    value={day.startTime}
                    onChange={(e) => updateDay(day.weekday, { startTime: e.target.value })}
                    className="rounded-lg border border-cream-border px-2 py-1"
                  />
                  <span className="text-ink-light">–</span>
                  <input
                    type="time"
                    value={day.endTime}
                    onChange={(e) => updateDay(day.weekday, { endTime: e.target.value })}
                    className="rounded-lg border border-cream-border px-2 py-1"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <button
          disabled={isPending}
          onClick={handleSaveRecurring}
          className="mt-3 rounded-full bg-terracotta px-6 py-2.5 text-sm font-medium text-cream disabled:opacity-50"
        >
          儲存週固定班表
        </button>
      </section>

      <section>
        <h2 className="mb-3 font-heading text-lg font-semibold text-ink">特定日期例外</h2>

        <div className="mb-4 space-y-2 rounded-xl border border-cream-border bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={exceptionDate}
              onChange={(e) => setExceptionDate(e.target.value)}
              className="rounded-lg border border-cream-border px-2 py-1.5 text-sm"
            />
            <label className="flex items-center gap-1.5 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={exceptionIsDayOff}
                onChange={(e) => setExceptionIsDayOff(e.target.checked)}
              />
              請假／公休
            </label>
            {!exceptionIsDayOff && (
              <div className="flex items-center gap-1.5 text-sm">
                <input
                  type="time"
                  value={exceptionStart}
                  onChange={(e) => setExceptionStart(e.target.value)}
                  className="rounded-lg border border-cream-border px-2 py-1"
                />
                <span className="text-ink-light">–</span>
                <input
                  type="time"
                  value={exceptionEnd}
                  onChange={(e) => setExceptionEnd(e.target.value)}
                  className="rounded-lg border border-cream-border px-2 py-1"
                />
              </div>
            )}
          </div>
          <input
            value={exceptionNote}
            onChange={(e) => setExceptionNote(e.target.value)}
            placeholder="備註（選填）"
            className="w-full rounded-lg border border-cream-border px-3 py-1.5 text-sm"
          />
          <button
            disabled={isPending}
            onClick={handleAddException}
            className="rounded-full border border-terracotta px-5 py-1.5 text-sm font-medium text-terracotta disabled:opacity-50"
          >
            新增例外
          </button>
        </div>

        <div className="space-y-2">
          {exceptions.length === 0 && <p className="text-sm text-ink-light">目前沒有排定的例外班表。</p>}
          {exceptions.map((ex) => (
            <div
              key={ex.id}
              className="flex items-center justify-between rounded-xl border border-cream-border bg-white p-3 text-sm"
            >
              <div>
                <span className="font-medium text-ink">{ex.workDate}</span>{" "}
                <span className="text-ink-muted">
                  {ex.isDayOff ? "請假／公休" : `${ex.startTime}–${ex.endTime}`}
                </span>
                {ex.note && <span className="ml-2 text-ink-light">（{ex.note}）</span>}
              </div>
              <button onClick={() => handleDeleteException(ex.id)} disabled={isPending} aria-label="刪除">
                <Trash2 size={16} className="text-terracotta-dark" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
