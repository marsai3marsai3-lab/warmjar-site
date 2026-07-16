import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLineIdToken } from "@/lib/line/lineClient";
import { liffBindRequestSchema } from "@/lib/member/schemas";
import { findCustomerIdByLineUserId } from "@/lib/booking/customersForMember";
import { createMemberSession } from "@/lib/booking/otpSession";
import { setMemberSessionCookie } from "@/lib/member/session";
import { clearLineNotifyBlockedFlag } from "@/lib/line/notificationSender";

/**
 * 前端每次打開 /member 都先打這支——同時扮演「首次檢查」跟「之後每次
 * 登入」兩種情況的入口，靠「查不查得到這個 line_user_id 對應的客人」
 * 分岔（見 docs/phase-6-line-integration-draft.md A.3）。第一次找不到
 * 時回傳 bound:false，前端才多問一次手機號碼走 OTP 補綁流程。
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = liffBindRequestSchema.safeParse(body);
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

  const supabase = createAdminClient();
  const customerId = await findCustomerIdByLineUserId(supabase, verifyResult.lineUserId);

  if (!customerId) {
    return NextResponse.json({ ok: true, bound: false });
  }

  // 能成功走到這裡代表這支手機當下一定能打開 LIFF、拿到 idToken——
  // 不可能是被封鎖的狀態，順手清掉可能誤標或過期的封鎖標記（見
  // notificationSender.ts 的 clearLineNotifyBlockedFlag 註解、
  // docs/phase6-stage-split-design.md §2.3 解封鎖恢復路徑）。
  await clearLineNotifyBlockedFlag(supabase, verifyResult.lineUserId);

  const { token } = createMemberSession(customerId, verifyResult.lineUserId, secret);
  const response = NextResponse.json({ ok: true, bound: true });
  setMemberSessionCookie(response, token);
  return response;
}
