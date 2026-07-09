"use client";

import { useState, useTransition } from "react";
import { markDepositRefunded } from "@/app/admin/(ops)/calendar/_actions";

const CONFIRM_MESSAGE =
  "確定要標記這筆訂金為已退款嗎？此按鈕只更新紀錄狀態，實際退款請另外操作 ECPay 後台。";

type RefundDepositButtonProps = {
  depositId: string;
  onSuccess: () => void;
  className?: string;
};

/**
 * 兩個入口共用（AppointmentDetailPanel、會員詳情頁訂金與爽約 tab）——
 * 顯示條件由呼叫端用 canShowRefundButton 決定，這個元件本身只管
 * 「按下去之後做什麼」，避免兩邊各自維護一份確認文案跟呼叫邏輯而
 * 悄悄長歪。
 */
export function RefundDepositButton({ depositId, onSuccess, className }: RefundDepositButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!window.confirm(CONFIRM_MESSAGE)) return;
    setError(null);
    startTransition(async () => {
      const result = await markDepositRefunded(depositId);
      if (!result.ok) setError(result.error);
      else onSuccess();
    });
  }

  return (
    <div>
      <button
        disabled={isPending}
        onClick={handleClick}
        className={className ?? "w-full rounded-full border border-gold py-2.5 text-sm font-medium text-gold-light disabled:opacity-50"}
      >
        標記退款
      </button>
      {error && <p className="mt-1 text-xs text-terracotta-dark">{error}</p>}
    </div>
  );
}
