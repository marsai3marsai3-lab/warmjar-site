import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { decideSendAction, notifyBookingConfirmed, type SendNotificationResult } from "./notificationSender";

const fakeSupabase = {} as SupabaseClient<Database>;

describe("decideSendAction", () => {
  it("241) 客人沒有 LINE 身分 → 跳過，原因為未綁定", () => {
    const result = decideSendAction({ lineUserId: null, alreadyBlocked: false, reachability: "reachable" });
    expect(result).toEqual({ action: "skip", reason: "客人尚未綁定 LINE" });
  });

  it("242) DB 已標記封鎖 → 直接跳過，不做前置檢查判斷（呼叫端應短路不叫 checkReachable）", () => {
    const result = decideSendAction({ lineUserId: "U1", alreadyBlocked: true, reachability: "reachable" });
    expect(result).toEqual({ action: "skip", reason: "客人已封鎖官方帳號" });
  });

  it("243) 前置檢查 GetProfile 回 404（not_reachable）→ 跳過並要求標記封鎖，原因統一記 profile_404", () => {
    const result = decideSendAction({ lineUserId: "U1", alreadyBlocked: false, reachability: "not_reachable" });
    expect(result).toEqual({ action: "skip", reason: "profile_404", markBlocked: true });
  });

  it("244) 前置檢查判定 reachable → 正常送出", () => {
    const result = decideSendAction({ lineUserId: "U1", alreadyBlocked: false, reachability: "reachable" });
    expect(result).toEqual({ action: "send" });
  });

  it("245) 前置檢查本身失敗（check_failed）→ 不誤判封鎖，照常送出", () => {
    const result = decideSendAction({ lineUserId: "U1", alreadyBlocked: false, reachability: "check_failed" });
    expect(result).toEqual({ action: "send" });
  });
});

describe("notifyBookingConfirmed", () => {
  it("246) 呼叫 send 時 templateKey/triggeredBy/customerId/relatedAppointmentId/vars 都正確（觸發 + triggeredBy 值）", async () => {
    const send = vi.fn(async (): Promise<SendNotificationResult> => ({ status: "sent" }));

    await notifyBookingConfirmed(
      fakeSupabase,
      { customerId: "c1", relatedAppointmentId: "a1", vars: { name: "陳小姐" } },
      send
    );

    expect(send).toHaveBeenCalledWith(fakeSupabase, {
      customerId: "c1",
      templateKey: "booking_confirmed",
      relatedAppointmentId: "a1",
      triggeredBy: "system_event",
      vars: { name: "陳小姐" },
    });
  });

  it("247) send 拋出例外時不外露，呼叫端（建單）不受影響（失敗不得影響建單本身）", async () => {
    const send = vi.fn(async (): Promise<SendNotificationResult> => {
      throw new Error("push 掛了");
    });

    await expect(
      notifyBookingConfirmed(fakeSupabase, { customerId: "c1", relatedAppointmentId: "a1", vars: {} }, send)
    ).resolves.toBeUndefined();
  });
});
