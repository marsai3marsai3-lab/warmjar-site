"use client";

import { useState, useTransition } from "react";
import type { CancelButtonState } from "@/lib/booking/customerCancelPolicy";

export type MemberAppointment = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  serviceName: string;
  staffName: string;
  cancelButtonState: CancelButtonState;
  deposit: { amount: number; paymentUrl: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending_deposit: "待付訂金",
  confirmed: "已確認",
  completed: "已完成",
  cancelled: "已取消",
  no_show: "未到店",
};

export function MemberAppointmentsTab({
  appointments,
  onChanged,
}: {
  appointments: MemberAppointment[];
  onChanged: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const upcoming = appointments.filter((a) => a.status === "confirmed" || a.status === "pending_deposit");
  const history = appointments.filter((a) => a.status !== "confirmed" && a.status !== "pending_deposit");

  function handleCancel(id: string) {
    if (!window.confirm("確定要取消這筆預約嗎？")) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/member/appointments/${id}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "取消失敗");
        return;
      }
      onChanged();
    });
  }

  function renderCard(a: MemberAppointment) {
    return (
      <div key={a.id} className="rounded-xl border border-cream-border bg-white p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium text-ink">
            {a.date} {a.startTime}–{a.endTime}
          </span>
          <span className="text-xs text-ink-light">{STATUS_LABEL[a.status] ?? a.status}</span>
        </div>
        <p className="mt-1 text-ink-muted">
          {a.serviceName}・{a.staffName}
        </p>

        {a.deposit && (
          <a
            href={a.deposit.paymentUrl}
            className="mt-2 block rounded-full bg-terracotta py-2 text-center text-xs font-medium text-cream"
          >
            前往付款訂金 NT$ {a.deposit.amount.toLocaleString()}
          </a>
        )}

        {a.cancelButtonState.kind === "cancellable" && (
          <button
            disabled={isPending}
            onClick={() => handleCancel(a.id)}
            className="mt-2 rounded-full border border-cream-border px-3 py-1.5 text-xs text-ink-muted hover:border-terracotta disabled:opacity-50"
          >
            取消預約
          </button>
        )}
        {a.cancelButtonState.kind === "too_close" && (
          <div className="mt-2 rounded-lg border border-dashed border-cream-border px-3 py-1.5 text-xs text-ink-light">
            {a.cancelButtonState.message}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {error && <p className="text-sm text-terracotta-dark">{error}</p>}

      <div className="space-y-2">
        <p className="text-sm font-medium text-ink-muted">即將到來</p>
        {upcoming.length === 0 && <p className="text-sm text-ink-light">目前沒有即將到來的預約。</p>}
        {upcoming.map(renderCard)}
      </div>

      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink-muted">歷史紀錄</p>
          {history.map(renderCard)}
        </div>
      )}
    </section>
  );
}
