import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAppointmentRequestSchema } from "@/lib/booking/schemas";
import { verifyBookingSession } from "@/lib/booking/otpSession";
import { fetchAvailabilityInput } from "@/lib/booking/availabilityData";
import { calculateAvailability, type TimeString } from "@/lib/booking/availability";
import { splitServiceSlots } from "@/lib/booking/splitServiceSlots";
import { createMultiServiceAppointments } from "@/lib/booking/createAppointment";
import { createSupabaseAppointmentSqlClient } from "@/lib/booking/appointmentSqlClient";
import { createAppointmentRepository } from "@/lib/booking/supabaseAppointmentRepository";
import { findOrCreateCustomer } from "@/lib/booking/customers";
import { evaluateDepositPolicy } from "@/lib/booking/depositPolicy";
import { fetchCustomerDepositHistory } from "@/lib/booking/depositHistory";
import { createDepositRecord } from "@/lib/booking/depositRecords";
import { generateMerchantTradeNo } from "@/lib/booking/ecpayOrder";
import { BOOKING_BUFFER_MINUTES, DEPOSIT_HOLD_MINUTES } from "@/lib/booking/constants";

const SESSION_COOKIE = "book_session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createAppointmentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "請求格式錯誤，請重新確認資料" }, { status: 400 });
  }

  const secret = process.env.BOOKING_TOKEN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "系統設定錯誤，請稍後再試" }, { status: 500 });
  }

  const { serviceVariantIds, staffId, date, startTime, customerName, customerPhone, customerNote } =
    parsed.data;

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken || !verifyBookingSession(sessionToken, customerPhone, secret)) {
    return NextResponse.json({ error: "請先完成手機驗證" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // 需求4：送出前重新驗證一次時段可用性，避免使用者在選時段到送出之間，
  // 這段空檔被別人搶先訂走。
  const availabilityResult = await fetchAvailabilityInput(supabase, {
    serviceVariantIds,
    staffId,
    dateRange: { startDate: date, endDate: date },
    bufferMinutes: BOOKING_BUFFER_MINUTES,
  });

  if (!availabilityResult.ok) {
    return NextResponse.json({ error: availabilityResult.error }, { status: 400 });
  }

  const freshSlots = calculateAvailability(availabilityResult.input);
  const matchingSlot = freshSlots.find((s) => s.date === date && s.startTime === startTime);

  if (!matchingSlot) {
    return NextResponse.json(
      { error: "此時段剛被預約，請重新選擇", code: "SLOT_ALREADY_BOOKED" },
      { status: 409 }
    );
  }

  const resolvedStaffId = staffId ?? matchingSlot.availableStaffIds[0];
  if (!resolvedStaffId) {
    return NextResponse.json(
      { error: "此時段剛被預約，請重新選擇", code: "SLOT_ALREADY_BOOKED" },
      { status: 409 }
    );
  }

  const variantsRes = await supabase
    .from("service_variants")
    .select("id, duration_minutes, face_value_price")
    .in("id", serviceVariantIds);
  if (variantsRes.error || !variantsRes.data) {
    return NextResponse.json({ error: "服務項目資料錯誤，請重新選擇" }, { status: 400 });
  }

  const durationById = new Map(variantsRes.data.map((v) => [v.id, v.duration_minutes]));
  const orderedDurations = serviceVariantIds.map((id) => ({
    serviceVariantId: id,
    durationMinutes: durationById.get(id) ?? 0,
  }));
  const totalFaceValue = variantsRes.data.reduce((sum, v) => sum + v.face_value_price, 0);

  const slots = splitServiceSlots(orderedDurations, startTime as TimeString);

  const customer = await findOrCreateCustomer(supabase, customerPhone, customerName);

  const depositHistory = await fetchCustomerDepositHistory(supabase, customer.id);
  const depositPolicy = evaluateDepositPolicy({
    customerHistory: depositHistory,
    totalFaceValue,
  });

  const sqlClient = createSupabaseAppointmentSqlClient(supabase);
  const expiresAt = depositPolicy.requiresDeposit
    ? new Date(Date.now() + DEPOSIT_HOLD_MINUTES * 60 * 1000).toISOString()
    : null;
  const initialStatus = depositPolicy.requiresDeposit ? "pending_deposit" : "confirmed";

  const result = await createMultiServiceAppointments(
    (serviceVariantId) =>
      createAppointmentRepository(sqlClient, {
        serviceVariantId,
        source: "web",
        status: initialStatus,
        expiresAt,
      }),
    (appointmentId) => sqlClient.cancelAppointment(appointmentId, "slot_conflict_rollback"),
    { customerId: customer.id, staffId: resolvedStaffId, date },
    slots
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.message, code: result.code }, { status: result.httpStatus });
  }

  if (customerNote) {
    await supabase
      .from("appointments")
      .update({ customer_note: customerNote })
      .eq("id", result.appointmentIds[0]);
  }

  let merchantTradeNo: string | null = null;
  if (depositPolicy.requiresDeposit) {
    merchantTradeNo = generateMerchantTradeNo();
    await createDepositRecord(supabase, {
      anchorAppointmentId: result.appointmentIds[0],
      coveredAppointmentIds: result.appointmentIds,
      amount: depositPolicy.amount,
      merchantTradeNo,
    });
  }

  return NextResponse.json({
    ok: true,
    appointmentIds: result.appointmentIds,
    staffId: resolvedStaffId,
    date,
    startTime,
    requiresDeposit: depositPolicy.requiresDeposit,
    depositAmount: depositPolicy.amount,
    depositExpiresAt: expiresAt,
    merchantTradeNo,
  });
}
