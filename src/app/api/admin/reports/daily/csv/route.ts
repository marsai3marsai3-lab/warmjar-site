import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwnerForAction } from "@/lib/admin/auth";
import { fetchDailyReport, buildDailyReportCsv } from "@/lib/checkout/dailyReportData";
import { taipeiTodayISO } from "@/lib/admin/dateUtils";

export async function GET(request: Request) {
  try {
    await requireOwnerForAction();
  } catch {
    return NextResponse.json({ error: "此頁面僅限店主使用" }, { status: 403 });
  }

  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : taipeiTodayISO();

  const supabase = createAdminClient();
  const report = await fetchDailyReport(supabase, date);
  const csv = buildDailyReportCsv(report);

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="daily-report-${date}.csv"`,
    },
  });
}
