import { signToken, verifyToken } from "./signedToken";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const BOOKING_SESSION_TTL_MS = 20 * 60 * 1000;

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
