import { createAdminClient } from "@/lib/supabase/admin";

// Broadcast-only channel, not backed by RLS/postgres_changes (see Phase 3-2
// planning notes + supabase/testing-notes.md: this project has zero RLS
// policies anywhere, so a plain public broadcast channel is the consistent
// choice — same "authorize in app code, not in Postgres" model as everywhere
// else). Payload is intentionally free of customer PII: listeners just
// re-fetch through the normal authenticated page load.
export const CALENDAR_CHANNEL = "admin:calendar";
export const CALENDAR_EVENT = "appointment_changed";

export type CalendarChangePayload = {
  appointmentId: string;
  date: string;
};

export async function broadcastCalendarChange(payload: CalendarChangePayload): Promise<void> {
  const supabase = createAdminClient();
  const channel = supabase.channel(CALENDAR_CHANNEL);
  await channel.httpSend(CALENDAR_EVENT, payload);
}
