import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLineIdToken } from "@/lib/line/lineClient";
import { liffCompleteBindRequestSchema } from "@/lib/member/schemas";
import { findOrCreateCustomerForMember } from "@/lib/booking/customersForMember";
import { createMemberSession, verifyBookingSession } from "@/lib/booking/otpSession";
import { setMemberSessionCookie } from "@/lib/member/session";
import { clearLineNotifyBlockedFlag } from "@/lib/line/notificationSender";

const BOOK_SESSION_COOKIE = "book_session";

/**
 * 首次綁定的第二步：idToken 重新驗證一次（不信任任何客戶端存的中間
 * 狀態），並要求 book_session 存在且對應這支手機——證明這支手機真的
 * 剛完成過 /api/book/verify-otp 的簡訊驗證，不是繞過 OTP 直接呼叫這支
 * API（見草案 A.3）。
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = liffCompleteBindRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const secret = process.env.BOOKING_TOKEN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "系統設定錯誤，請稍後再試" }, { status: 500 });
  }

  const verifyResult = await verifyLineIdToken(parsed.data.idToken);
  if (!verifyResult.ok) {
    return NextResponse.json({ error: verifyResult.error }, { status: 401 });
  }

  const cookieStore = await cookies();
  const bookSessionToken = cookieStore.get(BOOK_SESSION_COOKIE)?.value;
  if (!bookSessionToken || !verifyBookingSession(bookSessionToken, parsed.data.phone, secret)) {
    return NextResponse.json({ error: "請先完成手機驗證" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { customerId } = await findOrCreateCustomerForMember(
    supabase,
    parsed.data.phone,
    verifyResult.lineUserId,
    verifyResult.name
  );

  // 同 liff-bind：走到這裡代表這支手機當下一定能用 LIFF 完成登入，
  // 順手清掉可能誤標或過期的封鎖標記（見 §2.3 解封鎖恢復路徑）。
  await clearLineNotifyBlockedFlag(supabase, verifyResult.lineUserId);

  const { token } = createMemberSession(customerId, verifyResult.lineUserId, secret);
  const response = NextResponse.json({ ok: true });
  setMemberSessionCookie(response, token);
  response.cookies.delete(BOOK_SESSION_COOKIE);
  return response;
}
