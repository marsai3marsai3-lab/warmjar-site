export type EcpayWebhookAction =
  | { type: "confirm_all" }
  | { type: "flag_manual_review"; reason: "no_covered_appointments" | "appointment_no_longer_pending_deposit" }
  | { type: "record_failure" };

export type ResolveEcpayWebhookOutcomeInput = {
  rtnCode: string;
  coveredAppointmentStatuses: string[];
};

/**
 * Decides what a payment webhook should do to our data, given ECPay's result
 * and the *current* status of every appointment this deposit covers.
 *
 * "Late payment" (webhook lands after the hold's expires_at) is handled by
 * checking current status rather than expires_at: a pending_deposit
 * appointment is never released except by the lazy-expire step in
 * supabaseAppointmentRepository.ts, so if it's still pending_deposit the slot
 * is provably still this customer's — safe to confirm regardless of how late
 * the payment arrived. If it's already been reaped to cancelled, the slot may
 * belong to someone else now; we record the payment as paid (money is a fact)
 * but don't touch appointment status, and flag it for a human to reconcile —
 * see the deposit-policy conversation for why this is manual, not auto-refund.
 */
export function resolveEcpayWebhookOutcome(input: ResolveEcpayWebhookOutcomeInput): EcpayWebhookAction {
  if (input.rtnCode !== "1") {
    return { type: "record_failure" };
  }

  if (input.coveredAppointmentStatuses.length === 0) {
    return { type: "flag_manual_review", reason: "no_covered_appointments" };
  }

  const allStillPending = input.coveredAppointmentStatuses.every(
    (status) => status === "pending_deposit"
  );

  if (!allStillPending) {
    return { type: "flag_manual_review", reason: "appointment_no_longer_pending_deposit" };
  }

  return { type: "confirm_all" };
}
