import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLineIdToken } from "@/lib/line/lineClient";
import { liffBindRequestSchema } from "@/lib/member/schemas";
import { findCustomerIdByLineUserId } from "@/lib/booking/customersForMember";
import { createBookingSession } from "@/lib/booking/otpSession";

const SESSION_COOKIE = "book_session";

/**
 * Phase 6 A.1：/book 在 LINE 內開啟時的免驗證捷徑——只有當這個
 * line_user_id 已經綁定過某位客人（通常是先在 /member 完成過 OTP
 * 綁定），才直接簽發 book_session（等同已經走完 OTP），讓
 * BookingWizard 跳過整個手機驗證步驟。查不到就回 bound:false，
 * BookingWizard 照舊走原本的 OTP 流程——非 LINE 環境完全不受影響。
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = liffBindRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ bound: false });
  }

  const secret = process.env.BOOKING_TOKEN_SECRET;
  if (!secret) return NextResponse.json({ bound: false });

  const verifyResult = await verifyLineIdToken(parsed.data.idToken);
  if (!verifyResult.ok) return NextResponse.json({ bound: false });

  const supabase = createAdminClient();
  const customerId = await findCustomerIdByLineUserId(supabase, verifyResult.lineUserId);
  if (!customerId) return NextResponse.json({ bound: false });

  const customerRes = await supabase.from("customers").select("name, phone").eq("id", customerId).maybeSingle();
  if (customerRes.error || !customerRes.data?.phone) return NextResponse.json({ bound: false });

  const { token } = createBookingSession(customerRes.data.phone, secret);
  const response = NextResponse.json({ bound: true, name: customerRes.data.name, phone: customerRes.data.phone });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 20 * 60,
  });
  return response;
}
