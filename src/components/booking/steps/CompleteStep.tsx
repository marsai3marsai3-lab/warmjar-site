"use client";

import { CheckCircle2, Clock, CreditCard } from "lucide-react";
import type { BookingResult, SelectedVariant } from "../types";

type CompleteStepProps = {
  result: BookingResult;
  selectedVariants: SelectedVariant[];
  staffName: string;
};

export function CompleteStep({ result, selectedVariants, staffName }: CompleteStepProps) {
  const totalPrice = selectedVariants.reduce((sum, v) => sum + v.price, 0);
  const depositDeadline = new Date(result.depositExpiresAt);

  return (
    <div className="px-4 py-10 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-olive/10 text-olive">
        <CheckCircle2 size={36} />
      </div>
      <h2 className="font-heading text-2xl font-semibold text-ink mb-2">預約已送出</h2>
      <p className="text-ink-muted text-sm mb-8">
        我們已經為您保留時段，請於期限內完成付款以確認預約。
      </p>

      <div className="mx-auto max-w-sm rounded-2xl border border-cream-border bg-white p-5 text-left space-y-3">
        <div className="flex justify-between gap-4 text-sm">
          <span className="shrink-0 text-ink-light">服務項目</span>
          <span className="text-right font-medium text-ink">
            {selectedVariants.map((v) => v.name).join("、")}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-ink-light">師傅</span>
          <span className="font-medium text-ink">{staffName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-ink-light">時間</span>
          <span className="font-medium text-ink">
            {result.date} {result.startTime}
          </span>
        </div>
        <div className="flex justify-between border-t border-cream-border pt-3 text-sm">
          <span className="text-ink-light">預估金額</span>
          <span className="font-medium text-ink">NT$ {totalPrice.toLocaleString()}</span>
        </div>
      </div>

      <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-gold/40 bg-gold/5 p-5 text-left">
        <div className="mb-2 flex items-center gap-2 text-gold-light">
          <Clock size={18} />
          <span className="text-sm font-medium text-ink">
            待付款・保留至{" "}
            {depositDeadline.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <p className="mb-4 text-xs text-ink-light">
          需先支付訂金 NT$ {result.depositAmount.toLocaleString()}{" "}
          以確認預約，逾時未付款將自動釋出時段。
        </p>
        <button
          type="button"
          disabled
          className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-cream-dark px-6 py-3 text-sm text-ink-light"
        >
          <CreditCard size={16} />
          線上付款（即將開放）
        </button>
      </div>
    </div>
  );
}
