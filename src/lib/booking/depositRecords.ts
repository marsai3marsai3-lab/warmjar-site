import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type DepositRecordRow = {
  id: string;
  appointmentId: string;
  coveredAppointmentIds: string[];
  amount: number;
  status: string;
  merchantTradeNo: string;
  ecpayTradeNo: string | null;
};

export async function createDepositRecord(
  supabase: SupabaseClient<Database>,
  input: {
    anchorAppointmentId: string;
    coveredAppointmentIds: string[];
    amount: number;
    merchantTradeNo: string;
  }
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("deposit_records")
    .insert({
      appointment_id: input.anchorAppointmentId,
      covered_appointment_ids: input.coveredAppointmentIds,
      amount: input.amount,
      payment_method: "ecpay_credit",
      status: "pending",
      merchant_trade_no: input.merchantTradeNo,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id };
}

export async function findDepositRecordByMerchantTradeNo(
  supabase: SupabaseClient<Database>,
  merchantTradeNo: string
): Promise<DepositRecordRow | null> {
  const { data, error } = await supabase
    .from("deposit_records")
    .select("id, appointment_id, covered_appointment_ids, amount, status, merchant_trade_no, ecpay_trade_no")
    .eq("merchant_trade_no", merchantTradeNo)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    appointmentId: data.appointment_id,
    coveredAppointmentIds: data.covered_appointment_ids,
    amount: data.amount,
    status: data.status,
    merchantTradeNo: data.merchant_trade_no,
    ecpayTradeNo: data.ecpay_trade_no,
  };
}

export async function markDepositPaid(
  supabase: SupabaseClient<Database>,
  depositRecordId: string,
  ecpayTradeNo: string
): Promise<void> {
  const { error } = await supabase
    .from("deposit_records")
    .update({ status: "paid", ecpay_trade_no: ecpayTradeNo, paid_at: new Date().toISOString() })
    .eq("id", depositRecordId);
  if (error) throw error;
}

export async function markDepositFailed(
  supabase: SupabaseClient<Database>,
  depositRecordId: string,
  note: string
): Promise<void> {
  const { error } = await supabase
    .from("deposit_records")
    .update({ status: "failed", note })
    .eq("id", depositRecordId);
  if (error) throw error;
}

export async function fetchAppointmentStatuses(
  supabase: SupabaseClient<Database>,
  appointmentIds: string[]
): Promise<string[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("status")
    .in("id", appointmentIds);
  if (error) throw error;
  return (data ?? []).map((row) => row.status);
}

export async function confirmAppointments(
  supabase: SupabaseClient<Database>,
  appointmentIds: string[]
): Promise<void> {
  const { error } = await supabase
    .from("appointments")
    .update({ status: "confirmed", expires_at: null })
    .in("id", appointmentIds);
  if (error) throw error;
}
