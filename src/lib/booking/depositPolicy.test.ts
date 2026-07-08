import { describe, expect, it } from "vitest";
import { evaluateDepositPolicy, type DepositHistoryEntry } from "./depositPolicy";

describe("evaluateDepositPolicy", () => {
  it("23) 新客（無任何已結案紀錄）不收訂金", () => {
    const result = evaluateDepositPolicy({ customerHistory: [], totalFaceValue: 1280 });
    expect(result).toEqual({ requiresDeposit: false, amount: 0, reason: "no_history" });
  });

  it("24) 乖客（最近一次已結案是 completed）不收訂金", () => {
    const history: DepositHistoryEntry[] = [
      { status: "completed", startAt: "2026-06-01T02:00:00.000Z" },
      { status: "completed", startAt: "2026-05-01T02:00:00.000Z" },
    ];
    const result = evaluateDepositPolicy({ customerHistory: history, totalFaceValue: 1280 });
    expect(result).toEqual({ requiresDeposit: false, amount: 0, reason: "in_good_standing" });
  });

  it("25) 有 no_show 且尚未贖回：收 50% 訂金並四捨五入至十元", () => {
    const history: DepositHistoryEntry[] = [
      { status: "no_show", startAt: "2026-06-01T02:00:00.000Z" },
    ];
    const result = evaluateDepositPolicy({ customerHistory: history, totalFaceValue: 1285 });
    // 1285 * 0.5 = 642.5 -> 四捨五入至十元 = 640
    expect(result).toEqual({ requiresDeposit: true, amount: 640, reason: "flagged_no_show" });
  });

  it("26) 預約開始前 1 小時內取消視同爽約，需收訂金", () => {
    const history: DepositHistoryEntry[] = [
      {
        status: "cancelled",
        startAt: "2026-06-01T10:00:00.000Z",
        cancelledAt: "2026-06-01T09:30:00.000Z", // 開始前 30 分鐘取消
      },
    ];
    const result = evaluateDepositPolicy({ customerHistory: history, totalFaceValue: 2280 });
    expect(result).toEqual({ requiresDeposit: true, amount: 1140, reason: "flagged_late_cancellation" });
  });

  it("26b) 預約開始前超過 1 小時取消屬正常取消，不視為爽約", () => {
    const history: DepositHistoryEntry[] = [
      {
        status: "cancelled",
        startAt: "2026-06-01T10:00:00.000Z",
        cancelledAt: "2026-06-01T08:00:00.000Z", // 開始前 2 小時取消
      },
    ];
    const result = evaluateDepositPolicy({ customerHistory: history, totalFaceValue: 1280 });
    expect(result).toEqual({ requiresDeposit: false, amount: 0, reason: "no_history" });
  });

  it("27) 曾經 no_show 但之後完成一次預約 → 恢復免訂金資格", () => {
    const history: DepositHistoryEntry[] = [
      { status: "completed", startAt: "2026-06-10T02:00:00.000Z" }, // 較新
      { status: "no_show", startAt: "2026-05-01T02:00:00.000Z" }, // 較舊
    ];
    const result = evaluateDepositPolicy({ customerHistory: history, totalFaceValue: 1280 });
    expect(result).toEqual({ requiresDeposit: false, amount: 0, reason: "in_good_standing" });
  });

  it("28) 再犯：恢復資格後又爽約一次，最近事件是新的 no_show，仍需收訂金", () => {
    const history: DepositHistoryEntry[] = [
      { status: "no_show", startAt: "2026-06-20T02:00:00.000Z" }, // 最新：再次爽約
      { status: "completed", startAt: "2026-06-10T02:00:00.000Z" }, // 中間：曾恢復資格
      { status: "no_show", startAt: "2026-05-01T02:00:00.000Z" }, // 最早：第一次爽約
    ];
    const result = evaluateDepositPolicy({ customerHistory: history, totalFaceValue: 1000 });
    expect(result).toEqual({ requiresDeposit: true, amount: 500, reason: "flagged_no_show" });
  });

  it("29) 人工覆核 waived：即使歷史顯示需要訂金，也不收", () => {
    const history: DepositHistoryEntry[] = [
      { status: "no_show", startAt: "2026-06-01T02:00:00.000Z" },
    ];
    const result = evaluateDepositPolicy({
      customerHistory: history,
      totalFaceValue: 2280,
      manualWaiver: true,
    });
    expect(result).toEqual({ requiresDeposit: false, amount: 0, reason: "waived" });
  });

  it("30) 早於最近一次爽約之前的正常取消不影響判斷（跳過中性事件往前找）", () => {
    const history: DepositHistoryEntry[] = [
      {
        status: "cancelled",
        startAt: "2026-06-15T10:00:00.000Z",
        cancelledAt: "2026-06-14T10:00:00.000Z", // 提早一天取消，中性事件
      },
      { status: "no_show", startAt: "2026-06-01T02:00:00.000Z" },
    ];
    const result = evaluateDepositPolicy({ customerHistory: history, totalFaceValue: 1280 });
    expect(result).toEqual({ requiresDeposit: true, amount: 640, reason: "flagged_no_show" });
  });

  it("31) 未結案的預約（pending/confirmed）不列入判斷", () => {
    const history: DepositHistoryEntry[] = [
      { status: "confirmed", startAt: "2026-07-01T02:00:00.000Z" },
      { status: "completed", startAt: "2026-06-01T02:00:00.000Z" },
    ];
    const result = evaluateDepositPolicy({ customerHistory: history, totalFaceValue: 1280 });
    expect(result).toEqual({ requiresDeposit: false, amount: 0, reason: "in_good_standing" });
  });
});
