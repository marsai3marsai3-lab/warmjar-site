import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEcpayConfig } from "@/lib/booking/ecpayConfig";
import { verifyCheckMacValue } from "@/lib/booking/ecpayCheckMac";
import { resolveEcpayWebhookOutcome } from "@/lib/booking/ecpayWebhookPolicy";
import {
  confirmAppointments,
  fetchAppointmentStatuses,
  findDepositRecordByMerchantTradeNo,
  markDepositFailed,
  markDepositPaid,
} from "@/lib/booking/depositRecords";
import { writeAuditLog } from "@/lib/booking/auditLog";

function plainText(body: string, status = 200) {
  return new NextResponse(body, { status, headers: { "Content-Type": "text/plain" } });
}

export async function POST(request: Request) {
  const config = getEcpayConfig();
  if (!config) {
    return plainText("0|config error", 500);
  }

  const formData = await request.formData();
  const payload: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    payload[key] = String(value);
  }

  if (!verifyCheckMacValue(payload, config.hashKey, config.hashIv)) {
    return plainText("0|invalid signature", 400);
  }

  const merchantTradeNo = payload.MerchantTradeNo;
  const supabase = createAdminClient();
  const deposit = merchantTradeNo
    ? await findDepositRecordByMerchantTradeNo(supabase, merchantTradeNo)
    : null;

  if (!deposit) {
    await writeAuditLog(supabase, {
      action: "ecpay.webhook.unknown_merchant_trade_no",
      targetTable: "deposit_records",
      after: payload,
    });
    // 這筆訂單編號在我們系統裡不存在，重送也不會有結果，直接告訴 ECPay 已收到。
    return plainText("1|OK");
  }

  // 冪等：同一筆付款成功通知 ECPay 可能重送，已經處理過的直接回覆，不重複處理。
  if (deposit.status === "paid") {
    return plainText("1|OK");
  }

  const coveredStatuses = await fetchAppointmentStatuses(supabase, deposit.coveredAppointmentIds);
  const outcome = resolveEcpayWebhookOutcome({
    rtnCode: payload.RtnCode ?? "",
    coveredAppointmentStatuses: coveredStatuses,
  });

  if (outcome.type === "confirm_all") {
    await confirmAppointments(supabase, deposit.coveredAppointmentIds);
    await markDepositPaid(supabase, deposit.id, payload.TradeNo ?? "");
  } else if (outcome.type === "flag_manual_review") {
    await markDepositPaid(supabase, deposit.id, payload.TradeNo ?? "");
    await writeAuditLog(supabase, {
      action: "ecpay.webhook.manual_review_required",
      targetTable: "deposit_records",
      targetId: deposit.id,
      after: { reason: outcome.reason, coveredStatuses, payload },
    });
  } else {
    await markDepositFailed(supabase, deposit.id, payload.RtnMsg ?? "payment failed");
  }

  return plainText("1|OK");
}
