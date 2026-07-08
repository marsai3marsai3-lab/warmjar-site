import type { AppointmentRepository, CreateAppointmentPayload } from "./createAppointment";
import type { AppointmentSqlClient } from "./appointmentSqlClient";

export type AppointmentRepositoryOptions = {
  serviceVariantId: string;
  source: string;
  status: string;
  expiresAt: string | null;
};

/**
 * Adapts an AppointmentSqlClient into the AppointmentRepository interface
 * createAppointmentSafe() expects. Must expire stale pending_deposit holds
 * for this staff/slot *before* inserting — the EXCLUDE constraint treats any
 * non-cancelled pending_deposit row as occupying regardless of expires_at
 * (see migration 0003), so a hold that expired but was never flipped to
 * cancelled would otherwise block a legitimate new booking.
 */
export function createAppointmentRepository(
  client: AppointmentSqlClient,
  options: AppointmentRepositoryOptions
): AppointmentRepository {
  return {
    async insertAppointment(payload: CreateAppointmentPayload) {
      await client.expireStalePendingDeposits({
        staffId: payload.staffId,
        date: payload.date,
        startTime: payload.startTime,
        endTime: payload.endTime,
      });

      return client.insertAppointmentRow({
        customerId: payload.customerId,
        staffId: payload.staffId,
        serviceVariantId: options.serviceVariantId,
        date: payload.date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        source: options.source,
        status: options.status,
        expiresAt: options.expiresAt,
      });
    },
  };
}
