import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLineIdToken } from "@/lib/line/lineClient";
import { verifyCounterBindGrant } from "@/lib/member/counterBindGrant";
import { bindLineUserIdToCustomer } from "@/lib/booking/customersForMember";
import { counterBindCompleteRequestSchema } from "@/lib/member/schemas";
import { createMemberSession } from "@/lib/booking/otpSession";
import { setMemberSessionCookie } from "@/lib/member/session";
import { clearLineNotifyBlockedFlag } from "@/lib/line/notificationSender";

/**
 * 櫃檯代客綁定的完成端點（Phase 7-A §4.3）。跟 liff-complete-bind 的
 * 差異：不需要 book_session／OTP 那條證明「本人擁有這支手機」的路徑
 * ——這裡的信任錨點換成 grantToken（店員目視核對客人身分後才產生，
 * 10 分鐘短效），customerId 完全來自 grantToken 解出來的值，不接受
 * 請求 body 裡任何客戶端自稱的 customerId（比照既有 D.2 原則）。
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = counterBindCompleteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const secret = process.env.BOOKING_TOKEN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "系統設定錯誤，請稍後再試" }, { status: 500 });
  }

  const grant = verifyCounterBindGrant(parsed.data.grantToken, secret);
  if (!grant) {
    return NextResponse.json({ error: "綁定連結已過期或無效，請店員重新產生一次" }, { status: 401 });
  }

  const verifyResult = await verifyLineIdToken(parsed.data.idToken);
  if (!verifyResult.ok) {
    return NextResponse.json({ error: verifyResult.error }, { status: 401 });
  }

  const supabase = createAdminClient();
  const bindResult = await bindLineUserIdToCustomer(
    supabase,
    grant.customerId,
    verifyResult.lineUserId,
    verifyResult.name
  );
  if (!bindResult.ok) {
    // 已知會發生的衝突情況（例如客人換過 LINE 帳號、舊 userId 卡位），
    // 不是伺服器錯誤——見 design-log.md 掛帳的「管理端 LINE 解綁功能」，
    // 過渡期由管理員手動清除該客人的 profiles.line_user_id 後才能重試。
    return NextResponse.json(
      { error: "這位客人已綁定其他 LINE 帳號，請洽店家管理員協助解除舊綁定" },
      { status: 409 }
    );
  }

  // 同 liff-bind／liff-complete-bind：走到這裡代表這支帳號當下一定能用
  // LIFF 完成登入，順手清掉可能誤標或過期的封鎖標記。
  await clearLineNotifyBlockedFlag(supabase, verifyResult.lineUserId);

  const { token } = createMemberSession(grant.customerId, verifyResult.lineUserId, secret);
  const response = NextResponse.json({ ok: true });
  setMemberSessionCookie(response, token);
  return response;
}
