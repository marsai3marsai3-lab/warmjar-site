import { randomBytes } from "crypto";
import type { EcpayParams } from "./ecpayCheckMac";

// ECPay 要求 MerchantTradeNo 只能英數字、上限 20 碼。
export function generateMerchantTradeNo(now: Date = new Date()): string {
  const time = now.getTime().toString(36);
  const random = randomBytes(3).toString("hex");
  return `WJ${time}${random}`.slice(0, 20);
}

function formatTaipeiTradeDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}/${map.month}/${map.day} ${map.hour}:${map.minute}:${map.second}`;
}

export type BuildEcpayOrderParamsInput = {
  merchantId: string;
  merchantTradeNo: string;
  amount: number;
  itemName: string;
  tradeDesc: string;
  returnUrl: string;
  clientBackUrl: string;
  now?: Date;
};

/**
 * Builds the (unsigned) AioCheckOut param set. CheckMacValue is added by the
 * caller via ecpayCheckMac.ts — kept separate so this stays a pure function
 * of its inputs (no secret material passed through here).
 */
export function buildEcpayOrderParams(input: BuildEcpayOrderParamsInput): EcpayParams {
  return {
    MerchantID: input.merchantId,
    MerchantTradeNo: input.merchantTradeNo,
    MerchantTradeDate: formatTaipeiTradeDate(input.now ?? new Date()),
    PaymentType: "aio",
    TotalAmount: String(input.amount),
    TradeDesc: input.tradeDesc,
    ItemName: input.itemName,
    ReturnURL: input.returnUrl,
    ClientBackURL: input.clientBackUrl,
    ChoosePayment: "Credit",
    EncryptType: "1",
  };
}
