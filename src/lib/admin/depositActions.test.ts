import { describe, expect, it } from "vitest";
import { canMarkDepositRefunded } from "./depositActions";

describe("canMarkDepositRefunded", () => {
  it("102) 只有 status='paid' 可以標記退款", () => {
    expect(canMarkDepositRefunded("paid")).toBe(true);
  });

  it("103) pending/waived/forfeited/failed/refunded 都不能再標退款", () => {
    expect(canMarkDepositRefunded("pending")).toBe(false);
    expect(canMarkDepositRefunded("waived")).toBe(false);
    expect(canMarkDepositRefunded("forfeited")).toBe(false);
    expect(canMarkDepositRefunded("failed")).toBe(false);
    expect(canMarkDepositRefunded("refunded")).toBe(false);
  });
});
