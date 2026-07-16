import { afterEach, describe, expect, it, vi } from "vitest";
import {
  pushLineMessage,
  verifyLineIdToken,
  checkLineProfileReachable,
  getMessageQuotaStatus,
  type FetchLike,
} from "./lineClient";

afterEach(() => {
  vi.unstubAllEnvs();
});

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const okToken = vi.fn(async () => ({ ok: true as const, token: "dynamic-token-abc" }));
const failToken = vi.fn(async () => ({ ok: false as const, error: "token 發行失敗" }));

describe("pushLineMessage", () => {
  it("228) getToken 失敗時直接回傳失敗，不呼叫 push endpoint", async () => {
    const fetchImpl = vi.fn() as unknown as FetchLike;
    const result = await pushLineMessage("U123", [{ type: "text", text: "hi" }], { getToken: failToken, fetchImpl });

    expect(result).toEqual({ ok: false, error: "token 發行失敗" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("229) 送出時 Authorization header 帶入 getToken 回傳的動態 token，不是寫死值", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, {})) as unknown as FetchLike;
    await pushLineMessage("U123", [{ type: "text", text: "hi" }], { getToken: okToken, fetchImpl });

    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer dynamic-token-abc");
  });

  it("230) push endpoint 回傳非 2xx 時回傳 failed 並附帶狀態碼", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(400, { message: "invalid" })) as unknown as FetchLike;
    const result = await pushLineMessage("U123", [{ type: "text", text: "hi" }], { getToken: okToken, fetchImpl });

    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toContain("400");
  });
});

describe("verifyLineIdToken", () => {
  it("231) 缺少 LINE_LOGIN_CHANNEL_ID 時回傳失敗，即使 Messaging API 的 LINE_CHANNEL_ID/SECRET 都有設定——兩者是獨立來源，不共用同一個 gate（平台改制後 v2.2 的核心行為）", async () => {
    vi.stubEnv("LINE_CHANNEL_ID", "messaging-id-1");
    vi.stubEnv("LINE_CHANNEL_SECRET", "messaging-secret-1");
    vi.stubEnv("LINE_LOGIN_CHANNEL_ID", "");
    const result = await verifyLineIdToken("some-id-token");
    expect(result.ok).toBe(false);
  });

  it("232) 送給 LINE 官方 verify endpoint 的 client_id（audience）是 LINE_LOGIN_CHANNEL_ID，不是 Messaging API 的 channelId", async () => {
    vi.stubEnv("LINE_CHANNEL_ID", "messaging-id-1");
    vi.stubEnv("LINE_CHANNEL_SECRET", "messaging-secret-1");
    vi.stubEnv("LINE_LOGIN_CHANNEL_ID", "login-channel-id-1");
    const fetchImpl = vi.fn(async () => jsonResponse(200, { sub: "U999" })) as unknown as FetchLike;

    await verifyLineIdToken("some-id-token", fetchImpl);

    const [, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    const body = new URLSearchParams(init.body as string);
    expect(body.get("client_id")).toBe("login-channel-id-1");
  });

  it("233) 驗證成功時回傳 idToken 解出的 sub 作為 lineUserId", async () => {
    vi.stubEnv("LINE_LOGIN_CHANNEL_ID", "login-channel-id-1");
    const fetchImpl = vi.fn(async () => jsonResponse(200, { sub: "U999", name: "陳小姐" })) as unknown as FetchLike;

    const result = await verifyLineIdToken("some-id-token", fetchImpl);
    expect(result).toEqual({ ok: true, lineUserId: "U999", name: "陳小姐" });
  });
});

describe("checkLineProfileReachable", () => {
  it("234) getToken 失敗時回傳 check_failed，不誤判封鎖", async () => {
    const fetchImpl = vi.fn() as unknown as FetchLike;
    const result = await checkLineProfileReachable("U123", { getToken: failToken, fetchImpl });
    expect(result).toBe("check_failed");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("235) GetProfile 回傳 404 時判定 not_reachable（已封鎖或非好友）", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(404, {})) as unknown as FetchLike;
    const result = await checkLineProfileReachable("U123", { getToken: okToken, fetchImpl });
    expect(result).toBe("not_reachable");
  });

  it("236) GetProfile 回傳 200 時判定 reachable", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { userId: "U123" })) as unknown as FetchLike;
    const result = await checkLineProfileReachable("U123", { getToken: okToken, fetchImpl });
    expect(result).toBe("reachable");
  });

  it("237) GetProfile 回傳其他錯誤（例如 500）時回傳 check_failed，不誤判封鎖", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(500, {})) as unknown as FetchLike;
    const result = await checkLineProfileReachable("U123", { getToken: okToken, fetchImpl });
    expect(result).toBe("check_failed");
  });
});

describe("getMessageQuotaStatus", () => {
  it("238) getToken 失敗時回傳失敗", async () => {
    const fetchImpl = vi.fn() as unknown as FetchLike;
    const result = await getMessageQuotaStatus({ getToken: failToken, fetchImpl });
    expect(result).toEqual({ ok: false, error: "token 發行失敗" });
  });

  it("239) 兩支 API 都成功時組合回傳上限與本月已用量", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { type: "limited", value: 1000 }))
      .mockResolvedValueOnce(jsonResponse(200, { totalUsage: 213 })) as unknown as FetchLike;

    const result = await getMessageQuotaStatus({ getToken: okToken, fetchImpl });
    expect(result).toEqual({ ok: true, limitType: "limited", limitValue: 1000, totalUsage: 213 });
  });

  it("240) 任一支 API 回傳非 2xx 時回傳失敗", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { type: "none" }))
      .mockResolvedValueOnce(jsonResponse(500, {})) as unknown as FetchLike;

    const result = await getMessageQuotaStatus({ getToken: okToken, fetchImpl });
    expect(result.ok).toBe(false);
  });
});
