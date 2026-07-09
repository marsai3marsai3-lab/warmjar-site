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
