import { createHmac, timingSafeEqual } from "crypto";

/**
 * LINE webhook 簽章驗證：x-line-signature = base64(HMAC-SHA256(channel
 * secret, rawBody))。呼叫端必須傳「原始 body 字串」（request.text()），
 * 不能先 JSON.parse 再 JSON.stringify 回去——那個往返不保證跟 LINE 送
 * 來的原始 bytes 完全一致，簽章會對不上。
 */
export function verifyLineSignature(rawBody: string, signatureHeader: string | null, channelSecret: string): boolean {
  if (!signatureHeader) return false;

  const expected = createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
