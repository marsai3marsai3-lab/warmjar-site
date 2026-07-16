import { getLineLoginChannelId } from "./lineConfig";
import { getAccessToken, type AccessTokenResult } from "./tokenManager";
import type { LineMessage } from "./flexMessageBuilder";

const LINE_API_BASE = "https://api.line.me/v2/bot";
const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

export type FetchLike = typeof fetch;
export type GetAccessTokenFn = (fetchImpl?: FetchLike) => Promise<AccessTokenResult>;

type PushDeps = { getToken?: GetAccessTokenFn; fetchImpl?: FetchLike };

export type PushResult = { ok: true } | { ok: false; error: string };

export async function pushLineMessage(to: string, messages: LineMessage[], deps: PushDeps = {}): Promise<PushResult> {
  const getToken = deps.getToken ?? getAccessToken;
  const fetchImpl = deps.fetchImpl ?? fetch;

  const tokenRes = await getToken(fetchImpl);
  if (!tokenRes.ok) return { ok: false, error: tokenRes.error };

  const res = await fetchImpl(`${LINE_API_BASE}/message/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenRes.token}`,
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
 * client_id（audience）用 LINE_LOGIN_CHANNEL_ID，不是 Messaging API 的
 * channelId——LINE 平台改制後 LIFF app 必須掛在獨立的 LINE Login channel
 * 底下，idToken 的簽發/驗證對象是那個 Login channel，見
 * docs/phase6-stage-split-design.md v2.2 平台變更因應。刻意不做本地
 * JWKS 驗簽——見 docs/phase-6-line-integration-draft.md A.4 的取捨說明：
 * 綁定/登入不是高頻操作，換一次網路往返省掉自己維護 JWKS 快取更新邏輯
 * 的成本是划算的。
 */
export async function verifyLineIdToken(idToken: string, fetchImpl: FetchLike = fetch): Promise<LineIdTokenVerifyResult> {
  const loginChannelId = getLineLoginChannelId();
  if (!loginChannelId) return { ok: false, error: "LINE Login channel 尚未設定（缺少環境變數 LINE_LOGIN_CHANNEL_ID）" };

  const res = await fetchImpl(LINE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: loginChannelId }).toString(),
  });

  if (!res.ok) return { ok: false, error: "idToken 驗證失敗，請重新登入" };

  const data = (await res.json()) as { sub?: string; name?: string };
  if (!data.sub) return { ok: false, error: "idToken 沒有解出使用者識別碼" };
  return { ok: true, lineUserId: data.sub, name: data.name };
}

export type ProfileReachability = "reachable" | "not_reachable" | "check_failed";

/**
 * Push Message API 對「已封鎖／已刪除帳號」的收件對象回傳的是 HTTP 200
 * （不是錯誤，訊息被靜默丟棄且不計額度），沒有任何欄位可以拿來判斷對方
 * 是否已封鎖——這是 LINE 官方文件明載的行為，詳見
 * docs/phase6-stage-split-design.md §2.3 的查證紀錄。GET /v2/bot/profile
 * 對「已封鎖/非好友」對象回傳 404，是目前唯一有回應差異可用的訊號，
 * 用來在推播前先做一次前置檢查（反應式偵測，Stage 6B webhook 事件驅動
 * 標記上線後降級為第二道防線，見同一節）。
 */
export async function checkLineProfileReachable(lineUserId: string, deps: PushDeps = {}): Promise<ProfileReachability> {
  const getToken = deps.getToken ?? getAccessToken;
  const fetchImpl = deps.fetchImpl ?? fetch;

  const tokenRes = await getToken(fetchImpl);
  if (!tokenRes.ok) return "check_failed";

  const res = await fetchImpl(`${LINE_API_BASE}/profile/${lineUserId}`, {
    headers: { Authorization: `Bearer ${tokenRes.token}` },
  });

  if (res.status === 404) return "not_reachable";
  if (res.ok) return "reachable";
  return "check_failed";
}

export type MessageQuotaResult =
  | { ok: true; limitType: "none" | "limited"; limitValue: number | null; totalUsage: number }
  | { ok: false; error: string };

/** 日結報表用：本月訊息上限（quota）+ 本月已發送則數（quota/consumption）。 */
export async function getMessageQuotaStatus(deps: PushDeps = {}): Promise<MessageQuotaResult> {
  const getToken = deps.getToken ?? getAccessToken;
  const fetchImpl = deps.fetchImpl ?? fetch;

  const tokenRes = await getToken(fetchImpl);
  if (!tokenRes.ok) return { ok: false, error: tokenRes.error };

  const authHeaders = { Authorization: `Bearer ${tokenRes.token}` };
  const [quotaRes, consumptionRes] = await Promise.all([
    fetchImpl(`${LINE_API_BASE}/message/quota`, { headers: authHeaders }),
    fetchImpl(`${LINE_API_BASE}/message/quota/consumption`, { headers: authHeaders }),
  ]);

  if (!quotaRes.ok || !consumptionRes.ok) {
    return { ok: false, error: `額度查詢失敗 (quota:${quotaRes.status}/consumption:${consumptionRes.status})` };
  }

  const quota = (await quotaRes.json()) as { type: "none" | "limited"; value?: number };
  const consumption = (await consumptionRes.json()) as { totalUsage: number };

  return {
    ok: true,
    limitType: quota.type,
    limitValue: quota.value ?? null,
    totalUsage: consumption.totalUsage,
  };
}
