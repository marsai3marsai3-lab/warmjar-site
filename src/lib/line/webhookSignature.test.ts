import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyLineSignature } from "./webhookSignature";

const SECRET = "test-channel-secret";

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64");
}

describe("verifyLineSignature", () => {
  it("194) 正確簽章通過驗證", () => {
    const body = '{"events":[]}';
    expect(verifyLineSignature(body, sign(body, SECRET), SECRET)).toBe(true);
  });

  it("195) 錯誤的簽章值不通過", () => {
    const body = '{"events":[]}';
    expect(verifyLineSignature(body, "not-the-real-signature", SECRET)).toBe(false);
  });

  it("196) 缺少簽章 header 不通過", () => {
    expect(verifyLineSignature('{"events":[]}', null, SECRET)).toBe(false);
  });

  it("197) body 被竄改後簽章對不上（用舊 body 簽的章去驗新 body）", () => {
    const originalBody = '{"events":[]}';
    const tamperedBody = '{"events":["injected"]}';
    expect(verifyLineSignature(tamperedBody, sign(originalBody, SECRET), SECRET)).toBe(false);
  });
});
