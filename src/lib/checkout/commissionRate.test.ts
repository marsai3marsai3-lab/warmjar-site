import { describe, expect, it } from "vitest";
import { calculateCommissionAmount, resolveCommissionRate } from "./commissionRate";

describe("resolveCommissionRate", () => {
  it("130) 有師傅×服務個別覆蓋時優先採用，來源標為 staff_service_override", () => {
    expect(
      resolveCommissionRate({ staffServiceOverride: 45, serviceDefaultRate: 40, staffDefaultRate: 35 })
    ).toEqual({ rate: 45, source: "staff_service_override" });
  });

  it("131) 沒有個別覆蓋時採服務預設值，來源標為 service_default", () => {
    expect(
      resolveCommissionRate({ staffServiceOverride: null, serviceDefaultRate: 40, staffDefaultRate: 35 })
    ).toEqual({ rate: 40, source: "service_default" });
  });

  it("132) 個別覆蓋與服務預設都沒有時才落到師傅保底，來源標為 staff_default", () => {
    expect(
      resolveCommissionRate({ staffServiceOverride: null, serviceDefaultRate: null, staffDefaultRate: 35 })
    ).toEqual({ rate: 35, source: "staff_default" });
  });

  it("133) undefined 視同沒有設定，等同 null 的行為", () => {
    expect(
      resolveCommissionRate({
        staffServiceOverride: undefined,
        serviceDefaultRate: undefined,
        staffDefaultRate: 35,
      })
    ).toEqual({ rate: 35, source: "staff_default" });
  });

  it("134) 覆蓋值為 0 時仍視為「有設定」，不會被當成 null 跳過（0% 是合法費率）", () => {
    expect(
      resolveCommissionRate({ staffServiceOverride: 0, serviceDefaultRate: 40, staffDefaultRate: 35 })
    ).toEqual({ rate: 0, source: "staff_service_override" });
  });
});

describe("calculateCommissionAmount — 鐵律：只看 face_value，與實付金額無關", () => {
  it("135) 正常無折扣：面額 2280、40% 抽成 → 912", () => {
    expect(calculateCommissionAmount(2280, 40)).toBe(912);
  });

  it("136) 【鐵律】客人打對折實付 1140，抽成仍用面額 2280 計算，結果跟沒打折時完全一樣", () => {
    const faceValue = 2280;
    const paidAmountAfterDiscount = 1140; // 實付金額，刻意不傳進計算式
    const commission = calculateCommissionAmount(faceValue, 40);
    expect(commission).toBe(912);
    expect(commission).not.toBe(calculateCommissionAmount(paidAmountAfterDiscount, 40));
  });

  it("137) 抽成金額四捨五入到整數元", () => {
    expect(calculateCommissionAmount(999, 33)).toBe(330); // 999*0.33=329.67 → 330
  });

  it("138) 0% 抽成率合法，結果為 0", () => {
    expect(calculateCommissionAmount(2280, 0)).toBe(0);
  });
});
