// 兩個客人之間的緩衝時間（分鐘），加在整筆預約總時長之後，避免師傅前後場無縫接單。
export const BOOKING_BUFFER_MINUTES = 15;

// 找空檔的時段間隔（分鐘）。
export const SLOT_INTERVAL_MINUTES = 30;

// 線上預約一律視為需要定金保留時段（見 CLAUDE.md no-show 觀察），
// 這裡先用固定值佔位；依服務別/儲值方案調整定金金額留待後續 phase。
export const DEPOSIT_HOLD_MINUTES = 30;
export const DEPOSIT_PLACEHOLDER_AMOUNT = 300;
