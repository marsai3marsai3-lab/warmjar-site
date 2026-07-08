import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findDepositRecordByMerchantTradeNo } from "@/lib/booking/depositRecords";
import { getEcpayConfig } from "@/lib/booking/ecpayConfig";
import { buildEcpayOrderParams } from "@/lib/booking/ecpayOrder";
import { generateCheckMacValue, type EcpayParams } from "@/lib/booking/ecpayCheckMac";

function callbackBase(): string {
  return (
    process.env.ECPAY_CALLBACK_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderAutoSubmitForm(actionUrl: string, params: EcpayParams): string {
  const inputs = Object.entries(params)
    .map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(String(value))}" />`)
    .join("\n");

  return `<!doctype html>
<html lang="zh-Hant">
<head><meta charset="utf-8" /><title>正在前往付款頁面…</title></head>
<body>
  <p>正在前往付款頁面，請稍候…</p>
  <form id="ecpay-form" method="post" action="${escapeHtml(actionUrl)}">
    ${inputs}
  </form>
  <script>document.getElementById("ecpay-form").submit();</script>
</body>
</html>`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const merchantTradeNo = url.searchParams.get("merchantTradeNo");
  if (!merchantTradeNo) {
    return NextResponse.json({ error: "缺少訂單編號" }, { status: 400 });
  }

  const config = getEcpayConfig();
  if (!config) {
    return NextResponse.json({ error: "金流設定錯誤，請稍後再試" }, { status: 500 });
  }

  const supabase = createAdminClient();
  const deposit = await findDepositRecordByMerchantTradeNo(supabase, merchantTradeNo);
  if (!deposit) {
    return NextResponse.json({ error: "找不到這筆訂金訂單" }, { status: 404 });
  }

  if (deposit.status === "paid") {
    return NextResponse.redirect(
      new URL(`/book/payment-result?merchantTradeNo=${merchantTradeNo}`, callbackBase())
    );
  }

  const base = callbackBase();
  const orderParams = buildEcpayOrderParams({
    merchantId: config.merchantId,
    merchantTradeNo: deposit.merchantTradeNo,
    amount: deposit.amount,
    itemName: "溫罐子預約訂金",
    tradeDesc: "warmjar booking deposit",
    returnUrl: new URL("/api/book/ecpay/webhook", base).toString(),
    clientBackUrl: new URL(
      `/book/payment-result?merchantTradeNo=${merchantTradeNo}`,
      base
    ).toString(),
  });

  const checkMacValue = generateCheckMacValue(orderParams, config.hashKey, config.hashIv);
  const signedParams: EcpayParams = { ...orderParams, CheckMacValue: checkMacValue };

  const html = renderAutoSubmitForm(config.checkoutUrl, signedParams);
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
