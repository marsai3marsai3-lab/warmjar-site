import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfileForAdmin, type AdminProfile } from "./profiles";
import { isOwnerRole } from "./permissions";

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

async function getAuthorizedAdminUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (!getAdminEmails().includes(user.email ?? "")) return null;
  return user;
}

/**
 * For Server Components/pages under /admin. src/proxy.ts already gates
 * /admin/:path* at the edge, so this is defense-in-depth — kept because it's
 * cheap and matches the existing admin/courses precedent.
 */
export async function requireAdminUser(): Promise<{ user: User; profile: AdminProfile }> {
  const user = await getAuthorizedAdminUser();
  if (!user) redirect("/login");
  const profile = await getOrCreateProfileForAdmin(user);
  return { user, profile };
}

/**
 * For Server Actions. proxy.ts's matcher covers page loads reliably, but a
 * Server Action can in principle be invoked directly — every mutating action
 * re-checks here rather than trusting the page that rendered the button.
 * Throws instead of redirecting: the caller is a fetch-like RPC, not a
 * navigation, so the client should see and handle an error, not be redirected.
 */
export async function requireAdminForAction(): Promise<{ user: User; profile: AdminProfile }> {
  const user = await getAuthorizedAdminUser();
  if (!user) throw new Error("請先登入管理後台");
  const profile = await getOrCreateProfileForAdmin(user);
  return { user, profile };
}

/**
 * Phase 3-3 第一刀 owner/manager 分流：黑名單切換、內部評分、退款標記
 * 這幾個動作專用。跟 requireAdminForAction 一樣以 throw 表示未授權
 * （呼叫端是 Server Action，不是頁面導航），但額外要求 role === 'owner'
 * ——manager 就算通過 email 白名單也會在這裡被擋下，不能只靠前端藏
 * 按鈕，因為 Server Action 可以被直接呼叫。
 */
export async function requireOwnerForAction(): Promise<{ user: User; profile: AdminProfile }> {
  const { user, profile } = await requireAdminForAction();
  if (!isOwnerRole(profile.role)) throw new Error("此操作僅限店主執行");
  return { user, profile };
}

/**
 * Phase 4：整頁面都是 owner 限定的頁面（抽成率設定、日結報表）用這個，
 * 跟 requireAdminUser 一樣是頁面導航情境（redirect，不是 throw）——
 * manager 進來這幾頁不該看到殘缺的畫面或錯誤訊息，直接導回行事曆。
 */
export async function requireOwnerUser(): Promise<{ user: User; profile: AdminProfile }> {
  const { user, profile } = await requireAdminUser();
  if (!isOwnerRole(profile.role)) redirect("/admin/calendar");
  return { user, profile };
}
