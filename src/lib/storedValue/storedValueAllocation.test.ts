import { describe, expect, it } from "vitest";
import { allocateStoredValueDeduction } from "./storedValueAllocation";

describe("allocateStoredValueDeduction", () => {
  it("173) 贈額足夠時優先全部扣贈額，本金不動", () => {
    expect(allocateStoredValueDeduction(500, 8200, 500)).toEqual({ bonusUsed: 500, principalUsed: 0 });
  });

  it("174) 贈額不夠時，先扣完贈額，剩下的才扣本金", () => {
    expect(allocateStoredValueDeduction(1200, 8200, 500)).toEqual({ bonusUsed: 500, principalUsed: 700 });
  });

  it("175) 金額剛好等於贈額，本金完全不動", () => {
    expect(allocateStoredValueDeduction(500, 8200, 500)).toEqual({ bonusUsed: 500, principalUsed: 0 });
  });

  it("176) 沒有贈額時全部從本金扣", () => {
    expect(allocateStoredValueDeduction(1000, 8200, 0)).toEqual({ bonusUsed: 0, principalUsed: 1000 });
  });

  it("177) 金額為 0 時兩者都不扣", () => {
    expect(allocateStoredValueDeduction(0, 8200, 500)).toEqual({ bonusUsed: 0, principalUsed: 0 });
  });

  it("178) 全部扣抵（金額等於總餘額）時精確扣光，不多不少", () => {
    const result = allocateStoredValueDeduction(8700, 8200, 500);
    expect(result).toEqual({ bonusUsed: 500, principalUsed: 8200 });
    expect(result.bonusUsed + result.principalUsed).toBe(8700);
  });
});
