import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findDepositRecordByMerchantTradeNo } from "@/lib/booking/depositRecords";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const merchantTradeNo = url.searchParams.get("merchantTradeNo");
  if (!merchantTradeNo) {
    return NextResponse.json({ error: "缺少訂單編號" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const deposit = await findDepositRecordByMerchantTradeNo(supabase, merchantTradeNo);
  if (!deposit) {
    return NextResponse.json({ error: "找不到這筆訂金訂單" }, { status: 404 });
  }

  return NextResponse.json({ status: deposit.status, amount: deposit.amount });
}
