import { createHash } from "crypto";

export type EcpayParams = Record<string, string | number>;

/**
 * ECPay's CheckMacValue spec is defined against .NET's HttpUtility.UrlEncode,
 * which differs from JS's encodeURIComponent (encodeURIComponent additionally
 * leaves "-_.!~*'()" unescaped, and encodes space as %20 instead of +).
 * Empirically verified against ECPay's real staging AioCheckOut endpoint —
 * a request signed with this exact transform renders their real checkout
 * page; a tampered CheckMacValue renders their "CheckMacValue Error." page.
 */
function dotNetStyleUrlEncode(input: string): string {
  return encodeURIComponent(input)
    .toLowerCase()
    .replace(/%2d/g, "-")
    .replace(/%5f/g, "_")
    .replace(/%2e/g, ".")
    .replace(/%21/g, "!")
    .replace(/%2a/g, "*")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")")
    .replace(/%20/g, "+");
}

function buildSignableString(params: EcpayParams, hashKey: string, hashIV: string): string {
  const entries = Object.entries(params).filter(([key]) => key !== "CheckMacValue");
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const joined = entries.map(([key, value]) => `${key}=${value}`).join("&");
  return `HashKey=${hashKey}&${joined}&HashIV=${hashIV}`;
}

export function generateCheckMacValue(params: EcpayParams, hashKey: string, hashIV: string): string {
  const raw = buildSignableString(params, hashKey, hashIV);
  const encoded = dotNetStyleUrlEncode(raw);
  return createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

/**
 * Verifies an incoming ECPay payload (e.g. the payment webhook). Comparison
 * is case-insensitive since ECPay's own CheckMacValue casing isn't
 * contractually guaranteed even though we always emit uppercase ourselves.
 */
export function verifyCheckMacValue(
  params: Record<string, string>,
  hashKey: string,
  hashIV: string
): boolean {
  const received = params.CheckMacValue;
  if (!received) return false;
  const expected = generateCheckMacValue(params, hashKey, hashIV);
  return expected.toUpperCase() === received.toUpperCase();
}
