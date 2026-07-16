"use client";

import { useState, useTransition } from "react";
import type { MessageTemplate } from "@/lib/line/messageTemplatesData";
import type { NotificationSchedule } from "@/lib/line/messageTemplatesData";
import {
  updateMessageTemplateAction,
  updateNotificationScheduleAction,
  updatePushEnabledAction,
} from "@/app/admin/(ops)/message-templates/_actions";

function TemplateCard({ template }: { template: MessageTemplate }) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(template.content.title);
  const [bodyLines, setBodyLines] = useState(template.content.bodyLines.join("\n"));
  const [footerNote, setFooterNote] = useState(template.content.footerNote ?? "");
  const [buttonText, setButtonText] = useState(template.content.buttonText ?? "");
  const [buttonUrl, setButtonUrl] = useState(template.content.buttonUrl ?? "");
  const [isActive, setIsActive] = useState(template.isActive);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateMessageTemplateAction(template.id, {
        content: {
          title,
          bodyLines: bodyLines.split("\n").map((l) => l.trim()).filter(Boolean),
          footerNote: footerNote || null,
          buttonText: buttonText || null,
          buttonUrl: buttonUrl || null,
        },
        isActive,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("已儲存");
    });
  }

  return (
    <div className="space-y-2 rounded-xl border border-cream-border bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="font-medium text-ink">{template.name}</p>
        <label className="flex items-center gap-1.5 text-xs text-ink-muted">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          啟用
        </label>
      </div>

      <div>
        <label className="mb-1 block text-xs text-ink-muted">標題</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-cream-border px-3 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-muted">
          內文（每行一句，可用 {"{{name}}"} {"{{date}}"} {"{{startTime}}"} {"{{staffName}}"} {"{{serviceName}}"} 等變數）
        </label>
        <textarea
          value={bodyLines}
          onChange={(e) => setBodyLines(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-cream-border px-3 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-muted">註腳（小字，選填）</label>
        <textarea
          value={footerNote}
          onChange={(e) => setFooterNote(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-cream-border px-3 py-1.5 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-ink-muted">按鈕文字</label>
          <input
            value={buttonText}
            onChange={(e) => setButtonText(e.target.value)}
            className="w-full rounded-lg border border-cream-border px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-ink-muted">按鈕連結變數</label>
          <input
            value={buttonUrl}
            onChange={(e) => setButtonUrl(e.target.value)}
            placeholder="{{memberUrl}}"
            className="w-full rounded-lg border border-cream-border px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-xs text-terracotta-dark">{error}</p>}
      {message && <p className="text-xs text-olive-dark">{message}</p>}

      <button
        disabled={isPending}
        onClick={handleSave}
        className="rounded-full bg-terracotta px-4 py-1.5 text-xs font-medium text-cream disabled:opacity-50"
      >
        儲存
      </button>
    </div>
  );
}

function PushKillSwitch({ initialEnabled }: { initialEnabled: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    setError(null);
    const next = !enabled;
    startTransition(async () => {
      const result = await updatePushEnabledAction(next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEnabled(next);
    });
  }

  return (
    <section
      className={`space-y-2 rounded-xl border p-3 ${enabled ? "border-cream-border bg-white" : "border-terracotta bg-terracotta/10"}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-ink">LINE 推播緊急關閉開關</p>
          <p className="text-xs text-ink-light">
            關閉後所有推播（含建單通知、提醒、關懷）立即停止發送，不用重新部署。僅店主可操作。
          </p>
        </div>
        <span className={`text-xs font-medium ${enabled ? "text-olive-dark" : "text-terracotta-dark"}`}>
          {enabled ? "正常發送中" : "已關閉"}
        </span>
      </div>
      {error && <p className="text-xs text-terracotta-dark">{error}</p>}
      <button
        disabled={isPending}
        onClick={handleToggle}
        className={`rounded-full px-4 py-1.5 text-xs font-medium disabled:opacity-50 ${
          enabled ? "bg-terracotta text-cream" : "bg-olive text-cream"
        }`}
      >
        {enabled ? "立即關閉推播" : "恢復推播"}
      </button>
    </section>
  );
}

export function MessageTemplateSettings({
  templates,
  schedule,
  pushEnabled,
}: {
  templates: MessageTemplate[];
  schedule: NotificationSchedule;
  pushEnabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [reminderTime, setReminderTime] = useState(schedule.reminder_day_before);
  const [revisitTime, setRevisitTime] = useState(schedule.revisit_care);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  function handleSaveSchedule() {
    setScheduleError(null);
    setScheduleMessage(null);
    startTransition(async () => {
      const result = await updateNotificationScheduleAction({
        reminder_day_before: reminderTime,
        revisit_care: revisitTime,
      });
      if (!result.ok) {
        setScheduleError(result.error);
        return;
      }
      setScheduleMessage("已儲存，最慢 15～20 分鐘內生效（cron 執行間隔）");
    });
  }

  return (
    <div className="space-y-5 px-4 py-5 pb-10">
      <h1 className="font-heading text-xl font-semibold text-ink">通知範本與時段設定</h1>
      <p className="text-xs text-ink-light">僅店主可見。調整範本內容或發送時段，最慢 15～20 分鐘內生效，不用重新部署。</p>

      <PushKillSwitch initialEnabled={pushEnabled} />

      <section className="space-y-2 rounded-xl border border-cream-border bg-white p-3">
        <p className="text-sm font-medium text-ink">發送時段</p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-ink-muted">
            前一日提醒
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="rounded-lg border border-cream-border px-2 py-1 text-sm"
            />
          </label>
          <label className="flex items-center gap-1.5 text-sm text-ink-muted">
            隔日回訪關懷
            <input
              type="time"
              value={revisitTime}
              onChange={(e) => setRevisitTime(e.target.value)}
              className="rounded-lg border border-cream-border px-2 py-1 text-sm"
            />
          </label>
        </div>
        {scheduleError && <p className="text-xs text-terracotta-dark">{scheduleError}</p>}
        {scheduleMessage && <p className="text-xs text-olive-dark">{scheduleMessage}</p>}
        <button
          disabled={isPending}
          onClick={handleSaveSchedule}
          className="rounded-full bg-terracotta px-4 py-1.5 text-xs font-medium text-cream disabled:opacity-50"
        >
          儲存時段
        </button>
      </section>

      <section className="space-y-3">
        <p className="text-sm font-medium text-ink">範本內容</p>
        {templates.map((t) => (
          <TemplateCard key={t.id} template={t} />
        ))}
      </section>
    </div>
  );
}
