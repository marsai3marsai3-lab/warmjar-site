import { describe, expect, it } from "vitest";
import { isOwnerRole } from "./permissions";

describe("isOwnerRole", () => {
  it("96) role 為 'owner' 時回傳 true", () => {
    expect(isOwnerRole("owner")).toBe(true);
  });

  it("97) role 為 'manager'/'staff'/'customer' 時回傳 false", () => {
    expect(isOwnerRole("manager")).toBe(false);
    expect(isOwnerRole("staff")).toBe(false);
    expect(isOwnerRole("customer")).toBe(false);
  });
});
