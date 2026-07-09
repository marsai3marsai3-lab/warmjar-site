import { describe, expect, it } from "vitest";
import { classifySearch, isBirthdayInMonth, resolveLastVisit } from "./memberData";

describe("classifySearch", () => {
  it("104) 純數字且 >= 4 碼視為電話前綴搜尋", () => {
    expect(classifySearch("0912")).toEqual({ field: "phone", value: "0912" });
  });

  it("105) 純數字但不滿 4 碼時不搜尋（回傳 null）", () => {
    expect(classifySearch("091")).toBeNull();
  });

  it("106) 非純數字且 >= 2 字視為姓名搜尋", () => {
    expect(classifySearch("王小美")).toEqual({ field: "name", value: "王小美" });
  });

  it("107) 非純數字但不滿 2 字時不搜尋（回傳 null）", () => {
    expect(classifySearch("王")).toBeNull();
  });

  it("108) 前後空白會先被裁掉再判斷長度", () => {
    expect(classifySearch("  09  ")).toBeNull();
    expect(classifySearch("  0912  ")).toEqual({ field: "phone", value: "0912" });
  });
});

describe("isBirthdayInMonth", () => {
  it("109) 生日月份跟指定月份相符時回傳 true", () => {
    expect(isBirthdayInMonth("1990-07-15", 7)).toBe(true);
  });

  it("110) 生日月份不符時回傳 false", () => {
    expect(isBirthdayInMonth("1990-03-15", 7)).toBe(false);
  });

  it("111) 生日為 null 時回傳 false（不會誤判成任何月份都符合）", () => {
    expect(isBirthdayInMonth(null, 7)).toBe(false);
  });
});

describe("resolveLastVisit", () => {
  it("112) 有真實 last_visit_at 時優先採用（Phase 4 結帳寫入後的行為）", () => {
    expect(resolveLastVisit("2026-07-01T00:00:00.000Z", "2026-06-01")).toBe("2026-07-01T00:00:00.000Z");
  });

  it("113) 沒有真實 last_visit_at 時退回 completed 預約的最近日期", () => {
    expect(resolveLastVisit(null, "2026-06-01")).toBe("2026-06-01");
  });

  it("114) 兩者都沒有時回傳 null", () => {
    expect(resolveLastVisit(null, null)).toBeNull();
  });
});
