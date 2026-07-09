import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { taipeiDayRangeUTC } from "@/lib/admin/dateUtils";

export type DailyReportPaymentRow = { method: string; amount: number };
export type DailyReportStaffRow = { staffId: string; staffName: string; faceValueTotal: number; commissionTotal: number };

export type DailyReport = {
  date: string;
  revenueByMethod: DailyReportPaymentRow[];
  revenueTotal: number;
  depositIncomeToday: number;
  depositForfeitedToday: number;
  staffPerformance: DailyReportStaffRow[];
  checkoutCount: number;
};

/**
 * 「當日營收」跟「訂金收入」刻意分開算，不合併——訂金是在預約當下
 * 收的，發生日期是 deposit_records.paid_at，不是結帳當天；結帳時的
 * 訂金折抵金額（deposit_applied）不算進當日營收，否則同一筆錢會在
 * 兩天各算一次。見 docs/phase-4-checkout-draft.md 4.2 的完整說明。
 */
export async function fetchDailyReport(
  supabase: SupabaseClient<Database>,
  dateISO: string
): Promise<DailyReport> {
  const { start, end } = taipeiDayRangeUTC(dateISO);

  const checkoutsRes = await supabase
    .from("checkouts")
    .select("id")
    .eq("status", "completed")
    .gte("checkout_at", start)
    .lt("checkout_at", end);
  if (checkoutsRes.error) throw checkoutsRes.error;
  const checkoutIds = (checkoutsRes.data ?? []).map((c) => c.id);

  const [paymentsRes, itemsRes, depositsPaidRes, forfeitedRes] = await Promise.all([
    checkoutIds.length > 0
      ? supabase.from("checkout_payments").select("method, amount").in("checkout_id", checkoutIds)
      : Promise.resolve({ data: [] as { method: string; amount: number }[], error: null }),
    checkoutIds.length > 0
      ? supabase
          .from("checkout_items")
          .select("face_value, staff_id, staff ( name ), commission_records ( commission_amount, voided )")
          .in("checkout_id", checkoutIds)
      : Promise.resolve({
          data: [] as {
            face_value: number;
            staff_id: string | null;
            staff: { name: string } | null;
            commission_records: { commission_amount: number; voided: boolean } | null;
          }[],
          error: null,
        }),
    supabase.from("deposit_records").select("amount").gte("paid_at", start).lt("paid_at", end).not("paid_at", "is", null),
    supabase
      .from("revenue_records")
      .select("amount")
      .eq("revenue_type", "forfeited_deposit")
      .gte("recorded_at", start)
      .lt("recorded_at", end),
  ]);
  if (paymentsRes.error) throw paymentsRes.error;
  if (itemsRes.error) throw itemsRes.error;
  if (depositsPaidRes.error) throw depositsPaidRes.error;
  if (forfeitedRes.error) throw forfeitedRes.error;

  const revenueByMethodMap = new Map<string, number>();
  for (const p of paymentsRes.data ?? []) {
    revenueByMethodMap.set(p.method, (revenueByMethodMap.get(p.method) ?? 0) + p.amount);
  }
  const revenueByMethod = [...revenueByMethodMap.entries()].map(([method, amount]) => ({ method, amount }));
  const revenueTotal = revenueByMethod.reduce((sum, r) => sum + r.amount, 0);

  const staffMap = new Map<string, DailyReportStaffRow>();
  for (const item of itemsRes.data ?? []) {
    if (!item.staff_id) continue;
    const row = staffMap.get(item.staff_id) ?? {
      staffId: item.staff_id,
      staffName: item.staff?.name ?? "未指定",
      faceValueTotal: 0,
      commissionTotal: 0,
    };
    row.faceValueTotal += item.face_value;
    if (item.commission_records && !item.commission_records.voided) {
      row.commissionTotal += item.commission_records.commission_amount;
    }
    staffMap.set(item.staff_id, row);
  }

  return {
    date: dateISO,
    revenueByMethod,
    revenueTotal,
    depositIncomeToday: (depositsPaidRes.data ?? []).reduce((sum, d) => sum + d.amount, 0),
    depositForfeitedToday: (forfeitedRes.data ?? []).reduce((sum, r) => sum + r.amount, 0),
    staffPerformance: [...staffMap.values()].sort((a, b) => b.faceValueTotal - a.faceValueTotal),
    checkoutCount: checkoutIds.length,
  };
}

function csvEscape(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildDailyReportCsv(report: DailyReport): string {
  const lines: string[] = [];
  lines.push(`日結報表,${report.date}`);
  lines.push("");
  lines.push("當日營收（不含訂金折抵）");
  lines.push("付款方式,金額");
  for (const r of report.revenueByMethod) {
    lines.push(`${csvEscape(r.method)},${r.amount}`);
  }
  lines.push(`合計,${report.revenueTotal}`);
  lines.push("");
  lines.push("訂金收入（獨立於當日營收）");
  lines.push(`今日收訂金,${report.depositIncomeToday}`);
  lines.push(`今日沒收,${report.depositForfeitedToday}`);
  lines.push("");
  lines.push("師傅業績與抽成");
  lines.push("師傅,面額小計,抽成小計");
  for (const s of report.staffPerformance) {
    lines.push(`${csvEscape(s.staffName)},${s.faceValueTotal},${s.commissionTotal}`);
  }
  lines.push("");
  lines.push(`結帳筆數,${report.checkoutCount}`);
  return lines.join("\n");
}
