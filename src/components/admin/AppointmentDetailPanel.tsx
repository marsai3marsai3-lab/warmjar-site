"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import {
  availableAppointmentActions,
  canRescheduleAppointment,
  type AppointmentAdminAction,
} from "@/lib/admin/appointmentActions";
import { DEPOSIT_STATUS_LABEL, STATUS_LABEL } from "@/lib/admin/labels";
import type { CalendarAppointment } from "@/lib/admin/calendarData";
import { performAppointmentAction, waiveAppointmentDeposit } from "@/app/admin/(ops)/calendar/_actions";
import { RescheduleDialog } from "./RescheduleDialog";

const ACTION_CONFIRM_MESSAGE: Record<AppointmentAdminAction, string> = {
  check_in: "確定要標記這筆預約為已報到嗎？",
  complete: "確定要標記這筆預約為已完成嗎？",
  no_show: "確定要標記這筆預約為爽約嗎？這會影響顧客下次預約是否需要收訂金。",
  cancel: "確定要取消這筆預約嗎？",
};

type AppointmentDetailPanelProps = {
  appointment: CalendarAppointment;
  onClose: () => void;
};

export function AppointmentDetailPanel({ appointment, onClose }: AppointmentDetailPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showWaiveConfirm, setShowWaiveConfirm] = useState(false);
  const [waiveReason, setWaiveReason] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);

  const actions = availableAppointmentActions(appointment.status, !!appointment.checkedInAt);
  const canReschedule = canRescheduleAppointment(appointment.status, !!appointment.checkedInAt);

  function handleAction(action: AppointmentAdminAction) {
    if (!window.confirm(ACTION_CONFIRM_MESSAGE[action])) return;
    setError(null);
    startTransition(async () => {
      const result = await performAppointmentAction(appointment.id, action);
      if (!result.ok) setError(result.error);
      else onClose();
    });
  }

  function handleWaive() {
    setError(null);
    startTransition(async () => {
      const result = await waiveAppointmentDeposit(appointment.id, waiveReason || undefined);
      if (!result.ok) setError(result.error);
      else onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/30 sm:items-center sm:justify-end"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 sm:h-full sm:w-96 sm:max-h-none sm:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-ink">預約詳情</h2>
          <button onClick={onClose} aria-label="關閉">
            <X size={20} />
          </button>
        </div>

        <div className="mb-5 space-y-2 text-sm">
          <Row
            label="客人"
            value={appointment.customerPhone ? `${appointment.customerName}・${appointment.customerPhone}` : appointment.customerName}
          />
          <Row label="服務" value={`${appointment.serviceName}・NT$ ${appointment.faceValue.toLocaleString()}`} />
          <Row label="師傅" value={appointment.staffName} />
          <Row label="時間" value={`${appointment.date} ${appointment.startTime}–${appointment.endTime}`} />
          <Row label="狀態" value={STATUS_LABEL[appointment.status] ?? appointment.status} />
          {appointment.checkedInAt && (
            <Row
              label="報到時間"
              value={new Date(appointment.checkedInAt).toLocaleTimeString("zh-TW", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
          )}
          {appointment.customerNote && <Row label="備註" value={appointment.customerNote} />}
        </div>

        {appointment.deposit && (
          <div className="mb-5 space-y-1 rounded-xl border border-cream-border p-3 text-sm">
            <p className="mb-1 font-medium text-ink">訂金</p>
            <Row label="狀態" value={DEPOSIT_STATUS_LABEL[appointment.deposit.status] ?? appointment.deposit.status} />
            <Row label="金額" value={`NT$ ${appointment.deposit.amount.toLocaleString()}`} />
            {appointment.deposit.status === "pending" && appointment.expiresAt && (
              <Row
                label="保留到期時間"
                value={new Date(appointment.expiresAt).toLocaleString("zh-TW", {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
            )}
            {appointment.deposit.ecpayTradeNo ? (
              <Row label="ECPay 交易號" value={appointment.deposit.ecpayTradeNo} />
            ) : (
              <Row label="訂單編號" value={appointment.deposit.merchantTradeNo} />
            )}
          </div>
        )}

        {/* pending_deposit 理論上一定有對應的 deposit_records（見
            create-appointment/route.ts 建立時的不變量），但這裡曾經因為
            舊資料（Phase 3-1 之前建立的預約）打破這個不變量而讓整個訂金
            區塊悄悄消失、連帶免收訂金按鈕也不見。改成明確顯示異常狀態，
            不要再靜默省略。 */}
        {appointment.status === "pending_deposit" && !appointment.deposit && (
          <div className="mb-5 rounded-xl border border-terracotta-dark/40 bg-terracotta/5 p-3 text-sm text-terracotta-dark">
            這筆預約狀態是「待付訂金」，但找不到對應的訂金紀錄，資料可能不一致，請聯繫工程師確認。
          </div>
        )}

        {error && <p className="mb-3 text-sm text-terracotta-dark">{error}</p>}

        <div className="space-y-2">
          {canReschedule && (
            <button
              onClick={() => setShowReschedule(true)}
              className="w-full rounded-full border border-cream-border py-2.5 text-sm font-medium text-ink transition-colors hover:border-terracotta"
            >
              改期/換師傅
            </button>
          )}

          {actions.map(({ action, label }) => (
            <button
              key={action}
              disabled={isPending}
              onClick={() => handleAction(action)}
              className="w-full rounded-full border border-cream-border py-2.5 text-sm font-medium text-ink transition-colors hover:border-terracotta disabled:opacity-50"
            >
              {label}
            </button>
          ))}

          {appointment.deposit?.status === "pending" &&
            (showWaiveConfirm ? (
              <div className="space-y-2 rounded-xl border border-gold/40 bg-gold/5 p-3">
                <input
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  placeholder="原因（選填）"
                  className="w-full rounded-lg border border-cream-border px-3 py-2 text-sm outline-none focus:border-terracotta"
                />
                <div className="flex gap-2">
                  <button
                    disabled={isPending}
                    onClick={handleWaive}
                    className="flex-1 rounded-full bg-gold py-2 text-sm font-medium text-cream disabled:opacity-50"
                  >
                    確認免收
                  </button>
                  <button
                    onClick={() => setShowWaiveConfirm(false)}
                    className="flex-1 rounded-full border border-cream-border py-2 text-sm text-ink-muted"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <button
                disabled={isPending}
                onClick={() => setShowWaiveConfirm(true)}
                className="w-full rounded-full border border-gold py-2.5 text-sm font-medium text-gold-light disabled:opacity-50"
              >
                人工免收訂金
              </button>
            ))}

          {actions.length === 0 && !canReschedule && !appointment.deposit && (
            <p className="text-center text-sm text-ink-light">這筆預約已是最終狀態，沒有可操作項目。</p>
          )}
        </div>
      </div>

      {showReschedule && (
        <RescheduleDialog
          appointmentId={appointment.id}
          serviceVariantId={appointment.serviceVariantId}
          currentDate={appointment.date}
          currentStaffId={appointment.staffId}
          onClose={() => setShowReschedule(false)}
          onSuccess={() => {
            setShowReschedule(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="shrink-0 text-ink-light">{label}</span>
      <span className="text-right text-ink">{value}</span>
    </div>
  );
}
