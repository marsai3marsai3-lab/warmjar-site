"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { StoredValuePlan } from "@/lib/storedValue/storedValueData";
import { updateStoredValuePlan } from "@/app/admin/(ops)/stored-value-plans/_actions";

export function StoredValuePlanSettings({ plans }: { plans: StoredValuePlan[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [principalValues, setPrincipalValues] = useState<Record<string, string>>(
    Object.fromEntries(plans.map((p) => [p.id, String(p.principalAmount)]))
  );
  const [bonusValues, setBonusValues] = useState<Record<string, string>>(
    Object.fromEntries(plans.map((p) => [p.id, String(p.bonusAmount)]))
  );
  const [activeValues, setActiveValues] = useState<Record<string, boolean>>(
    Object.fromEntries(plans.map((p) => [p.id, p.isActive]))
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSave(planId: string) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await updateStoredValuePlan(planId, {
        principalAmount: Number(principalValues[planId]),
        bonusAmount: Number(bonusValues[planId]),
        isActive: activeValues[planId],
      });
      if (!result.ok) setError(result.error);
      else {
        setMessage("已儲存");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-5 px-4 py-5 pb-10">
      <h1 className="font-heading text-xl font-semibold text-ink">儲值方案設定</h1>
      <p className="text-xs text-ink-light">
        僅店主可見。金額調整只影響之後新賣出的份數，已購買客人的帳戶餘額不受影響。
      </p>

      {message && <p className="text-sm text-olive-dark">{message}</p>}
      {error && <p className="text-sm text-terracotta-dark">{error}</p>}

      <div className="space-y-3">
        {plans.map((plan) => {
          const total = (Number(principalValues[plan.id]) || 0) + (Number(bonusValues[plan.id]) || 0);
          return (
            <div key={plan.id} className="space-y-2 rounded-xl border border-cream-border bg-white p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">{plan.name}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    activeValues[plan.id] ? "bg-olive/10 text-olive-dark" : "bg-cream-dark text-ink-light"
                  }`}
                >
                  {activeValues[plan.id] ? "啟用中" : "已停用"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-ink-muted">儲值本金</span>
                <input
                  type="number"
                  value={principalValues[plan.id] ?? ""}
                  onChange={(e) => setPrincipalValues((prev) => ({ ...prev, [plan.id]: e.target.value }))}
                  className="w-24 rounded-lg border border-cream-border px-2 py-1"
                />
                <span className="text-ink-muted">贈額</span>
                <input
                  type="number"
                  value={bonusValues[plan.id] ?? ""}
                  onChange={(e) => setBonusValues((prev) => ({ ...prev, [plan.id]: e.target.value }))}
                  className="w-24 rounded-lg border border-cream-border px-2 py-1"
                />
              </div>
              <p className="text-xs text-ink-light">帳戶總額：NT$ {total.toLocaleString()}（自動計算，不可編輯）</p>
              <div className="flex items-center gap-3">
                <button
                  disabled={isPending}
                  onClick={() => handleSave(plan.id)}
                  className="rounded-full border border-terracotta px-4 py-1.5 text-xs text-terracotta disabled:opacity-50"
                >
                  儲存
                </button>
                <button
                  disabled={isPending}
                  onClick={() => setActiveValues((prev) => ({ ...prev, [plan.id]: !prev[plan.id] }))}
                  className="rounded-full border border-cream-border px-4 py-1.5 text-xs text-ink-muted disabled:opacity-50"
                >
                  {activeValues[plan.id] ? "停用" : "啟用"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
