import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const DEFAULT_ADMIN_ROLE = "manager";

export type AdminProfile = { id: string; role: string };

/**
 * profiles is currently unpopulated project-wide (nothing ever inserted into
 * it — see Phase 3-2 planning notes). The first time a given admin performs
 * an audited action, provision their profile row lazily rather than
 * requiring manual setup. Defaults to the minimum-privilege role; bump to
 * 'owner' by hand for real owners (see supabase/testing-notes.md).
 */
export async function getOrCreateProfileForAdmin(user: User): Promise<AdminProfile> {
  const supabase = createAdminClient();

  const existing = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  const inserted = await supabase
    .from("profiles")
    .insert({
      role: DEFAULT_ADMIN_ROLE,
      auth_user_id: user.id,
      display_name: user.email ?? null,
    })
    .select("id, role")
    .single();

  if (inserted.error) {
    // Two near-simultaneous first actions from the same admin can race on
    // the UNIQUE(auth_user_id) insert, same pattern as findOrCreateCustomer.
    if ((inserted.error as { code?: string }).code === "23505") {
      const retry = await supabase
        .from("profiles")
        .select("id, role")
        .eq("auth_user_id", user.id)
        .single();
      if (retry.error) throw retry.error;
      return retry.data;
    }
    throw inserted.error;
  }

  return inserted.data;
}
