import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/admin/auth";
import { isOwnerRole } from "@/lib/admin/permissions";
import { fetchCheckoutsForDate } from "@/lib/checkout/checkoutData";
import { addDaysISO, formatWeekdayLabel, taipeiTodayISO } from "@/lib/admin/dateUtils";

type SearchParams = Promise<{ date?: string }>;

const STATUS_LABEL: Record<string, string> = { completed: "已完成", voided: "已作廢", refunded: "已退款" };

export default async function CheckoutListPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { profile } = await requireAdminUser();
  const date = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : taipeiTodayISO();

  const supabase = createAdminClient();
  const checkouts = await fetchCheckoutsForDate(supabase, date);

  return (
    <div className="space-y-4 px-4 py-5 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold text-ink">結帳</h1>
        <Link href="/admin/checkout/new" className="rounded-full bg-terracotta px-4 py-2 text-sm font-medium text-cream">
          新增結帳
        </Link>
      </div>

      <div className="flex items-center gap-1.5 text-sm">
        <Link
          href={`/admin/checkout?date=${addDaysISO(date, -1)}`}
          className="rounded-full border border-cream-border px-3 py-1 text-ink-muted hover:border-terracotta"
        >
          ← 前一天
        </Link>
        <Link
          href={`/admin/checkout?date=${taipeiTodayISO()}`}
          className="rounded-full border border-cream-border px-3 py-1 text-ink-muted hover:border-terracotta"
        >
          今天
        </Link>
        <Link
          href={`/admin/checkout?date=${addDaysISO(date, 1)}`}
          className="rounded-full border border-cream-border px-3 py-1 text-ink-muted hover:border-terracotta"
        >
          後一天 →
        </Link>
        <span className="ml-1 font-medium text-ink">
          {date}（週{formatWeekdayLabel(date)}）
        </span>
      </div>

      {isOwnerRole(profile.role) && (
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/admin/reports/daily" className="text-terracotta underline">
            日結報表
          </Link>
          <Link href="/admin/commission-rates" className="text-terracotta underline">
            抽成率設定
          </Link>
          <Link href="/admin/stored-value-plans" className="text-terracotta underline">
            儲值方案設定
          </Link>
          <Link href="/admin/message-templates" className="text-terracotta underline">
            LINE 通知範本設定
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {checkouts.length === 0 && <p className="text-sm text-ink-light">這天沒有結帳紀錄。</p>}
        {checkouts.map((c) => (
          <Link
            key={c.id}
            href={`/admin/checkout/${c.id}`}
            className="block rounded-xl border border-cream-border bg-white p-3 text-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink">{c.customerName}</span>
              <span className={c.status === "voided" ? "text-ink-light line-through" : "text-ink"}>
                NT$ {c.totalPaidAmount.toLocaleString()}
              </span>
            </div>
            <div className="mt-0.5 flex items-center justify-between text-xs text-ink-light">
              <span>{new Date(c.checkoutAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}</span>
              <span>{STATUS_LABEL[c.status] ?? c.status}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
