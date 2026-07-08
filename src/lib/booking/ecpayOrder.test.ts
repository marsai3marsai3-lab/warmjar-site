import { describe, expect, it } from "vitest";
import { buildEcpayOrderParams, generateMerchantTradeNo } from "./ecpayOrder";

describe("generateMerchantTradeNo", () => {
  it("is alphanumeric and at most 20 characters (ECPay's limit)", () => {
    const tradeNo = generateMerchantTradeNo();
    expect(tradeNo.length).toBeLessThanOrEqual(20);
    expect(tradeNo).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("generates distinct values on successive calls", () => {
    const a = generateMerchantTradeNo();
    const b = generateMerchantTradeNo();
    expect(a).not.toBe(b);
  });
});

describe("buildEcpayOrderParams", () => {
  it("maps inputs to the expected ECPay field names and formats the trade date in Asia/Taipei", () => {
    const now = new Date("2026-07-08T04:00:00.000Z"); // 12:00 Taipei time
    const params = buildEcpayOrderParams({
      merchantId: "2000132",
      merchantTradeNo: "WJTEST0001",
      amount: 640,
      itemName: "肩背舒放 60分鐘 訂金",
      tradeDesc: "warmjar deposit",
      returnUrl: "https://www.warmjar.com.tw/api/book/ecpay/webhook",
      clientBackUrl: "https://www.warmjar.com.tw/book/payment-result",
      now,
    });

    expect(params).toEqual({
      MerchantID: "2000132",
      MerchantTradeNo: "WJTEST0001",
      MerchantTradeDate: "2026/07/08 12:00:00",
      PaymentType: "aio",
      TotalAmount: "640",
      TradeDesc: "warmjar deposit",
      ItemName: "肩背舒放 60分鐘 訂金",
      ReturnURL: "https://www.warmjar.com.tw/api/book/ecpay/webhook",
      ClientBackURL: "https://www.warmjar.com.tw/book/payment-result",
      ChoosePayment: "Credit",
      EncryptType: "1",
    });
  });
});
