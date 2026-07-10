import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runDailyNotificationSweep } from "@/lib/line/notificationSweepData";

/**
 * vercel.json 設定每 15 分鐘打一次——實際會不會送出取決於
 * runDailyNotificationSweep 內部的時段窗口判斷（見該函式與
 * isWithinScheduleWindow 的註解：時段存在 system_settings，後台調整
 * 當天生效，不用重新部署）。CRON_SECRET 保護，本機開發可以直接用
 * curl 手動打這支測試（見驗收指南）。
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const result = await runDailyNotificationSweep(supabase);
  return NextResponse.json(result);
}
