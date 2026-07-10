import { describe, expect, it } from "vitest";
import { canSendManualNotification, MANUAL_SEND_DAILY_CAP } from "./manualSendPolicy";

describe("canSendManualNotification", () => {
  it("207) 未達每日上限可以送", () => {
    expect(canSendManualNotification(0)).toBe(true);
    expect(canSendManualNotification(MANUAL_SEND_DAILY_CAP - 1)).toBe(true);
  });

  it("208) 達到每日上限不可再送", () => {
    expect(canSendManualNotification(MANUAL_SEND_DAILY_CAP)).toBe(false);
  });

  it("209) 超過上限（理論上不會發生，但防禦性驗證）也是不可送", () => {
    expect(canSendManualNotification(MANUAL_SEND_DAILY_CAP + 1)).toBe(false);
  });
});
