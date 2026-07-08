import { createHmac, timingSafeEqual } from "crypto";

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

/**
 * Signs an arbitrary JSON-serializable payload into a compact, tamper-evident
 * token (base64url(payload).base64url(hmac)). No encryption — the payload is
 * readable, only the signature is protected. Callers must not put secrets in
 * the payload itself.
 */
export function signToken(payload: unknown, secret: string): string {
  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = sign(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

/**
 * Verifies and decodes a token produced by signToken(). Returns null on any
 * malformed input or signature mismatch — constant-time comparison to avoid
 * timing side-channels on the signature check.
 */
export function verifyToken<T>(token: string, secret: string): T | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;

  const expected = sign(payloadB64, secret);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, actualBuf)) return null;

  try {
    return JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
