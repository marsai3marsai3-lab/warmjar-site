import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runDepositCronSweep } from "@/lib/line/notificationSweepData";

/**
 * vercel.json 設定每 10 分鐘打一次。同時做兩件事（決策 2：一起做）：
 * 1. lazy-expire——真的過期的 pending_deposit 轉 cancelled，釋放時段。
 * 2. deposit_expiring_soon 提醒——還沒過期但剩不到 10 分鐘的先提醒。
 * 兩者共用同一個頻率，沒有理由分開排程（見
 * docs/phase-6-line-integration-draft.md 決策 2 與
 * runDepositCronSweep 的註解）。
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const result = await runDepositCronSweep(supabase);
  return NextResponse.json(result);
}
