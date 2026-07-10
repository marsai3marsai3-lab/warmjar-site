export const CUSTOMER_CANCEL_CUTOFF_MINUTES = 60;
export const CUSTOMER_CANCEL_SUPPORT_PHONE = "0979-050-630";

const CANCELLABLE_STATUSES = new Set(["confirmed", "pending_deposit"]);

export function canCustomerCancelAppointment(status: string, startAt: Date, now: Date = new Date()): boolean {
  if (!CANCELLABLE_STATUSES.has(status)) return false;
  return startAt.getTime() - now.getTime() > CUSTOMER_CANCEL_CUTOFF_MINUTES * 60 * 1000;
}

export type CancelButtonState =
  | { kind: "cancellable" }
  | { kind: "too_close"; message: string }
  | { kind: "not_cancellable" };

/**
 * Phase 6 A.7 決策：1 小時內不是把按鈕藏起來，是轉成 disabled + 給人工
 * 出路的文字（「請來電 0979-050-630」）——跟一般「條件不符就不顯示」
 * 的既有慣例不同，這裡刻意要讓客人知道「還有路可以走」，不是走進死路。
 */
export function resolveCancelButtonState(status: string, startAt: Date, now: Date = new Date()): CancelButtonState {
  if (!CANCELLABLE_STATUSES.has(status)) return { kind: "not_cancellable" };
  if (startAt.getTime() - now.getTime() > CUSTOMER_CANCEL_CUTOFF_MINUTES * 60 * 1000) {
    return { kind: "cancellable" };
  }
  return {
    kind: "too_close",
    message: `距預約開始不足 1 小時，如需取消請來電 ${CUSTOMER_CANCEL_SUPPORT_PHONE}`,
  };
}
