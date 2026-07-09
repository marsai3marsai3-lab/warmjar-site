import { describe, expect, it } from "vitest";
import {
  availableAppointmentActions,
  buildAppointmentUpdate,
  canRescheduleAppointment,
  isAppointmentActionAllowed,
} from "./appointmentActions";

describe("availableAppointmentActions", () => {
  it("37) pending_deposit 只能取消，不能報到/完成/爽約", () => {
    expect(availableAppointmentActions("pending_deposit", false)).toEqual([
      { action: "cancel", label: "取消" },
    ]);
  });

  it("38) confirmed 且尚未報到：可報到／爽約／取消，不能標記完成", () => {
    const actions = availableAppointmentActions("confirmed", false).map((a) => a.action);
    expect(actions).toEqual(["check_in", "no_show", "cancel"]);
  });

  it("39) confirmed 且已報到：可完成／取消，不能再報到或爽約", () => {
    const actions = availableAppointmentActions("confirmed", true).map((a) => a.action);
    expect(actions).toEqual(["complete", "cancel"]);
  });

  it("40) completed/cancelled/no_show 是終態，沒有任何可操作動作", () => {
    expect(availableAppointmentActions("completed", false)).toEqual([]);
    expect(availableAppointmentActions("completed", true)).toEqual([]);
    expect(availableAppointmentActions("cancelled", false)).toEqual([]);
    expect(availableAppointmentActions("no_show", false)).toEqual([]);
  });

  it("41) pending 狀態的行為跟 confirmed 一致", () => {
    expect(availableAppointmentActions("pending", false).map((a) => a.action)).toEqual([
      "check_in",
      "no_show",
      "cancel",
    ]);
  });
});

describe("isAppointmentActionAllowed", () => {
  it("42) 不在允許清單內的動作回傳 false", () => {
    expect(isAppointmentActionAllowed("pending_deposit", false, "check_in")).toBe(false);
    expect(isAppointmentActionAllowed("confirmed", false, "complete")).toBe(false);
    expect(isAppointmentActionAllowed("confirmed", true, "no_show")).toBe(false);
    expect(isAppointmentActionAllowed("completed", false, "cancel")).toBe(false);
  });

  it("43) 允許清單內的動作回傳 true", () => {
    expect(isAppointmentActionAllowed("confirmed", false, "check_in")).toBe(true);
    expect(isAppointmentActionAllowed("confirmed", true, "complete")).toBe(true);
    expect(isAppointmentActionAllowed("pending_deposit", false, "cancel")).toBe(true);
  });
});

describe("buildAppointmentUpdate", () => {
  const now = new Date("2026-07-09T02:00:00.000Z");

  it("44) check_in 只設定 checked_in_at", () => {
    expect(buildAppointmentUpdate("check_in", now)).toEqual({
      checked_in_at: "2026-07-09T02:00:00.000Z",
    });
  });

  it("45) complete 把 status 設為 completed", () => {
    expect(buildAppointmentUpdate("complete", now)).toEqual({ status: "completed" });
  });

  it("46) no_show 把 status 設為 no_show", () => {
    expect(buildAppointmentUpdate("no_show", now)).toEqual({ status: "no_show" });
  });

  it("47) cancel 同時設定 status/cancelled_at/cancel_reason", () => {
    expect(buildAppointmentUpdate("cancel", now)).toEqual({
      status: "cancelled",
      cancelled_at: "2026-07-09T02:00:00.000Z",
      cancel_reason: "admin_cancelled",
    });
  });
});

describe("canRescheduleAppointment", () => {
  it("98) pending/confirmed 且尚未報到時可以改期", () => {
    expect(canRescheduleAppointment("pending", false)).toBe(true);
    expect(canRescheduleAppointment("confirmed", false)).toBe(true);
  });

  it("99) pending_deposit 不能改期——要先解決訂金", () => {
    expect(canRescheduleAppointment("pending_deposit", false)).toBe(false);
  });

  it("100) 已報到不能改期——人已經在現場", () => {
    expect(canRescheduleAppointment("confirmed", true)).toBe(false);
  });

  it("101) 終態（completed/cancelled/no_show）不能改期", () => {
    expect(canRescheduleAppointment("completed", false)).toBe(false);
    expect(canRescheduleAppointment("cancelled", false)).toBe(false);
    expect(canRescheduleAppointment("no_show", false)).toBe(false);
  });
});
