import { describe, expect, it } from "vitest";
import { generateCheckMacValue, verifyCheckMacValue } from "./ecpayCheckMac";

const HASH_KEY = "5294y06JbISpM5x9";
const HASH_IV = "v77hoKGq4kWxNNIS";

// Fixed vector confirmed live against ECPay's real staging AioCheckOut
// endpoint (payment-stage.ecpay.com.tw): posting these exact params with
// this exact CheckMacValue renders ECPay's real credit-card checkout page,
// not their "CheckMacValue Error." page. This isn't just an internal
// round-trip check — it's validated against ECPay's own server.
const GOLDEN_PARAMS = {
  MerchantID: "2000132",
  MerchantTradeNo: "WJGOLDEN0000001",
  MerchantTradeDate: "2026/07/08 12:00:00",
  PaymentType: "aio",
  TotalAmount: "640",
  TradeDesc: "warmjar deposit test",
  ItemName: "肩背舒放 60分鐘 訂金",
  ReturnURL: "https://www.warmjar.com.tw/api/book/ecpay/webhook",
  ChoosePayment: "Credit",
  EncryptType: "1",
};
const GOLDEN_MAC = "9E489425BCDE46AA2F277F761C81DDAE1BD18269A77B21DF229515022BE80B7A";

describe("generateCheckMacValue", () => {
  it("matches a value verified live against ECPay's real staging server", () => {
    expect(generateCheckMacValue(GOLDEN_PARAMS, HASH_KEY, HASH_IV)).toBe(GOLDEN_MAC);
  });

  it("is deterministic for the same params/keys", () => {
    const a = generateCheckMacValue(GOLDEN_PARAMS, HASH_KEY, HASH_IV);
    const b = generateCheckMacValue(GOLDEN_PARAMS, HASH_KEY, HASH_IV);
    expect(a).toBe(b);
  });

  it("is independent of key ordering in the input object", () => {
    const reordered = {
      EncryptType: GOLDEN_PARAMS.EncryptType,
      MerchantID: GOLDEN_PARAMS.MerchantID,
      ChoosePayment: GOLDEN_PARAMS.ChoosePayment,
      MerchantTradeNo: GOLDEN_PARAMS.MerchantTradeNo,
      TotalAmount: GOLDEN_PARAMS.TotalAmount,
      MerchantTradeDate: GOLDEN_PARAMS.MerchantTradeDate,
      PaymentType: GOLDEN_PARAMS.PaymentType,
      TradeDesc: GOLDEN_PARAMS.TradeDesc,
      ItemName: GOLDEN_PARAMS.ItemName,
      ReturnURL: GOLDEN_PARAMS.ReturnURL,
    };
    expect(generateCheckMacValue(reordered, HASH_KEY, HASH_IV)).toBe(GOLDEN_MAC);
  });

  it("ignores a pre-existing CheckMacValue field when signing", () => {
    const withStaleMac = { ...GOLDEN_PARAMS, CheckMacValue: "stale-value" };
    expect(generateCheckMacValue(withStaleMac, HASH_KEY, HASH_IV)).toBe(GOLDEN_MAC);
  });

  it("changes when any single field changes (tamper sensitivity)", () => {
    const tampered = { ...GOLDEN_PARAMS, TotalAmount: "641" };
    expect(generateCheckMacValue(tampered, HASH_KEY, HASH_IV)).not.toBe(GOLDEN_MAC);
  });

  it("changes when HashKey/HashIV differ", () => {
    const mac = generateCheckMacValue(GOLDEN_PARAMS, "different-key", HASH_IV);
    expect(mac).not.toBe(GOLDEN_MAC);
  });
});

describe("verifyCheckMacValue", () => {
  it("accepts a correctly signed payload", () => {
    const payload = { ...GOLDEN_PARAMS, CheckMacValue: GOLDEN_MAC };
    expect(verifyCheckMacValue(payload, HASH_KEY, HASH_IV)).toBe(true);
  });

  it("accepts a lowercase CheckMacValue (case-insensitive comparison)", () => {
    const payload = { ...GOLDEN_PARAMS, CheckMacValue: GOLDEN_MAC.toLowerCase() };
    expect(verifyCheckMacValue(payload, HASH_KEY, HASH_IV)).toBe(true);
  });

  it("rejects a payload whose field was tampered with after signing", () => {
    const payload = { ...GOLDEN_PARAMS, CheckMacValue: GOLDEN_MAC, TotalAmount: "999999" };
    expect(verifyCheckMacValue(payload, HASH_KEY, HASH_IV)).toBe(false);
  });

  it("rejects a payload with a missing CheckMacValue", () => {
    const payload: Record<string, string> = { ...GOLDEN_PARAMS };
    expect(verifyCheckMacValue(payload, HASH_KEY, HASH_IV)).toBe(false);
  });
});
