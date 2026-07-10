import { describe, expect, it } from "vitest";
import { buildFlexMessage, buildTextMessage } from "./flexMessageBuilder";

describe("buildFlexMessage", () => {
  it("213) 產生的 Flex JSON 包含標題、內文行、footer 按鈕", () => {
    const msg = buildFlexMessage("預約成功", {
      title: "預約成功",
      bodyLines: ["日期：2026-07-16", "師傅：陳師傅"],
      footerNote: "地址在屏東",
      buttonText: "查看我的預約",
      buttonUrl: "https://example.com/member",
    }) as { type: string; altText: string; contents: { footer?: unknown } };

    expect(msg.type).toBe("flex");
    expect(msg.altText).toBe("預約成功");
    expect(JSON.stringify(msg)).toContain("日期：2026-07-16");
    expect(JSON.stringify(msg)).toContain("地址在屏東");
    expect(msg.contents.footer).toBeDefined();
  });

  it("214) 沒有按鈕文字/連結時不產生 footer 區塊", () => {
    const msg = buildFlexMessage("提醒", {
      title: "提醒",
      bodyLines: ["內容"],
    }) as { contents: { footer?: unknown } };
    expect(msg.contents.footer).toBeUndefined();
  });
});

describe("buildTextMessage", () => {
  it("215) 純文字訊息直接帶原文", () => {
    expect(buildTextMessage({ text: "您好" })).toEqual({ type: "text", text: "您好" });
  });
});
