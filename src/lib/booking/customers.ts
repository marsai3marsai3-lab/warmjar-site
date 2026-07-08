import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export async function findOrCreateCustomer(
  supabase: SupabaseClient<Database>,
  phone: string,
  name: string
): Promise<{ id: string }> {
  const existing = await supabase.from("customers").select("id").eq("phone", phone).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return { id: existing.data.id };

  const inserted = await supabase
    .from("customers")
    .insert({ phone, name, source: "web" })
    .select("id")
    .single();

  if (inserted.error) {
    // Two concurrent first-time bookings with the same new phone number can
    // both miss the row above and race on the same UNIQUE(phone) insert.
    if ((inserted.error as { code?: string }).code === "23505") {
      const retry = await supabase.from("customers").select("id").eq("phone", phone).single();
      if (retry.error) throw retry.error;
      return { id: retry.data.id };
    }
    throw inserted.error;
  }

  return { id: inserted.data.id };
}
