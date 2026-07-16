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
import { isCustomerBlacklisted, SLOT_UNAVAILABLE_RESPONSE } from "@/lib/booking/blacklistPolicy";
import { BOOKING_BUFFER_MINUTES, DEPOSIT_HOLD_MINUTES } from "@/lib/booking/constants";
import { formatWeekdayLabel } from "@/lib/admin/dateUtils";
import { sendNotification } from "@/lib/line/notificationSender";
import { buildDepositPaymentUrl, buildMemberUrl } from "@/lib/line/liffLinks";

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
    return NextResponse.json(SLOT_UNAVAILABLE_RESPONSE, { status: 409 });
  }

  const resolvedStaffId = staffId ?? matchingSlot.availableStaffIds[0];
  if (!resolvedStaffId) {
    return NextResponse.json(SLOT_UNAVAILABLE_RESPONSE, { status: 409 });
  }

  // 需求 B.4：黑名單客人一律回「這個時段沒了」，不能回專屬錯誤訊息或
  // 403——否則客人能從「回應長得不一樣」反推自己被封鎖。用跟上面撞單
  // 完全相同的 SLOT_UNAVAILABLE_RESPONSE，兩種情況在客戶端無法區分。
  const existingCustomer = await supabase
    .from("customers")
    .select("status")
    .eq("phone", customerPhone)
    .maybeSingle();
  if (existingCustomer.error) {
    return NextResponse.json({ error: "系統錯誤，請稍後再試" }, { status: 500 });
  }
  if (isCustomerBlacklisted(existingCustomer.data?.status)) {
    return NextResponse.json(SLOT_UNAVAILABLE_RESPONSE, { status: 409 });
  }

  const variantsRes = await supabase
    .from("service_variants")
    .select("id, name, duration_minutes, face_value_price")
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

  // Phase 7-A §4.2：deposit_flow_enabled 關閉時全域略過訂金判定，不管
  // 歷史紀錄算出什麼結果——重用既有的 manualWaiver 開關達成，不是額外
  // 開一條繞過 evaluateDepositPolicy 呼叫的路徑（純函式本身不改，職責
  // 分離：它只管「依歷史紀錄算」，要不要啟用整條訂金流程是呼叫端的
  // 運維判斷）。上線時這個開關是 false（見 migration
  // 20260722000011），此時系統會把每一筆都當作已核准 manualWaiver 處理。
  const depositFlowRes = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "deposit_flow_enabled")
    .maybeSingle();
  const depositFlowEnabled = (depositFlowRes.data?.value as boolean | undefined) ?? true;

  const depositHistory = await fetchCustomerDepositHistory(supabase, customer.id);
  const depositPolicy = evaluateDepositPolicy({
    customerHistory: depositHistory,
    totalFaceValue,
    manualWaiver: !depositFlowEnabled,
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

  // 即時通知（system_event，不進排程）：預約成功一律發；有訂金的話
  // 緊接著再發一則付款連結。失敗不影響預約本身成立——客人沒綁 LINE
  // 或推播失敗都只是 notifications_log 多一筆 skipped/failed，不能讓
  // 通知系統的問題擋掉已經成立的預約。
  try {
    const staffRes = await supabase.from("staff").select("name").eq("id", resolvedStaffId).maybeSingle();
    const serviceName = variantsRes.data.map((v) => v.name).join("、");
    const commonVars = {
      name: customerName,
      date,
      weekday: formatWeekdayLabel(date),
      startTime,
      staffName: staffRes.data?.name ?? "未指定",
      serviceName,
      memberUrl: buildMemberUrl(),
    };

    await sendNotification(supabase, {
      customerId: customer.id,
      templateKey: "booking_confirmed",
      relatedAppointmentId: result.appointmentIds[0],
      triggeredBy: "system_event",
      vars: commonVars,
    });

    if (depositPolicy.requiresDeposit && merchantTradeNo) {
      await sendNotification(supabase, {
        customerId: customer.id,
        templateKey: "deposit_payment_link",
        relatedAppointmentId: result.appointmentIds[0],
        triggeredBy: "system_event",
        vars: {
          ...commonVars,
          depositAmount: String(depositPolicy.amount),
          expiresAt: expiresAt ?? "",
          paymentUrl: buildDepositPaymentUrl(merchantTradeNo),
        },
      });
    }
  } catch {
    // 通知失敗不影響預約結果，靜默略過——notifications_log 裡的
    // failed/skipped 紀錄已經足夠事後排查。
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
