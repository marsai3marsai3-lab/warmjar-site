import { describe, expect, it } from "vitest";
import {
  calculateAvailability,
  canStaffPerformAllServices,
  type AppointmentLike,
  type AvailabilityInput,
  type CalendarEvent,
  type ResourceBooking,
  type ServiceSelection,
  type StaffRecurringAvailability,
  type StaffSchedule,
  type StaffScheduleOverride,
  type StaffServiceSkill,
} from "./availability";

const date = "2026-07-10";

function baseServices(): ServiceSelection[] {
  return [{ id: "warmjar-60", durationMinutes: 60 }];
}

function run(partial: Partial<AvailabilityInput>) {
  const input: AvailabilityInput = {
    dateRange: { startDate: date, endDate: date },
    services: baseServices(),
    bufferMinutes: 0,
    now: new Date("2026-07-09T00:00:00.000Z"),
    staffSchedules: [],
    staffRecurringAvailabilities: [],
    staffScheduleOverrides: [],
    appointments: [],
    calendarEvents: [],
    resourceBookings: [],
    resourceCapacities: {},
    staffServiceSkills: [],
    ...partial,
  };
  return calculateAvailability(input);
}

describe("calculateAvailability", () => {
  it("1) 跨午休：午休重疊時段不可約", () => {
    const staffSchedules: StaffSchedule[] = [
      { staffId: "s1", date, startTime: "10:00", endTime: "18:00" },
    ];
    const calendarEvents: CalendarEvent[] = [
      { id: "lunch", staffId: "s1", date, startTime: "12:00", endTime: "13:30" },
    ];

    const slots = run({ staffSchedules, calendarEvents, services: [{ id: "svc", durationMinutes: 90 }] });
    expect(slots.some((s) => s.startTime === "11:30")).toBe(false);
    expect(slots.some((s) => s.startTime === "13:30")).toBe(true);
  });

  it("2) 雙師傅同時段：不指定時任一師傅可約即回傳", () => {
    const staffSchedules: StaffSchedule[] = [
      { staffId: "a", date, startTime: "10:00", endTime: "12:00" },
      { staffId: "b", date, startTime: "10:00", endTime: "12:00" },
    ];
    const appointments: AppointmentLike[] = [
      {
        id: "ap1",
        date,
        startTime: "10:00",
        endTime: "11:00",
        staffId: "a",
        status: "confirmed",
      },
    ];

    const slots = run({ staffSchedules, appointments, services: [{ id: "svc", durationMinutes: 60 }] });
    const ten = slots.find((s) => s.startTime === "10:00");
    expect(ten).toBeDefined();
    expect(ten?.availableStaffIds).toEqual(["b"]);
  });

  it("3) 資源衝突：容量 1 被占用時不可約", () => {
    const staffSchedules: StaffSchedule[] = [
      { staffId: "s1", date, startTime: "10:00", endTime: "12:00" },
    ];
    const resourceBookings: ResourceBooking[] = [
      { id: "r1", resourceId: "chest-room", date, startTime: "10:00", endTime: "11:00" },
    ];

    const slots = run({
      staffSchedules,
      resourceBookings,
      resourceCapacities: { "chest-room": 1 },
      services: [{ id: "svc", durationMinutes: 60, requiredResourceIds: ["chest-room"] }],
    });

    expect(slots.some((s) => s.startTime === "10:00")).toBe(false);
    expect(slots.some((s) => s.startTime === "11:00")).toBe(true);
  });

  it("4) 複合服務：總時長=服務總和+buffer", () => {
    const staffSchedules: StaffSchedule[] = [
      { staffId: "s1", date, startTime: "10:00", endTime: "12:00" },
    ];

    const slots = run({
      staffSchedules,
      services: [
        { id: "warmjar", durationMinutes: 60 },
        { id: "fascia", durationMinutes: 30 },
      ],
      bufferMinutes: 10,
    });

    expect(slots.some((s) => s.startTime === "10:00")).toBe(true);
    expect(slots.some((s) => s.startTime === "10:30")).toBe(false);
  });

  it("5) 不指定分配：需同時具備所有服務技能", () => {
    const staffSchedules: StaffSchedule[] = [
      { staffId: "a", date, startTime: "10:00", endTime: "12:00" },
      { staffId: "b", date, startTime: "10:00", endTime: "12:00" },
      { staffId: "c", date, startTime: "10:00", endTime: "12:00" },
    ];
    const skills: StaffServiceSkill[] = [
      { staffId: "a", serviceId: "warmjar" },
      { staffId: "b", serviceId: "fascia" },
      { staffId: "c", serviceId: "warmjar" },
      { staffId: "c", serviceId: "fascia" },
    ];

    const slots = run({
      staffSchedules,
      staffServiceSkills: skills,
      services: [
        { id: "warmjar", durationMinutes: 60 },
        { id: "fascia", durationMinutes: 30 },
      ],
    });

    const first = slots.find((s) => s.startTime === "10:00");
    expect(first?.availableStaffIds).toEqual(["c"]);
  });

  it("160) 【回歸測試】某師傅被設定了技能/抽成覆蓋列後，完全沒有任何列的其他師傅不能被誤判成什麼都不會——判斷要看「這位師傅自己」有沒有列，不是整張表是不是空的", () => {
    // 呼應 Phase 4 抽成率個別覆蓋：staff_service_skills 過去一直是空表，
    // 全體師傅都靠「整張表是空的」這個 fallback 視為全能。一旦有任何
    // 一位師傅（例如 a）被設定了一筆列（哪怕只是抽成率覆蓋，不是真的
    // 技能限制），從未設定過的師傅（例如 d）不能因此被牽連。
    expect(canStaffPerformAllServices("d", baseServices(), [{ staffId: "a", serviceId: "warmjar-60" }])).toBe(
      true
    );
  });

  it("161) 同一批技能資料裡，有列的師傅仍然照舊只看自己的列（不因為別人有列就變寬鬆）", () => {
    const skills: StaffServiceSkill[] = [{ staffId: "a", serviceId: "fascia" }];
    expect(canStaffPerformAllServices("a", baseServices(), skills)).toBe(false);
  });

  it("162) 【整合測試】師傅 d 完全沒有技能列，即使師傅 a 有列，找空檔仍然要把 d 算進候選名單", () => {
    const staffSchedules: StaffSchedule[] = [
      { staffId: "a", date, startTime: "10:00", endTime: "12:00" },
      { staffId: "d", date, startTime: "10:00", endTime: "12:00" },
    ];
    const skills: StaffServiceSkill[] = [{ staffId: "a", serviceId: "fascia" }];

    const slots = run({ staffSchedules, staffServiceSkills: skills, services: baseServices() });
    const ten = slots.find((s) => s.startTime === "10:00");
    expect(ten?.availableStaffIds).toContain("d");
    expect(ten?.availableStaffIds).not.toContain("a"); // a 有列但沒設 warmjar-60，被排除
  });

  it("6) 打烊前不足時長不可約", () => {
    const staffSchedules: StaffSchedule[] = [
      { staffId: "s1", date, startTime: "20:00", endTime: "22:00" },
    ];

    const slots = run({ staffSchedules, services: [{ id: "svc", durationMinutes: 120 }] });
    expect(slots.some((s) => s.startTime === "20:30")).toBe(false);
  });

  it("7) 當日時段需至少距 now 2 小時，且對齊 30 分鐘", () => {
    const sameDay = "2026-07-10";
    const staffSchedules: StaffSchedule[] = [
      { staffId: "s1", date: sameDay, startTime: "14:00", endTime: "18:00" },
    ];

    const slots = calculateAvailability({
      dateRange: { startDate: sameDay, endDate: sameDay },
      services: [{ id: "svc", durationMinutes: 60 }],
      bufferMinutes: 0,
      now: new Date("2026-07-10T05:10:00.000Z"), // Taipei 13:10
      staffSchedules,
    });

    expect(slots.some((s) => s.startTime === "15:00")).toBe(false);
    expect(slots.some((s) => s.startTime === "15:30")).toBe(true);
  });

  it("8) 指定師傅：只回傳指定師傅可約時段", () => {
    const staffSchedules: StaffSchedule[] = [
      { staffId: "a", date, startTime: "10:00", endTime: "12:00" },
      { staffId: "b", date, startTime: "10:00", endTime: "12:00" },
    ];
    const appointments: AppointmentLike[] = [
      { id: "x", date, startTime: "10:00", endTime: "11:00", staffId: "a", status: "confirmed" },
    ];

    const slots = run({
      staffSchedules,
      appointments,
      designatedStaffId: "a",
      services: [{ id: "svc", durationMinutes: 60 }],
    });

    expect(slots.some((s) => s.startTime === "10:00")).toBe(false);
    expect(slots.some((s) => s.startTime === "11:00")).toBe(true);
  });

  it("9) cancelled/no_show 不占用", () => {
    const staffSchedules: StaffSchedule[] = [
      { staffId: "s1", date, startTime: "10:00", endTime: "12:00" },
    ];
    const appointments: AppointmentLike[] = [
      { id: "c", date, startTime: "10:00", endTime: "11:00", staffId: "s1", status: "cancelled" },
      { id: "n", date, startTime: "11:00", endTime: "12:00", staffId: "s1", status: "no_show" },
    ];

    const slots = run({ staffSchedules, appointments, services: [{ id: "svc", durationMinutes: 60 }] });
    expect(slots.some((s) => s.startTime === "10:00")).toBe(true);
    expect(slots.some((s) => s.startTime === "11:00")).toBe(true);
  });

  it("10) 多日輸出需排序且不重複", () => {
    const d1 = "2026-07-10";
    const d2 = "2026-07-11";
    const staffSchedules: StaffSchedule[] = [
      { staffId: "s1", date: d2, startTime: "10:00", endTime: "11:00" },
      { staffId: "s1", date: d1, startTime: "10:00", endTime: "11:00" },
    ];

    const slots = calculateAvailability({
      dateRange: { startDate: d1, endDate: d2 },
      services: [{ id: "svc", durationMinutes: 60 }],
      bufferMinutes: 0,
      now: new Date("2026-07-09T00:00:00.000Z"),
      staffSchedules,
    });

    expect(slots.map((s) => `${s.date} ${s.startTime}`)).toEqual([
      "2026-07-10 10:00",
      "2026-07-11 10:00",
    ]);
  });

  it("11a) pending_deposit 未過期需佔用", () => {
    const targetDate = "2026-07-12";
    const staffSchedules: StaffSchedule[] = [
      { staffId: "s1", date: targetDate, startTime: "10:00", endTime: "12:00" },
    ];
    const appointments: AppointmentLike[] = [
      {
        id: "p1",
        date: targetDate,
        startTime: "10:00",
        endTime: "11:00",
        staffId: "s1",
        status: "pending_deposit",
        expiresAt: "2026-07-12T03:00:00.000Z",
      },
    ];

    const slots = calculateAvailability({
      dateRange: { startDate: targetDate, endDate: targetDate },
      services: [{ id: "svc", durationMinutes: 60 }],
      bufferMinutes: 0,
      now: new Date("2026-07-11T02:00:00.000Z"),
      staffSchedules,
      appointments,
    });

    expect(slots.some((s) => s.startTime === "10:00")).toBe(false);
  });

  it("11b) pending_deposit 已過期應釋放", () => {
    const targetDate = "2026-07-12";
    const staffSchedules: StaffSchedule[] = [
      { staffId: "s1", date: targetDate, startTime: "10:00", endTime: "12:00" },
    ];
    const appointments: AppointmentLike[] = [
      {
        id: "p2",
        date: targetDate,
        startTime: "10:00",
        endTime: "11:00",
        staffId: "s1",
        status: "pending_deposit",
        expiresAt: "2026-07-11T01:00:00.000Z",
      },
    ];

    const slots = calculateAvailability({
      dateRange: { startDate: targetDate, endDate: targetDate },
      services: [{ id: "svc", durationMinutes: 60 }],
      bufferMinutes: 0,
      now: new Date("2026-07-11T12:00:00.000Z"),
      staffSchedules,
      appointments,
    });

    expect(slots.some((s) => s.startTime === "10:00")).toBe(true);
  });

  it("12a) 固定班表有班，但當日 override 休假 -> 全天不可約", () => {
    const recurring: StaffRecurringAvailability[] = [
      { staffId: "s1", weekday: 5, startTime: "10:00", endTime: "18:00" },
    ];
    const overrides: StaffScheduleOverride[] = [{ staffId: "s1", date, isDayOff: true }];

    const slots = run({
      staffRecurringAvailabilities: recurring,
      staffScheduleOverrides: overrides,
      services: [{ id: "svc", durationMinutes: 60 }],
    });

    expect(slots.length).toBe(0);
  });

  it("12b) 固定休假日，但當日 override 加班 -> 該時段可約", () => {
    const recurring: StaffRecurringAvailability[] = [
      { staffId: "s1", weekday: 1, startTime: "10:00", endTime: "18:00" },
    ];
    const overrides: StaffScheduleOverride[] = [
      { staffId: "s1", date, startTime: "19:00", endTime: "21:00" },
    ];

    const slots = run({
      staffRecurringAvailabilities: recurring,
      staffScheduleOverrides: overrides,
      services: [{ id: "svc", durationMinutes: 60 }],
    });

    expect(slots.some((s) => s.startTime === "19:00")).toBe(true);
  });
});
