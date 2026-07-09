/**
 * Phase 3-3 C.2：退款標記只能從「已付款」轉「已退款」。已經是 waived/
 * forfeited/failed/refunded 的紀錄不能再標一次，pending 的更不用說
 * （還沒收到錢，談不上退款——應該用免收訂金那個既有的動作）。
 */
export function canMarkDepositRefunded(status: string): boolean {
  return status === "paid";
}
