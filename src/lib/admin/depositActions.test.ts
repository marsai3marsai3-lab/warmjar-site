import { describe, expect, it } from "vitest";
import { canForfeitDeposit, canMarkDepositRefunded, canShowRefundButton } from "./depositActions";

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

describe("canShowRefundButton", () => {
  it("115) owner + paid：顯示按鈕", () => {
    expect(canShowRefundButton(true, "paid")).toBe(true);
  });

  it("116) manager + paid：不顯示（權限不足，即使狀態符合）", () => {
    expect(canShowRefundButton(false, "paid")).toBe(false);
  });

  it("117) owner + 非 paid 狀態：不顯示（狀態不符，即使是 owner）", () => {
    expect(canShowRefundButton(true, "pending")).toBe(false);
    expect(canShowRefundButton(true, "refunded")).toBe(false);
    expect(canShowRefundButton(true, "waived")).toBe(false);
  });

  it("118) manager + 非 paid：不顯示（雙重不符）", () => {
    expect(canShowRefundButton(false, "pending")).toBe(false);
  });
});

describe("canForfeitDeposit", () => {
  it("153) 只有 status='paid' 可以沒收", () => {
    expect(canForfeitDeposit("paid")).toBe(true);
  });

  it("154) pending/waived/forfeited/failed/refunded 都不能沒收", () => {
    expect(canForfeitDeposit("pending")).toBe(false);
    expect(canForfeitDeposit("waived")).toBe(false);
    expect(canForfeitDeposit("forfeited")).toBe(false);
    expect(canForfeitDeposit("failed")).toBe(false);
    expect(canForfeitDeposit("refunded")).toBe(false);
  });
});
