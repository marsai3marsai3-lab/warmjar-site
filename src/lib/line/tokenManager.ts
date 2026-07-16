import { getLineCoreConfig, type LineCoreConfig } from "./lineConfig";

const LINE_TOKEN_URL = "https://api.line.me/oauth2/v3/token";
// stateless token 官方效期 15 分鐘，提前 3 分鐘（第 12 分鐘）視為該重發，
// 留緩衝避免「快取剛好在請求送出瞬間過期」的邊界情況。
const REFRESH_BUFFER_MS = 3 * 60 * 1000;

export type FetchLike = typeof fetch;

export type TokenCacheState = { token: string; expiresAt: number } | null;

export type IssueTokenOutcome = { ok: true; token: string; expiresInSeconds: number } | { ok: false; error: string };

export type IssueTokenFn = () => Promise<IssueTokenOutcome>;

export type AccessTokenResult = { ok: true; token: string } | { ok: false; error: string };

export type ResolveAccessTokenResult =
  | { ok: true; token: string; cache: TokenCacheState }
  | { ok: false; error: string; cache: TokenCacheState };

/**
 * 純函式核心：給定目前快取狀態與時間，決定「用快取」或「重新發行」，
 * 發行失敗時降級用 fallbackToken（過渡期用的長期 token，見
 * docs/phase6-stage-split-design.md §2.1，最終會棄用）。issueToken 由
 * 呼叫端注入，不用真的打 LINE API 就能測完四種情境。
 */
export async function resolveAccessToken(
  cache: TokenCacheState,
  now: number,
  issueToken: IssueTokenFn,
  fallbackToken: string | undefined
): Promise<ResolveAccessTokenResult> {
  if (cache && cache.expiresAt - REFRESH_BUFFER_MS > now) {
    console.log("[tokenManager] cache hit");
    return { ok: true, token: cache.token, cache };
  }

  const issued = await issueToken();
  if (issued.ok) {
    console.log("[tokenManager] issued new token");
    return {
      ok: true,
      token: issued.token,
      cache: { token: issued.token, expiresAt: now + issued.expiresInSeconds * 1000 },
    };
  }

  if (fallbackToken) {
    // 降級路徑，驗收/維運要能一眼看出這不是正常狀態——過渡期 fallback
    // 本來就該是罕見事件，見 docs/phase6-stage-split-design.md §2.1。
    console.warn("[tokenManager] WARN: fallback to static token — stateless issuance may be failing");
    return { ok: true, token: fallbackToken, cache };
  }

  return { ok: false, error: issued.error, cache };
}

async function issueStatelessToken(config: LineCoreConfig, fetchImpl: FetchLike): Promise<IssueTokenOutcome> {
  const res = await fetchImpl(LINE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.channelId,
      client_secret: config.channelSecret,
    }).toString(),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `token 發行失敗 (${res.status}): ${body}` };
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  return { ok: true, token: data.access_token, expiresInSeconds: data.expires_in };
}

let moduleCache: TokenCacheState = null;

/** 正式程式碼呼叫的入口：真的打 LINE API、用模組層級的記憶體快取。 */
export async function getAccessToken(fetchImpl: FetchLike = fetch): Promise<AccessTokenResult> {
  const config = getLineCoreConfig();
  if (!config) return { ok: false, error: "LINE 尚未設定（缺少環境變數）" };

  const result = await resolveAccessToken(
    moduleCache,
    Date.now(),
    () => issueStatelessToken(config, fetchImpl),
    process.env.LINE_CHANNEL_ACCESS_TOKEN
  );
  moduleCache = result.cache;
  return result.ok ? { ok: true, token: result.token } : { ok: false, error: result.error };
}
