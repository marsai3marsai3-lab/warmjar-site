import { addDaysISO } from "@/lib/admin/dateUtils";

export type SweepAppointment = {
  id: string;
  customerId: string;
  status: string;
  appointmentDate: string; // YYYY-MM-DD
};

export function findDueDayBeforeReminders(appointments: SweepAppointment[], todayISO: string): SweepAppointment[] {
  const tomorrow = addDaysISO(todayISO, 1);
  return appointments.filter((a) => a.status === "confirmed" && a.appointmentDate === tomorrow);
}

export const REVISIT_CARE_LOOKBACK_DAYS = 3;

/**
 * 找「已完成、appointment_date 在過去 1～REVISIT_CARE_LOOKBACK_DAYS 天
 * 內」的預約，不是嚴格只看「昨天」。呼叫端（notificationSweepData.ts）
 * 已經先篩掉 notifications_log 裡已經成功發過 revisit_care 的
 * appointment，這裡只負責日期範圍。用回溯窗口而不是嚴格昨天，是為了
 * 配合決策 4「同一客人同日跟提醒衝突時，關懷順延一天」——順延不需要
 * 額外的佇列表，隔天重跑這支函式時，這筆預約還在回溯窗口內、還沒發過，
 * 自然會被重新撈出來送。
 */
export function findDueRevisitCare(appointments: SweepAppointment[], todayISO: string): SweepAppointment[] {
  const earliest = addDaysISO(todayISO, -REVISIT_CARE_LOOKBACK_DAYS);
  const yesterday = addDaysISO(todayISO, -1);
  return appointments.filter(
    (a) => a.status === "completed" && a.appointmentDate >= earliest && a.appointmentDate <= yesterday
  );
}

export type NotificationTemplateKey = "reminder_day_before" | "revisit_care";

export type NotificationCandidate = {
  customerId: string;
  templateKey: NotificationTemplateKey;
  relatedAppointmentId: string;
};

const PRIORITY: Record<NotificationTemplateKey, number> = {
  reminder_day_before: 1,
  revisit_care: 2,
};

/**
 * 決策 4：同一客人同日有多則排程訊息時只發優先級最高者（提醒 > 關懷），
 * 被擠掉的關懷順延一天（見 findDueRevisitCare 的回溯窗口設計）。
 */
export function resolveNotificationConflicts(candidates: NotificationCandidate[]): {
  toSend: NotificationCandidate[];
  deferred: NotificationCandidate[];
} {
  const byCustomer = new Map<string, NotificationCandidate[]>();
  for (const c of candidates) {
    const list = byCustomer.get(c.customerId) ?? [];
    list.push(c);
    byCustomer.set(c.customerId, list);
  }

  const toSend: NotificationCandidate[] = [];
  const deferred: NotificationCandidate[] = [];
  for (const list of byCustomer.values()) {
    if (list.length === 1) {
      toSend.push(list[0]);
      continue;
    }
    const sorted = [...list].sort((a, b) => PRIORITY[a.templateKey] - PRIORITY[b.templateKey]);
    toSend.push(sorted[0]);
    deferred.push(...sorted.slice(1));
  }
  return { toSend, deferred };
}

/**
 * Vercel Cron 的排程時間是寫死在 vercel.json、重新部署才會生效的
 * （平台限制，不是設計選擇）。為了讓「範本與時段之後皆可在後台調整」
 * （決策 4）真的不需要重新部署就能生效，改成：cron 頻繁執行（例如每
 * 15 分鐘一次），每次執行時用這支函式判斷「現在是不是在
 * system_settings.notification_schedule 設定的時間 ± 容許誤差內」，
 * 是才真的送出。時間來源變成資料庫欄位，改後台設定當天就生效，不用
 * 等重新部署。容許誤差要 >= cron 執行間隔，否則會漏掉那個時間點。
 */
export function isWithinScheduleWindow(
  now: Date,
  scheduleHHMM: string,
  toleranceMinutes: number,
  timeZone = "Asia/Taipei"
): boolean {
  const [targetHour, targetMinute] = scheduleHHMM.split(":").map(Number);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const nowHour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const nowMinute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");

  const nowTotalMinutes = nowHour * 60 + nowMinute;
  const targetTotalMinutes = targetHour * 60 + targetMinute;
  return nowTotalMinutes >= targetTotalMinutes && nowTotalMinutes < targetTotalMinutes + toleranceMinutes;
}

export type PendingDepositAppointment = {
  appointmentId: string;
  customerId: string;
  expiresAt: string; // ISO timestamp
};

export const DEPOSIT_EXPIRING_SOON_WINDOW_MINUTES = 10;

/** 還沒過期、但剩不到 10 分鐘的 pending_deposit——已經過期的交給 lazy-expire 掃描處理，不是這支函式的事。 */
export function findDueDepositExpiringSoon(
  pending: PendingDepositAppointment[],
  now: Date
): PendingDepositAppointment[] {
  const windowMs = DEPOSIT_EXPIRING_SOON_WINDOW_MINUTES * 60 * 1000;
  return pending.filter((p) => {
    const diff = new Date(p.expiresAt).getTime() - now.getTime();
    return diff > 0 && diff <= windowMs;
  });
}
