export function isCustomerBlacklisted(status: string | null | undefined): boolean {
  return status === "blacklisted";
}

/**
 * Phase 3-3 需求 B.4：黑名單開啟時 /book 一律回「無可預約時段」，不明示
 * 被封鎖。這裡固定回傳跟真的撞單（SLOT_ALREADY_BOOKED）完全相同的訊息
 * 與 code，讓 create-appointment 對黑名單客人的回應跟「這時段剛好被搶走」
 * 在客戶端無法區分——沿用同一個常數，兩個分支不會意外長出不同的文案。
 */
export const SLOT_UNAVAILABLE_RESPONSE = {
  error: "此時段剛被預約，請重新選擇",
  code: "SLOT_ALREADY_BOOKED",
} as const;
