import Link from "next/link";
import { requireOwnerUser } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchDailyReport } from "@/lib/checkout/dailyReportData";
import { addDaysISO, formatWeekdayLabel, taipeiTodayISO } from "@/lib/admin/dateUtils";

type SearchParams = Promise<{ date?: string }>;

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "現金",
  ecpay_credit: "刷卡",
  ecpay_transfer: "轉帳",
  stored_value: "儲值",
  coupon: "票券",
  deposit: "訂金折抵",
};

export default async function DailyReportPage({ searchParams }: { searchParams: SearchParams }) {
  await requireOwnerUser();
  const params = await searchParams;
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : taipeiTodayISO();

  const supabase = createAdminClient();
  const report = await fetchDailyReport(supabase, date);

  return (
    <div className="space-y-5 px-4 py-5 pb-10">
      <h1 className="font-heading text-xl font-semibold text-ink">日結報表</h1>

      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <Link
          href={`/admin/reports/daily?date=${addDaysISO(date, -1)}`}
          className="rounded-full border border-cream-border px-3 py-1 text-ink-muted hover:border-terracotta"
        >
          ← 前一天
        </Link>
        <Link
          href={`/admin/reports/daily?date=${taipeiTodayISO()}`}
          className="rounded-full border border-cream-border px-3 py-1 text-ink-muted hover:border-terracotta"
        >
          今天
        </Link>
        <Link
          href={`/admin/reports/daily?date=${addDaysISO(date, 1)}`}
          className="rounded-full border border-cream-border px-3 py-1 text-ink-muted hover:border-terracotta"
        >
          後一天 →
        </Link>
        <span className="ml-1 font-medium text-ink">
          {date}（週{formatWeekdayLabel(date)}）
        </span>
      </div>

      <section className="rounded-xl border border-cream-border bg-white p-3 text-sm">
        <p className="mb-2 font-medium text-ink">當日營收（不含訂金折抵）</p>
        {report.revenueByMethod.length === 0 && <p className="text-ink-light">無資料</p>}
        {report.revenueByMethod.map((r) => (
          <div key={r.method} className="flex justify-between">
            <span className="text-ink-muted">{PAYMENT_METHOD_LABEL[r.method] ?? r.method}</span>
            <span className="text-ink">NT$ {r.amount.toLocaleString()}</span>
          </div>
        ))}
        <div className="mt-1 flex justify-between border-t border-cream-border pt-1 font-medium">
          <span className="text-ink">合計</span>
          <span className="text-ink">NT$ {report.revenueTotal.toLocaleString()}</span>
        </div>
      </section>

      <section className="rounded-xl border border-cream-border bg-white p-3 text-sm">
        <p className="mb-2 font-medium text-ink">訂金收入（含沒收，獨立於當日營收）</p>
        <div className="flex justify-between">
          <span className="text-ink-muted">今日收訂金</span>
          <span className="text-ink">NT$ {report.depositIncomeToday.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-muted">今日沒收</span>
          <span className="text-ink">NT$ {report.depositForfeitedToday.toLocaleString()}</span>
        </div>
      </section>

      <section className="rounded-xl border border-cream-border bg-white p-3 text-sm">
        <p className="font-medium text-ink">儲值收入</p>
        <p className="mb-2 text-xs text-terracotta-dark">
          現金流入，非營收——收到的是預收款，屬遞延負債，客人消費兌現時才轉為營收
        </p>
        <div className="flex justify-between">
          <span className="text-ink-muted">今日儲值本金（實際收到的現金）</span>
          <span className="text-ink">NT$ {report.storedValueTopupPrincipalToday.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-muted">今日贈送贈額（非現金，僅帳面增加負債）</span>
          <span className="text-ink">NT$ {report.storedValueTopupBonusToday.toLocaleString()}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-cream-border pt-1 font-medium">
          <span className="text-ink">今日儲值現金流入合計（只算本金）</span>
          <span className="text-ink">NT$ {report.storedValueTopupPrincipalToday.toLocaleString()}</span>
        </div>
      </section>

      <section className="rounded-xl border border-cream-border bg-white p-3 text-sm">
        <p className="font-medium text-ink">儲值消耗</p>
        <p className="mb-2 text-xs text-ink-light">已計入上方「當日營收」，這裡只是拆解本金/贈額比例方便對帳，不要重複加總</p>
        <div className="flex justify-between">
          <span className="text-ink-muted">今日消耗本金</span>
          <span className="text-ink">NT$ {report.storedValueConsumePrincipalToday.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-muted">今日消耗贈額</span>
          <span className="text-ink">NT$ {report.storedValueConsumeBonusToday.toLocaleString()}</span>
        </div>
      </section>

      <section className="rounded-xl border border-cream-border bg-white p-3 text-sm">
        <p className="mb-2 font-medium text-ink">師傅業績與抽成</p>
        {report.staffPerformance.length === 0 && <p className="text-ink-light">無資料</p>}
        {report.staffPerformance.map((s) => (
          <div key={s.staffId} className="flex justify-between">
            <span className="text-ink-muted">{s.staffName}</span>
            <span className="text-ink">
              面額 NT$ {s.faceValueTotal.toLocaleString()}・抽成 NT$ {s.commissionTotal.toLocaleString()}
            </span>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-cream-border bg-white p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-muted">結帳筆數</span>
          <span className="text-ink">{report.checkoutCount} 筆</span>
        </div>
      </section>

      <a
        href={`/api/admin/reports/daily/csv?date=${date}`}
        className="block w-full rounded-full bg-terracotta py-2.5 text-center text-sm font-medium text-cream"
      >
        匯出 CSV
      </a>
    </div>
  );
}
