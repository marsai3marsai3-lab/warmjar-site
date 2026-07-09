import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfileForAdmin, type AdminProfile } from "./profiles";

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
