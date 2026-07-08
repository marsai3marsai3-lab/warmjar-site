import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type AppointmentSqlClient = {
  expireStalePendingDeposits(params: {
    staffId: string;
    date: string;
    startTime: string;
    endTime: string;
  }): Promise<void>;
  insertAppointmentRow(params: {
    customerId: string;
    staffId: string;
    serviceVariantId: string;
    date: string;
    startTime: string;
    endTime: string;
    source: string;
    status: string;
    expiresAt: string | null;
  }): Promise<{ id: string }>;
  cancelAppointment(appointmentId: string, reason: string): Promise<void>;
};

/**
 * Real Supabase-backed implementation. Uses the service-role client only —
 * /book has no Supabase Auth session to evaluate RLS against (schema-draft.md:
 * customer-facing routes authorize in the application layer, not via RLS).
 */
export function createSupabaseAppointmentSqlClient(
  supabase: SupabaseClient<Database>
): AppointmentSqlClient {
  return {
    async expireStalePendingDeposits({ staffId, date, startTime, endTime }) {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled", cancel_reason: "deposit_timeout" })
        .eq("staff_id", staffId)
        .eq("appointment_date", date)
        .eq("status", "pending_deposit")
        .lt("expires_at", new Date().toISOString())
        .lt("start_time", endTime)
        .gt("end_time", startTime);

      if (error) throw error;
    },

    async insertAppointmentRow(params) {
      const { data, error } = await supabase
        .from("appointments")
        .insert({
          customer_id: params.customerId,
          staff_id: params.staffId,
          service_variant_id: params.serviceVariantId,
          appointment_date: params.date,
          start_time: params.startTime,
          end_time: params.endTime,
          source: params.source,
          status: params.status,
          expires_at: params.expiresAt,
        })
        .select("id")
        .single();

      if (error) throw error;
      return { id: data.id };
    },

    async cancelAppointment(appointmentId, reason) {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled", cancel_reason: reason })
        .eq("id", appointmentId);

      if (error) throw error;
    },
  };
}
