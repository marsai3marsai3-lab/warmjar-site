import { describe, expect, it } from "vitest";
import { allocateCheckoutDiscounts } from "./discountAllocation";
import { calculateCommissionAmount, resolveCommissionRate } from "./commissionRate";

/**
 * CLAUDE.md 商業規則核心：「師傅抽成一律以服務面額計算，與客人實付金額
 * （折扣、儲值優惠、票券折抵後）無關」。這支測試把折扣分攤跟抽成計算
 * 兩個模組串在一起模擬結帳當下實際發生的事，不是分開測試各自的
 * 局部行為——確保兩個模組組合起來，鐵律仍然成立。
 */
describe("鐵律：客人用折扣價付款，抽成仍按 face_value 計算", () => {
  it("167) 單項目打對折，抽成用原始面額算，不是實付金額", () => {
    const faceValue = 2280;
    const rate = resolveCommissionRate({
      staffServiceOverride: null,
      serviceDefaultRate: 40,
      staffDefaultRate: 35,
    });

    const [allocated] = allocateCheckoutDiscounts([{ id: "item-1", faceValue }], {
      type: "percentage",
      value: 50,
    });

    // 客人實付 1140（面額打對折）
    expect(allocated.paidAmount).toBe(1140);
    // 但抽成永遠讀 checkout_items.face_value，不是 paid_amount
    expect(allocated.faceValue).toBe(2280);

    const commission = calculateCommissionAmount(allocated.faceValue, rate.rate);
    expect(commission).toBe(912); // round(2280 * 0.40)

    // 反證：如果錯用 paid_amount 去算，結果會不一樣，明確排除這個錯誤
    const wrongCommission = calculateCommissionAmount(allocated.paidAmount, rate.rate);
    expect(wrongCommission).toBe(456);
    expect(commission).not.toBe(wrongCommission);
  });

  it("168) 多項目、整單折扣、師傅個別覆蓋費率同時存在時，每個項目的抽成仍各自用自己的 face_value 計算", () => {
    const items = [
      { id: "a", faceValue: 2280 }, // 熱石油壓，師傅甲有個別覆蓋 45%
      { id: "b", faceValue: 1280 }, // 肩背舒放，走服務預設 40%
    ];
    const allocated = allocateCheckoutDiscounts(items, { type: "amount", value: 500 });

    const rateA = resolveCommissionRate({ staffServiceOverride: 45, serviceDefaultRate: 40, staffDefaultRate: 35 });
    const rateB = resolveCommissionRate({ staffServiceOverride: null, serviceDefaultRate: 40, staffDefaultRate: 35 });

    const itemA = allocated.find((i) => i.id === "a")!;
    const itemB = allocated.find((i) => i.id === "b")!;

    // 折扣後兩項合計實付 = 3560 - 500 = 3060，但 face_value 完全不受影響
    expect(itemA.faceValue).toBe(2280);
    expect(itemB.faceValue).toBe(1280);
    expect(itemA.paidAmount + itemB.paidAmount).toBe(3060);

    expect(calculateCommissionAmount(itemA.faceValue, rateA.rate)).toBe(1026); // round(2280*0.45)
    expect(calculateCommissionAmount(itemB.faceValue, rateB.rate)).toBe(512); // round(1280*0.40)
  });
});
