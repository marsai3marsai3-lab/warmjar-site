import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { FlexTemplateContent } from "./flexMessageBuilder";
import { taipeiDayRangeUTC } from "@/lib/admin/dateUtils";

export type MessageTemplate = {
  id: string;
  key: string;
  name: string;
  channel: string;
  content: FlexTemplateContent;
  isActive: boolean;
};

export async function fetchMessageTemplates(
  supabase: SupabaseClient<Database>,
  activeOnly = false
): Promise<MessageTemplate[]> {
  let query = supabase.from("message_templates").select("id, key, name, channel, content, is_active").order("key");
  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((t) => ({
    id: t.id,
    key: t.key,
    name: t.name,
    channel: t.channel,
    content: t.content as unknown as FlexTemplateContent,
    isActive: t.is_active,
  }));
}

export async function updateMessageTemplate(
  supabase: SupabaseClient<Database>,
  templateId: string,
  input: { content: FlexTemplateContent; isActive: boolean },
  updatedBy: string
): Promise<void> {
  const { error } = await supabase
    .from("message_templates")
    .update({ content: input.content as unknown as Database["public"]["Tables"]["message_templates"]["Row"]["content"], is_active: input.isActive, updated_by: updatedBy, updated_at: new Date().toISOString() })
    .eq("id", templateId);
  if (error) throw error;
}

export type NotificationSchedule = { reminder_day_before: string; revisit_care: string };

export async function fetchNotificationSchedule(supabase: SupabaseClient<Database>): Promise<NotificationSchedule> {
  const { data, error } = await supabase.from("system_settings").select("value").eq("key", "notification_schedule").maybeSingle();
  if (error) throw error;
  const value = (data?.value ?? {}) as Partial<NotificationSchedule>;
  return {
    reminder_day_before: value.reminder_day_before ?? "20:00",
    revisit_care: value.revisit_care ?? "12:30",
  };
}

export async function updateNotificationSchedule(
  supabase: SupabaseClient<Database>,
  schedule: NotificationSchedule,
  updatedBy: string
): Promise<void> {
  const { error } = await supabase
    .from("system_settings")
    .update({ value: schedule, updated_at: new Date().toISOString(), updated_by: updatedBy })
    .eq("key", "notification_schedule");
  if (error) throw error;
}

/** 手動單發每日上限（決策 3）用——只算今天、admin_manual、成功送出的次數。 */
export async function fetchManualSendCountToday(
  supabase: SupabaseClient<Database>,
  customerId: string,
  todayISO: string
): Promise<number> {
  const { start, end } = taipeiDayRangeUTC(todayISO);
  const { count, error } = await supabase
    .from("notifications_log")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .eq("triggered_by", "admin_manual")
    .eq("status", "sent")
    .gte("created_at", start)
    .lt("created_at", end);
  if (error) throw error;
  return count ?? 0;
}
