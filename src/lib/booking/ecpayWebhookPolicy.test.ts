import { describe, expect, it } from "vitest";
import { resolveEcpayWebhookOutcome } from "./ecpayWebhookPolicy";

describe("resolveEcpayWebhookOutcome", () => {
  it("32) 付款成功且所有涵蓋的預約都還是 pending_deposit → 全部確認", () => {
    const result = resolveEcpayWebhookOutcome({
      rtnCode: "1",
      coveredAppointmentStatuses: ["pending_deposit", "pending_deposit"],
    });
    expect(result).toEqual({ type: "confirm_all" });
  });

  it("33) 付款成功，但其中一筆已被 lazy-expire 清成 cancelled → 標記待人工處理", () => {
    const result = resolveEcpayWebhookOutcome({
      rtnCode: "1",
      coveredAppointmentStatuses: ["pending_deposit", "cancelled"],
    });
    expect(result).toEqual({
      type: "flag_manual_review",
      reason: "appointment_no_longer_pending_deposit",
    });
  });

  it("34) 付款失敗（RtnCode 非 1）→ 只記錄失敗，不動預約狀態", () => {
    const result = resolveEcpayWebhookOutcome({
      rtnCode: "0",
      coveredAppointmentStatuses: ["pending_deposit"],
    });
    expect(result).toEqual({ type: "record_failure" });
  });

  it("35) 沒有任何涵蓋的預約（資料異常）→ 標記待人工處理，不誤判為成功", () => {
    const result = resolveEcpayWebhookOutcome({ rtnCode: "1", coveredAppointmentStatuses: [] });
    expect(result).toEqual({ type: "flag_manual_review", reason: "no_covered_appointments" });
  });

  it("36) 付款失敗時即使預約狀態已不是 pending_deposit，仍是單純記錄失敗", () => {
    const result = resolveEcpayWebhookOutcome({
      rtnCode: "10100248",
      coveredAppointmentStatuses: ["cancelled"],
    });
    expect(result).toEqual({ type: "record_failure" });
  });
});
