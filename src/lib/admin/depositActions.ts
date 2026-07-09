/**
 * Phase 3-3 C.2：退款標記只能從「已付款」轉「已退款」。已經是 waived/
 * forfeited/failed/refunded 的紀錄不能再標一次，pending 的更不用說
 * （還沒收到錢，談不上退款——應該用免收訂金那個既有的動作）。
 */
export function canMarkDepositRefunded(status: string): boolean {
  return status === "paid";
}

/**
 * 單一判斷來源，兩個 UI 入口（AppointmentDetailPanel、會員詳情頁的
 * 訂金與爽約 tab）都呼叫這個決定要不要渲染「標記退款」按鈕，不要
 * 各自寫一份 `isOwner && status === "paid"`——上一輪就是因為
 * AppointmentDetailPanel 那邊根本沒接 isOwner、也沒有這個按鈕，
 * 兩個入口各自為政才漏掉的。UI 層永遠呼叫這個函式，Server Action
 * 那層再用 canMarkDepositRefunded 獨立驗證一次（見
 * calendar/_actions.ts 的 markDepositRefunded）——按鈕看不看得到
 * 跟能不能真的執行是兩件事，各自都要擋。
 */
export function canShowRefundButton(isOwner: boolean, depositStatus: string): boolean {
  return isOwner && canMarkDepositRefunded(depositStatus);
}
