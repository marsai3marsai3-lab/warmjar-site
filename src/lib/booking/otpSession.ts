import { signToken, verifyToken } from "./signedToken";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const BOOKING_SESSION_TTL_MS = 20 * 60 * 1000;
// /member 是重複造訪的場景（不是 /book 那種一次性結帳流程），TTL 給
// 7 天；到期後 liff.getIDToken() 會自動拿新的重新驗證，客人不會感覺到
// 登出（見 docs/phase-6-line-integration-draft.md A.5）。
export const MEMBER_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// "kind" prevents an OTP challenge token from being replayed as a booking
// session token (or vice versa) even though both are signed with the same secret.
type OtpChallengePayload = {
  kind: "otp_challenge";
  phone: string;
  code: string;
  expiresAt: number;
};

type BookingSessionPayload = {
  kind: "booking_session";
  phone: string;
  expiresAt: number;
};

type MemberSessionPayload = {
  kind: "member_session";
  customerId: string;
  lineUserId: string;
  expiresAt: number;
};

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function createOtpChallenge(
  phone: string,
  secret: string,
  now: Date = new Date()
): { code: string; token: string; expiresAt: number } {
  const code = generateOtpCode();
  const expiresAt = now.getTime() + OTP_TTL_MS;
  const payload: OtpChallengePayload = { kind: "otp_challenge", phone, code, expiresAt };
  return { code, token: signToken(payload, secret), expiresAt };
}

export function verifyOtpChallenge(
  token: string,
  phone: string,
  code: string,
  secret: string,
  now: Date = new Date()
): boolean {
  const payload = verifyToken<OtpChallengePayload>(token, secret);
  if (!payload || payload.kind !== "otp_challenge") return false;
  if (payload.phone !== phone) return false;
  if (payload.code !== code) return false;
  if (payload.expiresAt <= now.getTime()) return false;
  return true;
}

export function createBookingSession(
  phone: string,
  secret: string,
  now: Date = new Date()
): { token: string; expiresAt: number } {
  const expiresAt = now.getTime() + BOOKING_SESSION_TTL_MS;
  const payload: BookingSessionPayload = { kind: "booking_session", phone, expiresAt };
  return { token: signToken(payload, secret), expiresAt };
}

export function verifyBookingSession(
  token: string,
  phone: string,
  secret: string,
  now: Date = new Date()
): boolean {
  const payload = verifyToken<BookingSessionPayload>(token, secret);
  if (!payload || payload.kind !== "booking_session") return false;
  if (payload.phone !== phone) return false;
  if (payload.expiresAt <= now.getTime()) return false;
  return true;
}

export function createMemberSession(
  customerId: string,
  lineUserId: string,
  secret: string,
  now: Date = new Date()
): { token: string; expiresAt: number } {
  const expiresAt = now.getTime() + MEMBER_SESSION_TTL_MS;
  const payload: MemberSessionPayload = { kind: "member_session", customerId, lineUserId, expiresAt };
  return { token: signToken(payload, secret), expiresAt };
}

/**
 * 回傳完整 payload（不只 boolean）——/member 底下的 API 都要從這裡拿
 * customerId，不接受請求參數裡客戶端自稱的 customerId（Phase 6 D.2）。
 */
export function verifyMemberSession(
  token: string,
  secret: string,
  now: Date = new Date()
): { customerId: string; lineUserId: string } | null {
  const payload = verifyToken<MemberSessionPayload>(token, secret);
  if (!payload || payload.kind !== "member_session") return null;
  if (payload.expiresAt <= now.getTime()) return null;
  return { customerId: payload.customerId, lineUserId: payload.lineUserId };
}
