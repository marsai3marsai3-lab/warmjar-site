import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "./signedToken";

describe("signedToken", () => {
  it("round-trips a payload signed and verified with the same secret", () => {
    const token = signToken({ phone: "0912345678", exp: 1000 }, "secret-a");
    const decoded = verifyToken<{ phone: string; exp: number }>(token, "secret-a");
    expect(decoded).toEqual({ phone: "0912345678", exp: 1000 });
  });

  it("rejects a token verified with a different secret", () => {
    const token = signToken({ phone: "0912345678", exp: 1000 }, "secret-a");
    expect(verifyToken(token, "secret-b")).toBeNull();
  });

  it("rejects a tampered payload even if the signature segment is untouched", () => {
    const token = signToken({ phone: "0912345678", exp: 1000 }, "secret-a");
    const [, signature] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ phone: "0900000000", exp: 1000 })
    ).toString("base64url");
    expect(verifyToken(`${tamperedPayload}.${signature}`, "secret-a")).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyToken("not-a-token", "secret-a")).toBeNull();
    expect(verifyToken("a.b.c", "secret-a")).toBeNull();
    expect(verifyToken("", "secret-a")).toBeNull();
  });
});
