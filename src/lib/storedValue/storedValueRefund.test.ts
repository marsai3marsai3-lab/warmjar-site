import { describe, expect, it } from "vitest";
import { canShowStoredValueRefundButton } from "./storedValueRefund";

describe("canShowStoredValueRefundButton", () => {
  it("179) owner + 本金餘額 > 0：顯示退費按鈕", () => {
    expect(canShowStoredValueRefundButton(true, 8200)).toBe(true);
  });

  it("180) owner + 本金餘額 = 0：不顯示（即使贈額還有餘額，也不該用退費清掉它）", () => {
    expect(canShowStoredValueRefundButton(true, 0)).toBe(false);
  });

  it("181) manager + 本金餘額 > 0：不顯示（權限不足）", () => {
    expect(canShowStoredValueRefundButton(false, 8200)).toBe(false);
  });

  it("182) manager + 本金餘額 = 0：不顯示（雙重不符）", () => {
    expect(canShowStoredValueRefundButton(false, 0)).toBe(false);
  });
});
