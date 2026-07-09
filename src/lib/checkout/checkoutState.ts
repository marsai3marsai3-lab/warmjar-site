/**
 * 作廢重開狀態機（見 docs/phase-4-checkout-draft.md 3.3）：
 * completed --(owner: 作廢)--> voided --(owner: 重開)--> 建立新 checkout。
 * `refunded` 狀態 schema 已有但這輪不實作（見草案 3.3 說明），不在這裡
 * 判斷允不允許，交給之後有明確需求時再設計。
 */
export function canVoidCheckout(status: string): boolean {
  return status === "completed";
}

export function canReopenCheckout(status: string): boolean {
  return status === "voided";
}

export function canShowVoidButton(isOwner: boolean, status: string): boolean {
  return isOwner && canVoidCheckout(status);
}

export function canShowReopenButton(isOwner: boolean, status: string): boolean {
  return isOwner && canReopenCheckout(status);
}

/**
 * A.1：只有 completed，或 confirmed 且已報到的預約可以帶入結帳——單一
 * 判斷來源，AppointmentDetailPanel（要不要顯示「結帳」按鈕）跟
 * checkoutData.ts 的 fetchSameDayCheckoutCandidates（同店到訪要撈哪些
 * 預約進來）都呼叫這個，不要兩處各自維護一份條件。
 */
export function canBringIntoCheckout(status: string, isCheckedIn: boolean): boolean {
  return status === "completed" || (status === "confirmed" && isCheckedIn);
}
