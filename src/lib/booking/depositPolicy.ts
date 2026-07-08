export type DepositHistoryEntry = {
  status: string;
  startAt: string;
  cancelledAt?: string | null;
};

export type DepositReason =
  | "no_history"
  | "in_good_standing"
  | "flagged_no_show"
  | "flagged_late_cancellation"
  | "waived";

export type DepositPolicyResult = {
  requiresDeposit: boolean;
  amount: number;
  reason: DepositReason;
};

export type DepositPolicyInput = {
  customerHistory: DepositHistoryEntry[];
  totalFaceValue: number;
  manualWaiver?: boolean;
};

const LATE_CANCELLATION_WINDOW_MS = 60 * 60 * 1000;
const DEPOSIT_RATE = 0.5;
const ROUND_TO = 10;

function isLateCancellation(entry: DepositHistoryEntry): boolean {
  if (entry.status !== "cancelled" || !entry.cancelledAt) return false;
  const start = new Date(entry.startAt).getTime();
  const cancelled = new Date(entry.cancelledAt).getTime();
  return start - cancelled <= LATE_CANCELLATION_WINDOW_MS;
}

// 已完成 / no_show / 1小時內取消 是「有意義的事件」，會結算目前的訂金資格；
// 提早取消是中性事件（既不算爽約也不算恢復資格），要跳過往更早的紀錄找。
function isSettlingEvent(entry: DepositHistoryEntry): boolean {
  return entry.status === "no_show" || entry.status === "completed" || isLateCancellation(entry);
}

function roundToTens(amount: number): number {
  return Math.round(amount / ROUND_TO) * ROUND_TO;
}

/**
 * 訂金資格是從顧客已結案的預約歷史即時算出來的（見對話中決策：不加冗餘欄位），
 * 依 startAt 由新到舊找「最近一筆有意義的事件」決定目前狀態 —— 這正是「爽約紀錄
 * 終身保存、但完成一次預約即恢復資格」這條規則的核心：只看最近一次結算事件，
 * 不是看歷史上有沒有爽約過。
 */
export function evaluateDepositPolicy(input: DepositPolicyInput): DepositPolicyResult {
  if (input.manualWaiver) {
    return { requiresDeposit: false, amount: 0, reason: "waived" };
  }

  const sorted = [...input.customerHistory].sort(
    (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
  );

  const mostRecentSettling = sorted.find(isSettlingEvent);

  if (!mostRecentSettling) {
    return { requiresDeposit: false, amount: 0, reason: "no_history" };
  }

  if (mostRecentSettling.status === "completed") {
    return { requiresDeposit: false, amount: 0, reason: "in_good_standing" };
  }

  const reason: DepositReason =
    mostRecentSettling.status === "no_show" ? "flagged_no_show" : "flagged_late_cancellation";

  return {
    requiresDeposit: true,
    amount: roundToTens(input.totalFaceValue * DEPOSIT_RATE),
    reason,
  };
}
