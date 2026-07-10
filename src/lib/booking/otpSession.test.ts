import { describe, expect, it } from "vitest";
import {
  createBookingSession,
  createMemberSession,
  createOtpChallenge,
  verifyBookingSession,
  verifyMemberSession,
  verifyOtpChallenge,
} from "./otpSession";

const SECRET = "test-secret";
const PHONE = "0912345678";

describe("otpSession", () => {
  it("accepts the correct code before expiry", () => {
    const now = new Date("2026-07-10T02:00:00.000Z");
    const { code, token } = createOtpChallenge(PHONE, SECRET, now);
    expect(verifyOtpChallenge(token, PHONE, code, SECRET, now)).toBe(true);
  });

  it("rejects a wrong code", () => {
    const now = new Date("2026-07-10T02:00:00.000Z");
    const { token } = createOtpChallenge(PHONE, SECRET, now);
    expect(verifyOtpChallenge(token, PHONE, "000000", SECRET, now)).toBe(false);
  });

  it("rejects a code once it has expired", () => {
    const now = new Date("2026-07-10T02:00:00.000Z");
    const { code, token } = createOtpChallenge(PHONE, SECRET, now);
    const later = new Date(now.getTime() + 6 * 60 * 1000);
    expect(verifyOtpChallenge(token, PHONE, code, SECRET, later)).toBe(false);
  });

  it("rejects a code presented for a different phone number", () => {
    const now = new Date("2026-07-10T02:00:00.000Z");
    const { code, token } = createOtpChallenge(PHONE, SECRET, now);
    expect(verifyOtpChallenge(token, "0900000000", code, SECRET, now)).toBe(false);
  });

  it("does not accept an OTP challenge token as a booking session", () => {
    const now = new Date("2026-07-10T02:00:00.000Z");
    const { code, token } = createOtpChallenge(PHONE, SECRET, now);
    expect(verifyOtpChallenge(token, PHONE, code, SECRET, now)).toBe(true);
    expect(verifyBookingSession(token, PHONE, SECRET, now)).toBe(false);
  });

  it("issues a booking session that verifies before expiry and fails after", () => {
    const now = new Date("2026-07-10T02:00:00.000Z");
    const { token } = createBookingSession(PHONE, SECRET, now);
    expect(verifyBookingSession(token, PHONE, SECRET, now)).toBe(true);

    const later = new Date(now.getTime() + 21 * 60 * 1000);
    expect(verifyBookingSession(token, PHONE, SECRET, later)).toBe(false);
  });

  it("210) member session：驗證成功回傳 customerId/lineUserId，而不只是 boolean", () => {
    const now = new Date("2026-07-10T02:00:00.000Z");
    const { token } = createMemberSession("customer-1", "U1234567890", SECRET, now);
    expect(verifyMemberSession(token, SECRET, now)).toEqual({
      customerId: "customer-1",
      lineUserId: "U1234567890",
    });
  });

  it("211) member session 7 天後過期", () => {
    const now = new Date("2026-07-10T02:00:00.000Z");
    const { token } = createMemberSession("customer-1", "U1234567890", SECRET, now);
    const eightDaysLater = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
    expect(verifyMemberSession(token, SECRET, eightDaysLater)).toBeNull();
  });

  it("212) booking session token 不能被當成 member session 使用（kind 互斥）", () => {
    const now = new Date("2026-07-10T02:00:00.000Z");
    const { token } = createBookingSession(PHONE, SECRET, now);
    expect(verifyMemberSession(token, SECRET, now)).toBeNull();
  });
});
