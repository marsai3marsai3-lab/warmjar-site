/**
 * 付款組合驗證：Σ checkout_payments + deposit_applied 必須精確等於
 * total_paid_amount 才能送出結帳（見 docs/phase-4-checkout-draft.md
 * 1.3）——不做差額自動吸收，對不上就是對不上，逼店員自己核對清楚。
 */
export function isPaymentComplete(
  paymentsTotal: number,
  depositApplied: number,
  totalPaidAmount: number
): boolean {
  return paymentsTotal + depositApplied === totalPaidAmount;
}

export function remainingDue(totalPaidAmount: number, depositApplied: number, paymentsTotal: number): number {
  return totalPaidAmount - depositApplied - paymentsTotal;
}

/**
 * checkouts.payment_method 是「由 checkout_payments 推導」的顯示欄位
 * （見 docs/phase-4-checkout-draft.md 1.3），不是使用者直接輸入的值。
 * 空陣列代表訂金全額折抵、沒有收任何新款項——這種情況專用 'deposit'
 * 這個值（2026-07-12 migration 補的 CHECK 約束）。
 */
export function derivePaymentMethod(payments: { method: string }[]): string {
  if (payments.length === 0) return "deposit";
  const distinctMethods = new Set(payments.map((p) => p.method));
  return distinctMethods.size === 1 ? [...distinctMethods][0] : "mixed";
}
