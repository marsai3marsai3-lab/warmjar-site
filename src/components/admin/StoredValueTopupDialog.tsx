"use client";

import { useState, useTransition } from "react";
import type { StoredValuePlan } from "@/lib/storedValue/storedValueData";
import { createStoredValueTopup } from "@/app/admin/(ops)/members/_actions";

type StaffOption = { id: string; name: string };

type StoredValueTopupDialogProps = {
  customerId: string;
  plans: StoredValuePlan[];
  staffOptions: StaffOption[];
  onClose: () => void;
  onSuccess: () => void;
};

export function StoredValueTopupDialog({
  customerId,
  plans,
  staffOptions,
  onClose,
  onSuccess,
}: StoredValueTopupDialogProps) {
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [soldBy, setSoldBy] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const selectedPlan = plans.find((p) => p.id === planId);
  const due = selectedPlan?.principalAmount ?? 0;
  const paymentsTotal = (Number(cashAmount) || 0) + (Number(cardAmount) || 0);
  const canSubmit = !!planId && !!soldBy && paymentsTotal === due && due > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const payments = [
      { method: "cash", amount: Number(cashAmount) || 0 },
      { method: "ecpay_credit", amount: Number(cardAmount) || 0 },
    ].filter((p) => p.amount > 0);

    startTransition(async () => {
      const result = await createStoredValueTopup({ customerId, planId, soldBy, payments });
      setSubmitting(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSuccess();
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/30 sm:items-center sm:justify-center" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 font-heading text-lg font-semibold text-ink">儲值</h2>

        <label className="mb-1 block text-sm font-medium text-ink-muted">選擇方案</label>
        <div className="mb-3 space-y-2">
          {plans.map((plan) => (
            <label
              key={plan.id}
              className={`flex items-center justify-between rounded-xl border p-3 text-sm ${
                planId === plan.id ? "border-terracotta bg-terracotta/5" : "border-cream-border"
              }`}
            >
              <span className="flex items-center gap-2">
                <input type="radio" checked={planId === plan.id} onChange={() => setPlanId(plan.id)} />
                {plan.name}
              </span>
              <span className="text-ink-muted">
                NT${plan.principalAmount.toLocaleString()}→{(plan.principalAmount + plan.bonusAmount).toLocaleString()}
              </span>
            </label>
          ))}
          {plans.length === 0 && <p className="text-sm text-ink-light">目前沒有啟用中的方案。</p>}
        </div>

        <label className="mb-1 block text-sm font-medium text-ink-muted">銷售歸屬師傅（必填）</label>
        <select
          value={soldBy}
          onChange={(e) => setSoldBy(e.target.value)}
          className="mb-3 w-full rounded-lg border border-cream-border px-3 py-2 text-sm"
        >
          <option value="">請選擇</option>
          {staffOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <p className="mb-2 text-sm text-ink">應收 NT$ {due.toLocaleString()}</p>
        <div className="mb-1 flex items-center gap-2">
          <span className="w-12 text-sm text-ink-muted">現金</span>
          <input
            type="number"
            value={cashAmount}
            onChange={(e) => setCashAmount(e.target.value)}
            className="flex-1 rounded-lg border border-cream-border px-3 py-1.5 text-sm"
            placeholder="0"
          />
        </div>
        <div className="mb-3 flex items-center gap-2">
          <span className="w-12 text-sm text-ink-muted">刷卡</span>
          <input
            type="number"
            value={cardAmount}
            onChange={(e) => setCardAmount(e.target.value)}
            className="flex-1 rounded-lg border border-cream-border px-3 py-1.5 text-sm"
            placeholder="0"
          />
        </div>
        <p className="mb-3 text-xs text-ink-light">
          已輸入 NT$ {paymentsTotal.toLocaleString()}／應收 NT$ {due.toLocaleString()}
          {paymentsTotal === due && due > 0 ? " ✅" : ""}
        </p>

        {error && <p className="mb-3 text-sm text-terracotta-dark">{error}</p>}

        <div className="flex gap-2">
          <button
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className="flex-1 rounded-full bg-terracotta py-2.5 text-sm font-medium text-cream disabled:opacity-50"
          >
            {submitting ? "處理中…" : "確認儲值"}
          </button>
          <button onClick={onClose} className="flex-1 rounded-full border border-cream-border py-2.5 text-sm text-ink-muted">
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
