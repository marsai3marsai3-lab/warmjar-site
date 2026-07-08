// 兩個客人之間的緩衝時間（分鐘），加在整筆預約總時長之後，避免師傅前後場無縫接單。
export const BOOKING_BUFFER_MINUTES = 15;

// 找空檔的時段間隔（分鐘）。
export const SLOT_INTERVAL_MINUTES = 30;

// 需要訂金時，保留時段的時限（分鐘）；訂金金額改由 depositPolicy.ts 依
// 顧客爽約紀錄與服務面額動態計算，不再是固定值。
export const DEPOSIT_HOLD_MINUTES = 30;
