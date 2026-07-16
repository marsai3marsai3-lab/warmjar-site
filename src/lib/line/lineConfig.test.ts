import { afterEach, describe, expect, it, vi } from "vitest";
import { getLineCoreConfig } from "./lineConfig";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getLineCoreConfig", () => {
  it("220) channelId／channelSecret 都有時回傳物件", () => {
    vi.stubEnv("LINE_CHANNEL_ID", "id-1");
    vi.stubEnv("LINE_CHANNEL_SECRET", "secret-1");
    expect(getLineCoreConfig()).toEqual({ channelId: "id-1", channelSecret: "secret-1" });
  });

  it("221) 缺 LINE_CHANNEL_ID 回傳 null", () => {
    vi.stubEnv("LINE_CHANNEL_ID", "");
    vi.stubEnv("LINE_CHANNEL_SECRET", "secret-1");
    expect(getLineCoreConfig()).toBeNull();
  });

  it("222) 缺 LINE_CHANNEL_SECRET 回傳 null——不再受 LINE_CHANNEL_ACCESS_TOKEN 有無影響（對應 review 落差 1）", () => {
    vi.stubEnv("LINE_CHANNEL_ID", "id-1");
    vi.stubEnv("LINE_CHANNEL_SECRET", "");
    vi.stubEnv("LINE_CHANNEL_ACCESS_TOKEN", "");
    expect(getLineCoreConfig()).toBeNull();
  });
});
