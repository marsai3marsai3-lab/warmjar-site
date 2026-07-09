import { describe, expect, it } from "vitest";
import {
  findExactPhoneMatch,
  hasLinkDrifted,
  isLinkedToCustomer,
  type CustomerCandidate,
} from "./customerAutofill";

const ALICE: CustomerCandidate = { id: "c1", name: "王小美", phone: "0912345678" };
const BOB: CustomerCandidate = { id: "c2", name: "陳大文", phone: "0987654321" };

describe("findExactPhoneMatch", () => {
  it("52) 完整 10 碼且與候選清單中某人完全相符時回傳該客人", () => {
    expect(findExactPhoneMatch([ALICE, BOB], "0912345678")).toEqual(ALICE);
  });

  it("53) 不滿 10 碼時一律回傳 null，不做部分比對", () => {
    expect(findExactPhoneMatch([ALICE, BOB], "091234")).toBeNull();
  });

  it("54) 滿 10 碼但清單中沒有完全相符的候選人時回傳 null（視為新客）", () => {
    expect(findExactPhoneMatch([ALICE, BOB], "0900000000")).toBeNull();
  });

  it("55) 候選清單為空時回傳 null", () => {
    expect(findExactPhoneMatch([], "0912345678")).toBeNull();
  });
});

describe("hasLinkDrifted", () => {
  it("56) 尚未連結任何舊客時視為沒有漂移（本來就是新客模式）", () => {
    expect(hasLinkDrifted(null, "王小美", "0912345678")).toBe(false);
  });

  it("57) 欄位內容與連結的舊客快照完全相同時沒有漂移", () => {
    expect(hasLinkDrifted(ALICE, "王小美", "0912345678")).toBe(false);
  });

  it("58) 手動改動姓名後視為漂移，脫離舊客連結", () => {
    expect(hasLinkDrifted(ALICE, "王小美（改）", "0912345678")).toBe(true);
  });

  it("59) 手動改動電話後視為漂移，脫離舊客連結", () => {
    expect(hasLinkDrifted(ALICE, "王小美", "0900000000")).toBe(true);
  });
});

describe("isLinkedToCustomer", () => {
  it("60) 有連結且欄位未被改動時回傳 true（顯示「舊客」標籤）", () => {
    expect(isLinkedToCustomer(ALICE, "王小美", "0912345678")).toBe(true);
  });

  it("61) 有連結但欄位已被改動時回傳 false（回到新客模式）", () => {
    expect(isLinkedToCustomer(ALICE, "王小美", "0900000000")).toBe(false);
  });

  it("62) 從未連結過時回傳 false", () => {
    expect(isLinkedToCustomer(null, "新客人", "0911111111")).toBe(false);
  });
});
