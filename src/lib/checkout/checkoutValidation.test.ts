import { describe, expect, it } from "vitest";
import { derivePaymentMethod, isPaymentComplete, remainingDue } from "./checkoutValidation";

describe("isPaymentComplete", () => {
  it("139) 付款總額＋訂金折抵精確等於應收金額時回傳 true", () => {
    expect(isPaymentComplete(1640, 640, 2280)).toBe(true);
  });

  it("140) 差 1 元也不行，一律擋下，不做自動吸收誤差", () => {
    expect(isPaymentComplete(1639, 640, 2280)).toBe(false);
    expect(isPaymentComplete(1641, 640, 2280)).toBe(false);
  });

  it("141) 全額訂金折抵、現場不用再收款的邊界案例", () => {
    expect(isPaymentComplete(0, 2280, 2280)).toBe(true);
  });

  it("142) 沒有訂金折抵時，付款總額本身要等於應收金額", () => {
    expect(isPaymentComplete(2280, 0, 2280)).toBe(true);
    expect(isPaymentComplete(2000, 0, 2280)).toBe(false);
  });
});

describe("remainingDue", () => {
  it("143) 計算尚需收款金額", () => {
    expect(remainingDue(2280, 640, 0)).toBe(1640);
  });

  it("144) 已付清時回傳 0", () => {
    expect(remainingDue(2280, 640, 1640)).toBe(0);
  });
});

describe("derivePaymentMethod", () => {
  it("157) 沒有任何付款方式（訂金全額折抵）時回傳 'deposit'", () => {
    expect(derivePaymentMethod([])).toBe("deposit");
  });

  it("158) 只有一種付款方式時回傳該方式本身", () => {
    expect(derivePaymentMethod([{ method: "cash" }])).toBe("cash");
    expect(derivePaymentMethod([{ method: "cash" }, { method: "cash" }])).toBe("cash");
  });

  it("159) 混合多種付款方式時回傳 'mixed'", () => {
    expect(derivePaymentMethod([{ method: "cash" }, { method: "ecpay_credit" }])).toBe("mixed");
  });
});
