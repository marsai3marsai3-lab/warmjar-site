export type AppointmentAdminAction = "check_in" | "complete" | "no_show" | "cancel";

export type ActionOption = { action: AppointmentAdminAction; label: string };

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "no_show"]);

/**
 * pending_deposit is deliberately excluded from check-in/complete/no-show:
 * the deposit needs to be resolved (paid or waived) before front-desk should
 * be checking someone in. Once checked in, no_show no longer makes sense
 * (they're physically here), so it drops off the list.
 */
export function availableAppointmentActions(status: string, isCheckedIn: boolean): ActionOption[] {
  if (TERMINAL_STATUSES.has(status)) return [];

  if (status === "pending_deposit") {
    return [{ action: "cancel", label: "取消" }];
  }

  if (isCheckedIn) {
    return [
      { action: "complete", label: "標記完成" },
      { action: "cancel", label: "取消" },
    ];
  }

  return [
    { action: "check_in", label: "標記報到" },
    { action: "no_show", label: "標記爽約" },
    { action: "cancel", label: "取消" },
  ];
}

export function isAppointmentActionAllowed(
  status: string,
  isCheckedIn: boolean,
  action: AppointmentAdminAction
): boolean {
  return availableAppointmentActions(status, isCheckedIn).some((option) => option.action === action);
}

/**
 * Phase 3-3 C.1：改期/換師傅只在「客人還沒到店、狀態還沒定案」的窗口內
 * 開放——跟 pending_deposit 一樣排除在外（訂金還沒解決就先改期沒有意義，
 * 應該先處理訂金），已報到／終態也排除（人已經在現場或這筆已經結案，
 * 改期沒有意義）。刻意不放進 AppointmentAdminAction 那個 union，因為
 * 改期需要日期/時間/師傅這些額外輸入，跟其餘固定動作的形狀不一樣。
 */
export function canRescheduleAppointment(status: string, isCheckedIn: boolean): boolean {
  if (TERMINAL_STATUSES.has(status)) return false;
  if (status === "pending_deposit") return false;
  if (isCheckedIn) return false;
  return true;
}

export type AppointmentUpdate = {
  status?: string;
  checked_in_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
};

export function buildAppointmentUpdate(
  action: AppointmentAdminAction,
  now: Date = new Date()
): AppointmentUpdate {
  const nowIso = now.toISOString();
  switch (action) {
    case "check_in":
      return { checked_in_at: nowIso };
    case "complete":
      return { status: "completed" };
    case "no_show":
      return { status: "no_show" };
    case "cancel":
      return { status: "cancelled", cancelled_at: nowIso, cancel_reason: "admin_cancelled" };
  }
}
