export function taipeiTodayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
}

export function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function startOfWeekISO(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00.000Z`);
  return addDaysISO(dateISO, -d.getUTCDay());
}

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

export function formatWeekdayLabel(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00.000Z`);
  return WEEKDAY_LABELS[d.getUTCDay()];
}

export function formatDayNumber(dateISO: string): string {
  return String(new Date(`${dateISO}T00:00:00.000Z`).getUTCDate());
}

/**
 * Asia/Taipei 全年固定 UTC+8（無日光節約時間），把「當地日期」轉成查詢
 * timestamptz 欄位（例如 checkouts.checkout_at）用的 [start, end) 範圍，
 * 不需要額外時區換算函式庫。
 */
export function taipeiDayRangeUTC(dateISO: string): { start: string; end: string } {
  return {
    start: `${dateISO}T00:00:00+08:00`,
    end: `${addDaysISO(dateISO, 1)}T00:00:00+08:00`,
  };
}
