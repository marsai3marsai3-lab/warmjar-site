import { describe, expect, it } from "vitest";
import { isCustomerBlacklisted, SLOT_UNAVAILABLE_RESPONSE } from "./blacklistPolicy";

describe("isCustomerBlacklisted", () => {
  it("92) status 為 'blacklisted' 時回傳 true", () => {
    expect(isCustomerBlacklisted("blacklisted")).toBe(true);
  });

  it("93) status 為 'active'/'inactive' 時回傳 false", () => {
    expect(isCustomerBlacklisted("active")).toBe(false);
    expect(isCustomerBlacklisted("inactive")).toBe(false);
  });

  it("94) status 為 null/undefined（新客人、尚無 customers 資料列）時回傳 false", () => {
    expect(isCustomerBlacklisted(null)).toBe(false);
    expect(isCustomerBlacklisted(undefined)).toBe(false);
  });
});

describe("SLOT_UNAVAILABLE_RESPONSE", () => {
  it("95) 黑名單擋下與真的撞單用同一組訊息/code，客戶端無法區分兩種情況", () => {
    expect(SLOT_UNAVAILABLE_RESPONSE).toEqual({
      error: "此時段剛被預約，請重新選擇",
      code: "SLOT_ALREADY_BOOKED",
    });
  });
});
