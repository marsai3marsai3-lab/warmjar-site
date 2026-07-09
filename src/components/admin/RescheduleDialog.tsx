"use client";

import { useEffect, useState } from "react";
import { taipeiTodayISO } from "@/lib/admin/dateUtils";
import { rescheduleAppointment } from "@/app/admin/(ops)/calendar/_actions";

type StaffOption = { id: string; name: string };
type DaySlot = { startTime: string; endTime: string; availableStaffIds: string[] };

type RescheduleDialogProps = {
  appointmentId: string;
  serviceVariantId: string;
  currentDate: string;
  currentStaffId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function RescheduleDialog({
  appointmentId,
  serviceVariantId,
  currentDate,
  currentStaffId,
  onClose,
  onSuccess,
}: RescheduleDialogProps) {
  const [date, setDate] = useState(currentDate < taipeiTodayISO() ? taipeiTodayISO() : currentDate);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [staffChoice, setStaffChoice] = useState<string>(currentStaffId ?? "any");
  const [slots, setSlots] = useState<DaySlot[] | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setSlots(null);
      setSelectedTime(null);
      try {
        const res = await fetch("/api/book/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceVariantIds: [serviceVariantId],
            staffId: staffChoice !== "any" ? staffChoice : undefined,
            dateRange: { startDate: date, endDate: date },
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        setStaffOptions(data.staffOptions ?? []);
        setSlots(data.days?.[0]?.slots ?? []);
      } catch {
        if (!cancelled) setError("無法取得可預約時段");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [date, staffChoice, serviceVariantId]);

  function handleConfirm() {
    if (!selectedTime) return;
    setSubmitting(true);
    setError(null);
    rescheduleAppointment(appointmentId, {
      date,
      startTime: selectedTime,
      staffId: staffChoice !== "any" ? staffChoice : undefined,
    })
      .then((result) => {
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onSuccess();
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/30 sm:items-center sm:justify-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 font-heading text-lg font-semibold text-ink">改期/換師傅</h2>

        <label className="mb-1 block text-sm font-medium text-ink-muted">新日期</label>
        <input
          type="date"
          value={date}
          min={taipeiTodayISO()}
          onChange={(e) => setDate(e.target.value)}
          className="mb-3 w-full rounded-lg border border-cream-border px-3 py-1.5 text-sm"
        />

        <label className="mb-1 block text-sm font-medium text-ink-muted">師傅</label>
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            onClick={() => setStaffChoice("any")}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              staffChoice === "any" ? "border-terracotta bg-terracotta text-cream" : "border-cream-border text-ink-muted"
            }`}
          >
            不指定
          </button>
          {staffOptions.map((staff) => (
            <button
              key={staff.id}
              onClick={() => setStaffChoice(staff.id)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                staffChoice === staff.id ? "border-terracotta bg-terracotta text-cream" : "border-cream-border text-ink-muted"
              }`}
            >
              {staff.name}
            </button>
          ))}
        </div>

        <label className="mb-1 block text-sm font-medium text-ink-muted">時段</label>
        {slots === null ? (
          <p className="text-sm text-ink-light">載入中…</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-ink-light">這天沒有可預約的時段，請改選其他日期。</p>
        ) : (
          <div className="mb-4 grid grid-cols-4 gap-2">
            {slots.map((slot) => (
              <button
                key={slot.startTime}
                onClick={() => setSelectedTime(slot.startTime)}
                className={`rounded-lg border py-2 text-sm ${
                  selectedTime === slot.startTime
                    ? "border-terracotta bg-terracotta text-cream"
                    : "border-cream-border text-ink"
                }`}
              >
                {slot.startTime}
              </button>
            ))}
          </div>
        )}

        {error && <p className="mb-3 text-sm text-terracotta-dark">{error}</p>}

        <div className="flex gap-2">
          <button
            disabled={submitting || !selectedTime}
            onClick={handleConfirm}
            className="flex-1 rounded-full bg-terracotta py-2.5 text-sm font-medium text-cream disabled:opacity-50"
          >
            {submitting ? "處理中…" : "確認改期"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-cream-border py-2.5 text-sm text-ink-muted"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
