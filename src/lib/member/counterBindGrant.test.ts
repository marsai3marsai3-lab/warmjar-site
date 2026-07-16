import { describe, expect, it } from "vitest";
import { signToken } from "@/lib/booking/signedToken";
import { createCounterBindGrant, verifyCounterBindGrant } from "./counterBindGrant";

const SECRET = "test-secret";
const CUSTOMER_ID = "customer-1";
const STAFF_PROFILE_ID = "staff-profile-1";

describe("counterBindGrant", () => {
  it("verifies a freshly issued grant and returns customerId/issuedBy", () => {
    const now = new Date("2026-07-22T04:00:00.000Z");
    const { token } = createCounterBindGrant(CUSTOMER_ID, STAFF_PROFILE_ID, SECRET, now);
    expect(verifyCounterBindGrant(token, SECRET, now)).toEqual({
      customerId: CUSTOMER_ID,
      issuedBy: STAFF_PROFILE_ID,
    });
  });

  it("accepts the grant right up until the 10-minute TTL boundary", () => {
    const now = new Date("2026-07-22T04:00:00.000Z");
    const { token } = createCounterBindGrant(CUSTOMER_ID, STAFF_PROFILE_ID, SECRET, now);
    const justBefore = new Date(now.getTime() + 10 * 60 * 1000 - 1);
    expect(verifyCounterBindGrant(token, SECRET, justBefore)).not.toBeNull();
  });

  it("rejects the grant once the 10-minute TTL has passed", () => {
    const now = new Date("2026-07-22T04:00:00.000Z");
    const { token } = createCounterBindGrant(CUSTOMER_ID, STAFF_PROFILE_ID, SECRET, now);
    const later = new Date(now.getTime() + 10 * 60 * 1000);
    expect(verifyCounterBindGrant(token, SECRET, later)).toBeNull();
  });

  it("rejects a tampered token (wrong secret)", () => {
    const now = new Date("2026-07-22T04:00:00.000Z");
    const { token } = createCounterBindGrant(CUSTOMER_ID, STAFF_PROFILE_ID, SECRET, now);
    expect(verifyCounterBindGrant(token, "wrong-secret", now)).toBeNull();
  });

  it("rejects a token with the same shape but a different kind (kind 互斥)", () => {
    // 沿用 otpSession.ts 既有的 kind 互斥慣例：就算 payload 欄位長得一樣、
    // 用同一把 secret 簽出來，kind 對不上就該被拒絕，不能被跨用途重放。
    const now = new Date("2026-07-22T04:00:00.000Z");
    const foreignToken = signToken(
      { kind: "member_session", customerId: CUSTOMER_ID, issuedBy: STAFF_PROFILE_ID, expiresAt: now.getTime() + 60_000 },
      SECRET
    );
    expect(verifyCounterBindGrant(foreignToken, SECRET, now)).toBeNull();
  });

  it("rejects a malformed token string", () => {
    expect(verifyCounterBindGrant("not-a-valid-token", SECRET)).toBeNull();
  });

  it("grant payload carries customerId and issuedBy distinctly (not swapped)", () => {
    const now = new Date("2026-07-22T04:00:00.000Z");
    const { token } = createCounterBindGrant("customer-2", "staff-profile-2", SECRET, now);
    const result = verifyCounterBindGrant(token, SECRET, now);
    expect(result?.customerId).toBe("customer-2");
    expect(result?.issuedBy).toBe("staff-profile-2");
  });
});
