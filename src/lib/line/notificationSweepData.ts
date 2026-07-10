import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { addDaysISO, formatWeekdayLabel } from "@/lib/admin/dateUtils";
import { writeAuditLog } from "@/lib/booking/auditLog";
import {
  findDueDayBeforeReminders,
  findDueDepositExpiringSoon,
  findDueRevisitCare,
  isWithinScheduleWindow,
  resolveNotificationConflicts,
  REVISIT_CARE_LOOKBACK_DAYS,
  type NotificationCandidate,
  type PendingDepositAppointment,
  type SweepAppointment,
} from "./notificationSweep";
import { sendNotification } from "./notificationSender";
import { buildDepositPaymentUrl, buildMemberUrl } from "./liffLinks";

const SCHEDULE_TOLERANCE_MINUTES = 20; // >= vercel.json 的 cron 執行間隔（15 分鐘），留一點餘裕

function taipeiISO(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(d);
}

function taipeiTimeLabel(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export type DailySweepResult = { sent: number; skipped: number; failed: number };

/**
 * 前一日提醒（20:00）＋隔日回訪關懷（12:30）——同一支排程函式處理
 * 兩者，實際會不會送出取決於 isWithinScheduleWindow（見該函式註解：
 * 時段可在後台調整、不用重新部署，靠這支每 15 分鐘跑一次的 cron 加
 * 時段容許誤差窗口達成）。決策 4 的「同日衝突、關懷順延」邏輯
 * （resolveNotificationConflicts）永遠對兩份候選清單一起跑，不管當下
 * 是哪個時段的窗口——這樣即使現在只有其中一個時段 active，也能正確
 * 判斷「這個客人今天稍後是否也會收到另一種通知」而決定要不要順延。
 */
export async function runDailyNotificationSweep(
  supabase: SupabaseClient<Database>,
  now: Date = new Date()
): Promise<DailySweepResult> {
  const counters: DailySweepResult = { sent: 0, skipped: 0, failed: 0 };

  const scheduleRes = await supabase.from("system_settings").select("value").eq("key", "notification_schedule").maybeSingle();
  const schedule = (scheduleRes.data?.value ?? {}) as { reminder_day_before?: string; revisit_care?: string };
  const reminderTime = schedule.reminder_day_before ?? "20:00";
  const revisitTime = schedule.revisit_care ?? "12:30";

  const reminderActive = isWithinScheduleWindow(now, reminderTime, SCHEDULE_TOLERANCE_MINUTES);
  const revisitActive = isWithinScheduleWindow(now, revisitTime, SCHEDULE_TOLERANCE_MINUTES);
  if (!reminderActive && !revisitActive) return counters;

  const todayISO = taipeiISO(now);
  const tomorrowISO = addDaysISO(todayISO, 1);
  const earliestISO = addDaysISO(todayISO, -REVISIT_CARE_LOOKBACK_DAYS);

  const appointmentsRes = await supabase
    .from("appointments")
    .select(
      `id, customer_id, status, appointment_date, start_time,
       service_variants ( name ), staff ( name ), customers ( name )`
    )
    .in("status", ["confirmed", "completed"])
    .gte("appointment_date", earliestISO)
    .lte("appointment_date", tomorrowISO);
  if (appointmentsRes.error) throw appointmentsRes.error;
  const appointments = appointmentsRes.data ?? [];

  const sweepInput: SweepAppointment[] = appointments.map((a) => ({
    id: a.id,
    customerId: a.customer_id,
    status: a.status,
    appointmentDate: a.appointment_date,
  }));

  const reminderDue = findDueDayBeforeReminders(sweepInput, todayISO);
  const revisitDue = findDueRevisitCare(sweepInput, todayISO);
  const candidateIds = [...reminderDue, ...revisitDue].map((a) => a.id);

  const alreadySentRes =
    candidateIds.length > 0
      ? await supabase
          .from("notifications_log")
          .select("related_appointment_id, template_key")
          .eq("status", "sent")
          .in("related_appointment_id", candidateIds)
          .in("template_key", ["reminder_day_before", "revisit_care"])
      : { data: [] as { related_appointment_id: string | null; template_key: string }[], error: null };
  if (alreadySentRes.error) throw alreadySentRes.error;
  const alreadySent = new Set((alreadySentRes.data ?? []).map((r) => `${r.related_appointment_id}:${r.template_key}`));

  const candidates: NotificationCandidate[] = [
    ...reminderDue
      .filter((a) => !alreadySent.has(`${a.id}:reminder_day_before`))
      .map((a) => ({ customerId: a.customerId, templateKey: "reminder_day_before" as const, relatedAppointmentId: a.id })),
    ...revisitDue
      .filter((a) => !alreadySent.has(`${a.id}:revisit_care`))
      .map((a) => ({ customerId: a.customerId, templateKey: "revisit_care" as const, relatedAppointmentId: a.id })),
  ];

  const { toSend } = resolveNotificationConflicts(candidates);
  const appointmentById = new Map(appointments.map((a) => [a.id, a]));

  for (const candidate of toSend) {
    const windowActive = candidate.templateKey === "reminder_day_before" ? reminderActive : revisitActive;
    if (!windowActive) continue;

    const appt = appointmentById.get(candidate.relatedAppointmentId);
    if (!appt) continue;

    const result = await sendNotification(supabase, {
      customerId: candidate.customerId,
      templateKey: candidate.templateKey,
      relatedAppointmentId: candidate.relatedAppointmentId,
      triggeredBy: "system_cron",
      vars: {
        name: appt.customers?.name ?? "貴賓",
        date: appt.appointment_date,
        weekday: formatWeekdayLabel(appt.appointment_date),
        startTime: appt.start_time.slice(0, 5),
        staffName: appt.staff?.name ?? "未指定",
        serviceName: appt.service_variants?.name ?? "",
        memberUrl: buildMemberUrl(),
      },
    });
    counters[result.status === "sent" ? "sent" : result.status === "failed" ? "failed" : "skipped"]++;
  }

  return counters;
}

export type DepositSweepResult = { notified: number; expired: number };

/**
 * 決策 2：lazy-expire 跟 deposit_expiring_soon 提醒掛在同一支高頻
 * （建議每 10 分鐘）cron 裡——時段保留只有 30 分鐘（DEPOSIT_HOLD_MINUTES），
 * 一天才清一次會讓過期的佔位卡住其他客人的時段太久，跟提醒需要的
 * 頻率剛好一致，沒有理由分開排程。
 */
export async function runDepositCronSweep(
  supabase: SupabaseClient<Database>,
  now: Date = new Date()
): Promise<DepositSweepResult> {
  const expiredRes = await supabase
    .from("appointments")
    .select("id, appointment_date")
    .eq("status", "pending_deposit")
    .lt("expires_at", now.toISOString());
  if (expiredRes.error) throw expiredRes.error;
  const expired = expiredRes.data ?? [];

  if (expired.length > 0) {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled", cancel_reason: "deposit_timeout" })
      .in(
        "id",
        expired.map((a) => a.id)
      );
    if (error) throw error;

    for (const appt of expired) {
      await writeAuditLog(supabase, {
        action: "system.appointment.deposit_timeout_release",
        targetTable: "appointments",
        targetId: appt.id,
        after: { status: "cancelled", cancel_reason: "deposit_timeout" },
      });
    }
  }

  const soonRes = await supabase
    .from("appointments")
    .select("id, customer_id, expires_at, appointment_date, start_time, customers ( name )")
    .eq("status", "pending_deposit")
    .gt("expires_at", now.toISOString());
  if (soonRes.error) throw soonRes.error;

  const pendingList: PendingDepositAppointment[] = (soonRes.data ?? [])
    .filter((a): a is typeof a & { expires_at: string } => !!a.expires_at)
    .map((a) => ({ appointmentId: a.id, customerId: a.customer_id, expiresAt: a.expires_at }));
  const due = findDueDepositExpiringSoon(pendingList, now);

  let notified = 0;
  if (due.length > 0) {
    const alreadySentRes = await supabase
      .from("notifications_log")
      .select("related_appointment_id")
      .eq("status", "sent")
      .eq("template_key", "deposit_expiring_soon")
      .in(
        "related_appointment_id",
        due.map((d) => d.appointmentId)
      );
    if (alreadySentRes.error) throw alreadySentRes.error;
    const alreadySent = new Set((alreadySentRes.data ?? []).map((r) => r.related_appointment_id));

    const depositsRes = await supabase
      .from("deposit_records")
      .select("amount, covered_appointment_ids, merchant_trade_no")
      .eq("status", "pending")
      .overlaps(
        "covered_appointment_ids",
        due.map((d) => d.appointmentId)
      );
    if (depositsRes.error) throw depositsRes.error;

    const apptById = new Map((soonRes.data ?? []).map((a) => [a.id, a]));

    for (const d of due) {
      if (alreadySent.has(d.appointmentId)) continue;
      const appt = apptById.get(d.appointmentId);
      const deposit = (depositsRes.data ?? []).find((dep) => dep.covered_appointment_ids.includes(d.appointmentId));
      if (!appt || !deposit) continue;

      const result = await sendNotification(supabase, {
        customerId: d.customerId,
        templateKey: "deposit_expiring_soon",
        relatedAppointmentId: d.appointmentId,
        triggeredBy: "system_cron",
        vars: {
          name: appt.customers?.name ?? "貴賓",
          date: appt.appointment_date,
          startTime: appt.start_time.slice(0, 5),
          expiresAt: taipeiTimeLabel(d.expiresAt),
          depositAmount: String(deposit.amount),
          paymentUrl: buildDepositPaymentUrl(deposit.merchant_trade_no),
        },
      });
      if (result.status === "sent") notified++;
    }
  }

  return { notified, expired: expired.length };
}
