import { describe, expect, it } from "vitest";
import {
  canCustomerCancelAppointment,
  resolveCancelButtonState,
  CUSTOMER_CANCEL_SUPPORT_PHONE,
} from "./customerCancelPolicy";

const NOW = new Date("2026-07-15T10:00:00+08:00");

describe("canCustomerCancelAppointment / resolveCancelButtonState", () => {
  it("185) 開始前超過 1 小時、狀態 confirmed → 可取消", () => {
    const startAt = new Date("2026-07-15T12:00:00+08:00"); // 2 小時後
    expect(canCustomerCancelAppointment("confirmed", startAt, NOW)).toBe(true);
    expect(resolveCancelButtonState("confirmed", startAt, NOW)).toEqual({ kind: "cancellable" });
  });

  it("186) 開始前不足 1 小時 → 不可取消，按鈕文字附電話", () => {
    const startAt = new Date("2026-07-15T10:30:00+08:00"); // 30 分鐘後
    expect(canCustomerCancelAppointment("confirmed", startAt, NOW)).toBe(false);
    const state = resolveCancelButtonState("confirmed", startAt, NOW);
    expect(state.kind).toBe("too_close");
    expect((state as { message: string }).message).toContain(CUSTOMER_CANCEL_SUPPORT_PHONE);
  });

  it("187) 狀態為 completed → 不管時間，直接不可取消（not_cancellable，不是 too_close）", () => {
    const startAt = new Date("2026-07-14T12:00:00+08:00"); // 已過去
    expect(canCustomerCancelAppointment("completed", startAt, NOW)).toBe(false);
    expect(resolveCancelButtonState("completed", startAt, NOW)).toEqual({ kind: "not_cancellable" });
  });

  it("188) pending_deposit 且時間足夠 → 可取消（訂金未付也算可自助取消）", () => {
    const startAt = new Date("2026-07-16T10:00:00+08:00");
    expect(canCustomerCancelAppointment("pending_deposit", startAt, NOW)).toBe(true);
  });

  it("189) 邊界：剛好等於 60 分鐘 → 不可取消（門檻是「超過」，不是「達到」）", () => {
    const startAt = new Date("2026-07-15T11:00:00+08:00"); // 剛好 60 分鐘後
    expect(canCustomerCancelAppointment("confirmed", startAt, NOW)).toBe(false);
  });
});
