import { NextResponse } from "next/server";
import { sendOtpRequestSchema } from "@/lib/booking/schemas";
import { createOtpChallenge } from "@/lib/booking/otpSession";

const OTP_COOKIE = "book_otp_challenge";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = sendOtpRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "手機號碼格式錯誤" }, { status: 400 });
  }

  const secret = process.env.BOOKING_TOKEN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "系統設定錯誤，請稍後再試" }, { status: 500 });
  }

  const { code, token, expiresAt } = createOtpChallenge(parsed.data.phone, secret);

  // 尚未串接簡訊商，這裡只簽出驗證碼並存進 cookie，真正「發送簡訊」這一步
  // 還沒實作。開發環境直接把驗證碼帶在回應裡方便本機測試；正式上線前必須
  // 接上真的簡訊商，並把 devCode 整段拿掉。
  console.log(`[book:send-otp] phone=${parsed.data.phone} code=${code}`);

  const response = NextResponse.json({
    ok: true,
    expiresAt,
    devCode: process.env.NODE_ENV === "production" ? undefined : code,
  });

  response.cookies.set(OTP_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 5 * 60,
  });

  return response;
}
