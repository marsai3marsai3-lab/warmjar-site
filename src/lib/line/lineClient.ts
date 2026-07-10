import { getLineConfig } from "./lineConfig";
import type { LineMessage } from "./flexMessageBuilder";

const LINE_API_BASE = "https://api.line.me/v2/bot";
const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

export type PushResult = { ok: true } | { ok: false; error: string };

export async function pushLineMessage(to: string, messages: LineMessage[]): Promise<PushResult> {
  const config = getLineConfig();
  if (!config) return { ok: false, error: "LINE 尚未設定（缺少環境變數）" };

  const res = await fetch(`${LINE_API_BASE}/message/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.channelAccessToken}`,
    },
    body: JSON.stringify({ to, messages }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `LINE API 錯誤 (${res.status}): ${body}` };
  }
  return { ok: true };
}

export type LineIdTokenVerifyResult = { ok: true; lineUserId: string; name?: string } | { ok: false; error: string };

/**
 * 呼叫 LINE 官方 verify endpoint 解出 idToken 對應的 userId（sub）。
 * 刻意不做本地 JWKS 驗簽——見 docs/phase-6-line-integration-draft.md
 * A.4 的取捨說明：綁定/登入不是高頻操作，換一次網路往返省掉自己維護
 * JWKS 快取更新邏輯的成本是划算的。
 */
export async function verifyLineIdToken(idToken: string): Promise<LineIdTokenVerifyResult> {
  const config = getLineConfig();
  if (!config) return { ok: false, error: "LINE 尚未設定（缺少環境變數）" };

  const res = await fetch(LINE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: config.channelId }).toString(),
  });

  if (!res.ok) return { ok: false, error: "idToken 驗證失敗，請重新登入" };

  const data = (await res.json()) as { sub?: string; name?: string };
  if (!data.sub) return { ok: false, error: "idToken 沒有解出使用者識別碼" };
  return { ok: true, lineUserId: data.sub, name: data.name };
}
