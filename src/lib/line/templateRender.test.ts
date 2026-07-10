import { describe, expect, it } from "vitest";
import { renderTemplate } from "./templateRender";

describe("renderTemplate", () => {
  it("190) 字串裡的 {{var}} 換成對應值", () => {
    expect(renderTemplate("您好 {{name}}", { name: "陳小姐" })).toBe("您好 陳小姐");
  });

  it("191) 巢狀物件與陣列裡的字串都會被替換", () => {
    const content = {
      title: "預約成功",
      bodyLines: ["日期：{{date}}", "師傅：{{staffName}}"],
      nested: { footerNote: "地址在 {{addr}}" },
    };
    const result = renderTemplate(content, { date: "2026-07-16", staffName: "陳師傅", addr: "屏東" });
    expect(result).toEqual({
      title: "預約成功",
      bodyLines: ["日期：2026-07-16", "師傅：陳師傅"],
      nested: { footerNote: "地址在 屏東" },
    });
  });

  it("192) 找不到對應變數時換成空字串，不留下 {{var}} 原樣", () => {
    expect(renderTemplate("金額：{{amount}}", {})).toBe("金額：");
  });

  it("193) null 值原樣保留，不會噴錯", () => {
    const content = { title: "標題", footerNote: null as string | null };
    expect(renderTemplate(content, { title: "x" })).toEqual({ title: "標題", footerNote: null });
  });
});
