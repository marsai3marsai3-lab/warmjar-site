import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { verifyMemberSession } from "@/lib/booking/otpSession";

export const MEMBER_SESSION_COOKIE = "member_session";

export async function getMemberSession(): Promise<{ customerId: string; lineUserId: string } | null> {
  const secret = process.env.BOOKING_TOKEN_SECRET;
  if (!secret) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(MEMBER_SESSION_COOKIE)?.value;
  if (!token) return null;

  return verifyMemberSession(token, secret);
}

export function setMemberSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(MEMBER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}
