import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAccessToken, type IssueTokenFn, type TokenCacheState } from "./tokenManager";

const NOW = new Date("2026-07-15T10:00:00+08:00").getTime();

function failingIssue(error = "network error"): IssueTokenFn {
  return vi.fn(async () => ({ ok: false as const, error }));
}

describe("resolveAccessToken", () => {
  it("223) 快取未進入刷新緩衝期（離過期還很久）直接用快取，不呼叫 issueToken", async () => {
    const issueToken = vi.fn();
    const cache: TokenCacheState = { token: "cached-token", expiresAt: NOW + 10 * 60 * 1000 };

    const result = await resolveAccessToken(cache, NOW, issueToken, undefined);

    expect(result).toEqual({ ok: true, token: "cached-token", cache });
    expect(issueToken).not.toHaveBeenCalled();
  });

  it("224) 快取已進入刷新緩衝期（3 分鐘內到期）重新發行，回傳新 token 與新快取", async () => {
    const issueToken: IssueTokenFn = vi.fn(async () => ({ ok: true as const, token: "fresh-token", expiresInSeconds: 900 }));
    const cache: TokenCacheState = { token: "stale-token", expiresAt: NOW + 60 * 1000 }; // 剩 1 分鐘,在 3 分鐘緩衝內

    const result = await resolveAccessToken(cache, NOW, issueToken, undefined);

    expect(result).toEqual({
      ok: true,
      token: "fresh-token",
      cache: { token: "fresh-token", expiresAt: NOW + 900 * 1000 },
    });
    expect(issueToken).toHaveBeenCalledTimes(1);
  });

  it("225) 完全沒有快取（首次呼叫）發行新 token", async () => {
    const issueToken: IssueTokenFn = vi.fn(async () => ({ ok: true as const, token: "first-token", expiresInSeconds: 900 }));

    const result = await resolveAccessToken(null, NOW, issueToken, undefined);

    expect(result.ok).toBe(true);
    expect(result).toMatchObject({ token: "first-token" });
  });

  it("226) 發行失敗但有過渡期 fallback token 時，降級使用 fallback，不覆蓋既有快取", async () => {
    const cache: TokenCacheState = { token: "stale-token", expiresAt: NOW - 1000 };
    const result = await resolveAccessToken(cache, NOW, failingIssue("LINE API 500"), "fallback-long-lived-token");

    expect(result).toEqual({ ok: true, token: "fallback-long-lived-token", cache });
  });

  it("227) 發行失敗且沒有 fallback token 時回傳失敗", async () => {
    const result = await resolveAccessToken(null, NOW, failingIssue("LINE API 500"), undefined);

    expect(result).toEqual({ ok: false, error: "LINE API 500", cache: null });
  });
});

// 這三支測 console 輸出，是這個專案目前唯一一組這樣寫的測試——其餘
// 一律走純函式回傳值或 DI 注入斷言。特例理由：這三行 log 存在的唯一
// 目的就是給真機驗收時查 server log 用（見 phase6-stage6a1-
// acceptance-guide.md 驗收 1-3/1-4），不驗證「真的有印出來」的話，這個
// 功能自己就沒有測試覆蓋的意義。
describe("resolveAccessToken 的驗收用 log 輸出", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("248) 快取命中時印出 [tokenManager] cache hit", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const cache: TokenCacheState = { token: "cached-token", expiresAt: NOW + 10 * 60 * 1000 };

    await resolveAccessToken(cache, NOW, vi.fn(), undefined);

    expect(logSpy).toHaveBeenCalledWith("[tokenManager] cache hit");
  });

  it("249) 發行新 token 時印出 [tokenManager] issued new token", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const issueToken: IssueTokenFn = vi.fn(async () => ({ ok: true as const, token: "fresh-token", expiresInSeconds: 900 }));

    await resolveAccessToken(null, NOW, issueToken, undefined);

    expect(logSpy).toHaveBeenCalledWith("[tokenManager] issued new token");
  });

  it("250) 降級用 fallback 時印出帶 WARN 字樣的警示 log，且不外洩 token 值本身", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await resolveAccessToken(null, NOW, failingIssue("LINE API 500"), "fallback-secret-token-value");

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const loggedText = warnSpy.mock.calls[0].join(" ");
    expect(loggedText).toContain("[tokenManager] WARN");
    expect(loggedText).not.toContain("fallback-secret-token-value");
  });
});
