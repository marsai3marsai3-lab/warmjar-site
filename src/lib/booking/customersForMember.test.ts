import { describe, expect, it } from "vitest";
import { decideExistingBindOutcome } from "./customersForMember";

describe("decideExistingBindOutcome", () => {
  it("回傳成功（冪等）：目前已綁定的 line_user_id 跟這次要綁的是同一個", () => {
    expect(decideExistingBindOutcome("U1234567890", "U1234567890")).toEqual({ ok: true });
  });

  it("回傳衝突：目前已綁定的 line_user_id 跟這次要綁的不同", () => {
    expect(decideExistingBindOutcome("U1111111111", "U2222222222")).toEqual({
      ok: false,
      reason: "already_bound_to_different_line_user",
    });
  });
});
