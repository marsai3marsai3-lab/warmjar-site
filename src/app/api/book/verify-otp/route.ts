import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyOtpRequestSchema } from "@/lib/booking/schemas";
import { createBookingSession, verifyOtpChallenge } from "@/lib/booking/otpSession";

const OTP_COOKIE = "book_otp_challenge";
const SESSION_COOKIE = "book_session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = verifyOtpRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "驗證碼格式錯誤" }, { status: 400 });
  }

  const secret = process.env.BOOKING_TOKEN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "系統設定錯誤，請稍後再試" }, { status: 500 });
  }

  const cookieStore = await cookies();
  const challengeToken = cookieStore.get(OTP_COOKIE)?.value;

  if (
    !challengeToken ||
    !verifyOtpChallenge(challengeToken, parsed.data.phone, parsed.data.code, secret)
  ) {
    return NextResponse.json({ error: "驗證碼錯誤或已過期，請重新發送" }, { status: 400 });
  }

  const { token } = createBookingSession(parsed.data.phone, secret);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 20 * 60,
  });
  response.cookies.delete(OTP_COOKIE);

  return response;
}
