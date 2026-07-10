"use client";

import { useState, useTransition } from "react";
import { sendManualNotification } from "@/app/admin/(ops)/members/_actions";
import { canSendManualNotification, MANUAL_SEND_DAILY_CAP } from "@/lib/admin/manualSendPolicy";

type TemplateOption = { key: string; name: string };

export function SendLineMessageDialog({
  customerId,
  templates,
  sentTodayCount,
  onClose,
  onSuccess,
}: {
  customerId: string;
  templates: TemplateOption[];
  sentTodayCount: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedKey, setSelectedKey] = useState<string>(templates[0]?.key ?? "");
  const [error, setError] = useState<string | null>(null);

  const canSend = canSendManualNotification(sentTodayCount);

  function handleSend() {
    if (!selectedKey) return;
    setError(null);
    startTransition(async () => {
      const result = await sendManualNotification(customerId, selectedKey);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSuccess();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-4 sm:rounded-2xl">
        <h2 className="font-heading text-lg font-semibold text-ink">發送 LINE 訊息</h2>

        <p className="mt-1 text-xs text-ink-light">
          今天已發送 {sentTodayCount} / {MANUAL_SEND_DAILY_CAP} 則
        </p>

        {!canSend && (
          <p className="mt-2 rounded-lg bg-terracotta/10 px-3 py-2 text-sm text-terracotta-dark">
            今天已達每日發送上限，請明天再發送。
          </p>
        )}

        {templates.length === 0 && <p className="mt-3 text-sm text-ink-light">目前沒有已啟用的範本。</p>}

        {canSend && templates.length > 0 && (
          <div className="mt-3 space-y-2">
            {templates.map((t) => (
              <label
                key={t.key}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  selectedKey === t.key ? "border-terracotta bg-terracotta/5" : "border-cream-border"
                }`}
              >
                <input
                  type="radio"
                  name="template"
                  checked={selectedKey === t.key}
                  onChange={() => setSelectedKey(t.key)}
                />
                {t.name}
              </label>
            ))}
          </div>
        )}

        {error && <p className="mt-2 text-sm text-terracotta-dark">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-cream-border py-2 text-sm text-ink-muted">
            取消
          </button>
          <button
            disabled={!canSend || !selectedKey || isPending}
            onClick={handleSend}
            className="flex-1 rounded-full bg-terracotta py-2 text-sm font-medium text-cream disabled:opacity-50"
          >
            送出
          </button>
        </div>
      </div>
    </div>
  );
}
