// 決策 3：手動單發訊息，同一客人每日上限 3 則，超過時按鈕禁用。
export const MANUAL_SEND_DAILY_CAP = 3;

export function canSendManualNotification(sentTodayCount: number): boolean {
  return sentTodayCount < MANUAL_SEND_DAILY_CAP;
}
