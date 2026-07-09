import { describe, expect, it } from "vitest";
import { allocateCheckoutDiscounts, applyDiscount } from "./discountAllocation";

describe("applyDiscount", () => {
  it("119) 沒有折扣時原封不動", () => {
    expect(applyDiscount(1000, null)).toBe(1000);
    expect(applyDiscount(1000, undefined)).toBe(1000);
  });

  it("120) 金額折扣直接扣減", () => {
    expect(applyDiscount(1000, { type: "amount", value: 200 })).toBe(800);
  });

  it("121) 百分比折扣四捨五入到整數", () => {
    // 2280 打 9 折 = 2052，整除；999 打 9 折 = 899.1 → 四捨五入 899
    expect(applyDiscount(2280, { type: "percentage", value: 10 })).toBe(2052);
    expect(applyDiscount(999, { type: "percentage", value: 10 })).toBe(899);
  });

  it("122) 折扣超過金額本身時，結果不會變負數，最低是 0", () => {
    expect(applyDiscount(500, { type: "amount", value: 999 })).toBe(0);
    expect(applyDiscount(500, { type: "percentage", value: 150 })).toBe(0);
  });
});

describe("allocateCheckoutDiscounts", () => {
  it("123) 沒有任何折扣：paidAmount 等於 faceValue，faceValue 原封不動", () => {
    const result = allocateCheckoutDiscounts([
      { id: "a", faceValue: 2280 },
      { id: "b", faceValue: 1280 },
    ]);
    expect(result).toEqual([
      { id: "a", faceValue: 2280, paidAmount: 2280 },
      { id: "b", faceValue: 1280, paidAmount: 1280 },
    ]);
  });

  it("124) 只有整單折扣，沒有項目折扣：能整除的案例分攤結果精確", () => {
    const result = allocateCheckoutDiscounts(
      [
        { id: "a", faceValue: 2280 },
        { id: "b", faceValue: 1280 },
      ],
      { type: "percentage", value: 50 }
    );
    expect(result).toEqual([
      { id: "a", faceValue: 2280, paidAmount: 1140 },
      { id: "b", faceValue: 1280, paidAmount: 640 },
    ]);
  });

  it("125) 整單折扣分攤不整除時，用最大餘數法把差額分給餘數最大的項目，加總精確等於應收總額", () => {
    const result = allocateCheckoutDiscounts(
      [
        { id: "a", faceValue: 100 },
        { id: "b", faceValue: 100 },
        { id: "c", faceValue: 100 },
      ],
      { type: "amount", value: 1 } // 300 - 1 = 299，299/3 除不盡
    );
    const total = result.reduce((sum, r) => sum + r.paidAmount, 0);
    expect(total).toBe(299);
    // 三個項目餘數相同（穩定排序，依原始順序分配差額），前兩個各補 1 元
    expect(result).toEqual([
      { id: "a", faceValue: 100, paidAmount: 100 },
      { id: "b", faceValue: 100, paidAmount: 100 },
      { id: "c", faceValue: 100, paidAmount: 99 },
    ]);
  });

  it("126) 項目折扣 + 整單折扣疊加，face_value 全程不變", () => {
    const result = allocateCheckoutDiscounts(
      [{ id: "a", faceValue: 2280, itemDiscount: { type: "percentage", value: 50 } }],
      { type: "amount", value: 100 }
    );
    // 2280 打 5 折 = 1140，再減 100 = 1040
    expect(result).toEqual([{ id: "a", faceValue: 2280, paidAmount: 1040 }]);
  });

  it("127) 項目折扣把所有項目打到 0 時，整單折扣沒有基礎可分攤，維持 0（不是錯誤）", () => {
    const result = allocateCheckoutDiscounts(
      [{ id: "a", faceValue: 500, itemDiscount: { type: "amount", value: 9999 } }],
      { type: "percentage", value: 50 }
    );
    expect(result).toEqual([{ id: "a", faceValue: 500, paidAmount: 0 }]);
  });

  it("128) 空陣列回傳空陣列", () => {
    expect(allocateCheckoutDiscounts([])).toEqual([]);
  });

  it("129) 單一項目時整單折扣直接套用，不需要分攤運算", () => {
    const result = allocateCheckoutDiscounts([{ id: "a", faceValue: 999 }], {
      type: "percentage",
      value: 33,
    });
    expect(result).toEqual([{ id: "a", faceValue: 999, paidAmount: 669 }]); // round(999*0.67)=669
  });
});
