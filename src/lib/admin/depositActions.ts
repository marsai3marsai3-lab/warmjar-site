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

/**
 * Phase 4 §5.2 決策：訂金沒收不是自動的，是標記爽約時附帶的手動確認
 * 選項。只有 status='paid' 的訂金才有沒收的意義（沒收的前提是錢已經
 * 收到手上）——跟 canMarkDepositRefunded 條件剛好一樣，但這是兩個
 * 不同的業務動作（沒收 vs 退款，各自互斥的終態路徑），刻意各自命名，
 * 不共用同一個函式，避免以後其中一個的規則改了卻忘記另一個其實語意
 * 不同。
 */
export function canForfeitDeposit(status: string): boolean {
  return status === "paid";
}
