"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CheckoutDetail } from "@/lib/checkout/checkoutData";
import { canShowReopenButton, canShowVoidButton } from "@/lib/checkout/checkoutState";
import { voidCheckout } from "@/app/admin/(ops)/checkout/_actions";

const STATUS_LABEL: Record<string, string> = { completed: "已完成", voided: "已作廢", refunded: "已退款" };
const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "現金",
  ecpay_credit: "刷卡",
  ecpay_transfer: "轉帳",
  stored_value: "儲值",
  coupon: "票券",
  deposit: "訂金折抵",
};

export function CheckoutDetailView({ detail, isOwner }: { detail: CheckoutDetail; isOwner: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleVoid() {
    if (!voidReason.trim()) {
      setError("請填寫作廢原因");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await voidCheckout(detail.id, voidReason.trim());
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4 px-4 py-5 pb-10">
      <Link href="/admin/checkout" className="text-sm text-ink-muted">
        ← 返回
      </Link>

      <div>
        <h1 className="font-heading text-xl font-semibold text-ink">{detail.customerName}</h1>
        <p className="mt-1 text-sm text-ink-light">
          {new Date(detail.checkoutAt).toLocaleString("zh-TW")}・{STATUS_LABEL[detail.status] ?? detail.status}
        </p>
        {detail.status === "voided" && detail.voidReason && (
          <p className="mt-1 text-sm text-terracotta-dark">作廢原因：{detail.voidReason}</p>
        )}
        {detail.reopenedFromCheckoutId && (
          <p className="mt-1 text-xs text-ink-light">
            由{" "}
            <Link href={`/admin/checkout/${detail.reopenedFromCheckoutId}`} className="underline">
              舊單
            </Link>{" "}
            重開
          </p>
        )}
      </div>

      <section className="space-y-2">
        {detail.items.map((item) => (
          <div key={item.id} className="rounded-xl border border-cream-border bg-white p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink">{item.serviceName}</span>
              <span className="text-ink">NT$ {item.paidAmount.toLocaleString()}</span>
            </div>
            <p className="mt-1 text-xs text-ink-light">
              {item.staffName}・面額 NT$ {item.faceValue.toLocaleString()}
              {item.commissionAmount !== null && (
                <>
                  ・抽成 NT$ {item.commissionAmount.toLocaleString()}（{item.commissionRate}%）
                  {item.commissionVoided && "（已作廢）"}
                </>
              )}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-cream-border bg-white p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-muted">面額小計</span>
          <span className="text-ink">NT$ {detail.subtotalFaceValue.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-muted">折讓</span>
          <span className="text-ink">NT$ {detail.discountAmount.toLocaleString()}</span>
        </div>
        {detail.depositApplied > 0 && (
          <div className="flex justify-between">
            <span className="text-ink-muted">訂金折抵</span>
            <span className="text-ink">NT$ {detail.depositApplied.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between font-medium">
          <span className="text-ink">實付合計</span>
          <span className="text-ink">NT$ {detail.totalPaidAmount.toLocaleString()}</span>
        </div>
      </section>

      {detail.payments.length > 0 && (
        <section className="rounded-xl border border-cream-border bg-white p-3 text-sm">
          <p className="mb-1 font-medium text-ink">付款明細</p>
          {detail.payments.map((p) => (
            <div key={p.id} className="flex justify-between">
              <span className="text-ink-muted">{PAYMENT_METHOD_LABEL[p.method] ?? p.method}</span>
              <span className="text-ink">NT$ {p.amount.toLocaleString()}</span>
            </div>
          ))}
        </section>
      )}

      {error && <p className="text-sm text-terracotta-dark">{error}</p>}

      {canShowVoidButton(isOwner, detail.status) &&
        (showVoidConfirm ? (
          <div className="space-y-2 rounded-xl border border-terracotta-dark/40 bg-terracotta/5 p-3">
            <input
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="作廢原因（必填）"
              className="w-full rounded-lg border border-cream-border px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                disabled={isPending}
                onClick={handleVoid}
                className="flex-1 rounded-full bg-terracotta-dark py-2 text-sm font-medium text-cream disabled:opacity-50"
              >
                確認作廢
              </button>
              <button
                onClick={() => setShowVoidConfirm(false)}
                className="flex-1 rounded-full border border-cream-border py-2 text-sm text-ink-muted"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowVoidConfirm(true)}
            className="w-full rounded-full border border-terracotta-dark py-2.5 text-sm font-medium text-terracotta-dark"
          >
            作廢這張結帳單
          </button>
        ))}

      {canShowReopenButton(isOwner, detail.status) && (
        <Link
          href={`/admin/checkout/new?reopenFrom=${detail.id}`}
          className="block w-full rounded-full bg-terracotta py-2.5 text-center text-sm font-medium text-cream"
        >
          重開新單
        </Link>
      )}
    </div>
  );
}
