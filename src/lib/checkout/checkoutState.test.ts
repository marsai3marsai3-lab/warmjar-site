import { describe, expect, it } from "vitest";
import {
  canBringIntoCheckout,
  canReopenCheckout,
  canShowReopenButton,
  canShowVoidButton,
  canVoidCheckout,
} from "./checkoutState";

describe("canVoidCheckout / canReopenCheckout", () => {
  it("145) completed 狀態可以作廢", () => {
    expect(canVoidCheckout("completed")).toBe(true);
  });

  it("146) voided／refunded 狀態不能再作廢一次", () => {
    expect(canVoidCheckout("voided")).toBe(false);
    expect(canVoidCheckout("refunded")).toBe(false);
  });

  it("147) voided 狀態可以重開", () => {
    expect(canReopenCheckout("voided")).toBe(true);
  });

  it("148) completed／refunded 狀態不能重開（沒被作廢就不用重開）", () => {
    expect(canReopenCheckout("completed")).toBe(false);
    expect(canReopenCheckout("refunded")).toBe(false);
  });
});

describe("canShowVoidButton / canShowReopenButton — owner 限定", () => {
  it("149) owner + completed：可作廢", () => {
    expect(canShowVoidButton(true, "completed")).toBe(true);
  });

  it("150) manager + completed：不可作廢（權限不足）", () => {
    expect(canShowVoidButton(false, "completed")).toBe(false);
  });

  it("151) owner + voided：可重開", () => {
    expect(canShowReopenButton(true, "voided")).toBe(true);
  });

  it("152) manager + voided：不可重開（權限不足）", () => {
    expect(canShowReopenButton(false, "voided")).toBe(false);
  });
});

describe("canBringIntoCheckout", () => {
  it("163) completed 狀態可以帶入結帳（不論有沒有報到）", () => {
    expect(canBringIntoCheckout("completed", false)).toBe(true);
    expect(canBringIntoCheckout("completed", true)).toBe(true);
  });

  it("164) confirmed 且已報到可以帶入結帳", () => {
    expect(canBringIntoCheckout("confirmed", true)).toBe(true);
  });

  it("165) confirmed 但尚未報到不能帶入結帳", () => {
    expect(canBringIntoCheckout("confirmed", false)).toBe(false);
  });

  it("166) pending_deposit/cancelled/no_show 都不能帶入結帳", () => {
    expect(canBringIntoCheckout("pending_deposit", false)).toBe(false);
    expect(canBringIntoCheckout("cancelled", false)).toBe(false);
    expect(canBringIntoCheckout("no_show", false)).toBe(false);
  });
});
