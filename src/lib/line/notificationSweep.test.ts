import { describe, expect, it } from "vitest";
import {
  findDueDayBeforeReminders,
  findDueRevisitCare,
  findDueDepositExpiringSoon,
  isWithinScheduleWindow,
  resolveNotificationConflicts,
  type SweepAppointment,
} from "./notificationSweep";

const TODAY = "2026-07-15";

describe("findDueDayBeforeReminders", () => {
  it("198) 抓到明天、狀態 confirmed 的預約", () => {
    const appts: SweepAppointment[] = [
      { id: "a1", customerId: "c1", status: "confirmed", appointmentDate: "2026-07-16" },
      { id: "a2", customerId: "c2", status: "confirmed", appointmentDate: "2026-07-17" },
    ];
    expect(findDueDayBeforeReminders(appts, TODAY).map((a) => a.id)).toEqual(["a1"]);
  });

  it("199) 排除非 confirmed 狀態或非明天的預約", () => {
    const appts: SweepAppointment[] = [
      { id: "a1", customerId: "c1", status: "pending_deposit", appointmentDate: "2026-07-16" },
      { id: "a2", customerId: "c2", status: "confirmed", appointmentDate: "2026-07-16T00:00:00" as string },
      { id: "a3", customerId: "c3", status: "confirmed", appointmentDate: "2026-07-15" },
    ];
    expect(findDueDayBeforeReminders(appts, TODAY)).toEqual([]);
  });
});

describe("findDueRevisitCare", () => {
  it("200) 抓到昨天、狀態 completed 的預約", () => {
    const appts: SweepAppointment[] = [
      { id: "a1", customerId: "c1", status: "completed", appointmentDate: "2026-07-14" },
    ];
    expect(findDueRevisitCare(appts, TODAY).map((a) => a.id)).toEqual(["a1"]);
  });

  it("201) 回溯窗口內（前天、大前天）也抓得到——模擬順延情境", () => {
    const appts: SweepAppointment[] = [
      { id: "a1", customerId: "c1", status: "completed", appointmentDate: "2026-07-13" },
      { id: "a2", customerId: "c2", status: "completed", appointmentDate: "2026-07-12" },
    ];
    expect(findDueRevisitCare(appts, TODAY).map((a) => a.id).sort()).toEqual(["a1", "a2"]);
  });

  it("202) 超過回溯窗口的舊資料不抓，今天的也不抓", () => {
    const appts: SweepAppointment[] = [
      { id: "a1", customerId: "c1", status: "completed", appointmentDate: "2026-07-10" },
      { id: "a2", customerId: "c2", status: "completed", appointmentDate: "2026-07-15" },
    ];
    expect(findDueRevisitCare(appts, TODAY)).toEqual([]);
  });
});

describe("resolveNotificationConflicts", () => {
  it("203) 同一客人同時有 reminder 與 revisit → 只留 reminder，revisit 進 deferred", () => {
    const { toSend, deferred } = resolveNotificationConflicts([
      { customerId: "c1", templateKey: "revisit_care", relatedAppointmentId: "a1" },
      { customerId: "c1", templateKey: "reminder_day_before", relatedAppointmentId: "a2" },
    ]);
    expect(toSend).toEqual([{ customerId: "c1", templateKey: "reminder_day_before", relatedAppointmentId: "a2" }]);
    expect(deferred).toEqual([{ customerId: "c1", templateKey: "revisit_care", relatedAppointmentId: "a1" }]);
  });

  it("204) 不同客人各自都送出，互不影響", () => {
    const { toSend, deferred } = resolveNotificationConflicts([
      { customerId: "c1", templateKey: "reminder_day_before", relatedAppointmentId: "a1" },
      { customerId: "c2", templateKey: "revisit_care", relatedAppointmentId: "a2" },
    ]);
    expect(toSend).toHaveLength(2);
    expect(deferred).toEqual([]);
  });
});

describe("findDueDepositExpiringSoon", () => {
  const now = new Date("2026-07-15T10:00:00+08:00");

  it("205) 剩不到 10 分鐘到期的抓得到", () => {
    const pending = [{ appointmentId: "a1", customerId: "c1", expiresAt: "2026-07-15T10:05:00+08:00" }];
    expect(findDueDepositExpiringSoon(pending, now).map((p) => p.appointmentId)).toEqual(["a1"]);
  });

  it("206) 已經過期的（diff<=0）跟還早的（超過 10 分鐘）都不抓", () => {
    const pending = [
      { appointmentId: "a1", customerId: "c1", expiresAt: "2026-07-15T09:59:00+08:00" }, // 已過期
      { appointmentId: "a2", customerId: "c2", expiresAt: "2026-07-15T10:30:00+08:00" }, // 還早
    ];
    expect(findDueDepositExpiringSoon(pending, now)).toEqual([]);
  });
});

describe("isWithinScheduleWindow", () => {
  it("216) 剛好在目標時間內（容許誤差範圍內）視為 in window", () => {
    const now = new Date("2026-07-15T20:05:00+08:00"); // 台灣時間 20:05
    expect(isWithinScheduleWindow(now, "20:00", 15)).toBe(true);
  });

  it("217) 超過容許誤差就不算 in window", () => {
    const now = new Date("2026-07-15T20:20:00+08:00");
    expect(isWithinScheduleWindow(now, "20:00", 15)).toBe(false);
  });

  it("218) 還沒到目標時間也不算 in window", () => {
    const now = new Date("2026-07-15T19:50:00+08:00");
    expect(isWithinScheduleWindow(now, "20:00", 15)).toBe(false);
  });

  it("219) 兩個不同範本各自對應自己的時段，同一時刻只有一個 in window", () => {
    const at1230 = new Date("2026-07-15T12:35:00+08:00");
    expect(isWithinScheduleWindow(at1230, "12:30", 15)).toBe(true);
    expect(isWithinScheduleWindow(at1230, "20:00", 15)).toBe(false);
  });
});
