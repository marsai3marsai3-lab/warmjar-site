import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";

export async function writeAuditLog(
  supabase: SupabaseClient<Database>,
  entry: {
    actorId?: string | null;
    action: string;
    targetTable: string;
    targetId?: string | null;
    before?: Json;
    after?: Json;
  }
): Promise<void> {
  await supabase.from("audit_logs").insert({
    actor_id: entry.actorId ?? null,
    action: entry.action,
    target_table: entry.targetTable,
    target_id: entry.targetId ?? null,
    before: entry.before ?? null,
    after: entry.after ?? null,
  });
}
