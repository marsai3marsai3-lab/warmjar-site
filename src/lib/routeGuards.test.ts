import { describe, expect, it } from "vitest";
import { isProtectedPath } from "./routeGuards";

/**
 * 這支測試驗證的是「登出後訪問 /admin 會被導回 /login」這條規則的判斷
 * 邏輯本身（isProtectedPath && !user 才會觸發 proxy.ts 的 redirect），
 * 不是模擬瀏覽器實際登出再訪問——這個專案沒有裝 Playwright/Cypress
 * 之類的 E2E 框架，proxy.ts 本身因為要呼叫真的 Supabase 網路請求也不
 * 適合單元測試。這裡測的是「規則本身對不對」，實際登出後的行為要靠
 * 手動驗收確認。
 */
describe("isProtectedPath", () => {
  it("169) /admin 與其子路徑都受保護", () => {
    expect(isProtectedPath("/admin")).toBe(true);
    expect(isProtectedPath("/admin/calendar")).toBe(true);
    expect(isProtectedPath("/admin/checkout/new")).toBe(true);
  });

  it("170) /dashboard 與其子路徑受保護", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/dashboard/orders")).toBe(true);
  });

  it("171) 課程單元頁（/courses/[slug]/[lesson]）受保護，但課程列表/介紹頁不受保護", () => {
    expect(isProtectedPath("/courses/warmjar-101/lesson-1")).toBe(true);
    expect(isProtectedPath("/courses")).toBe(false);
    expect(isProtectedPath("/courses/warmjar-101")).toBe(false);
  });

  it("172) 官網公開頁面不受保護", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/about")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/book")).toBe(false);
  });
});
