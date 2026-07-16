import { requireOwnerUser } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchMessageTemplates, fetchNotificationSchedule, fetchPushEnabled } from "@/lib/line/messageTemplatesData";
import { MessageTemplateSettings } from "@/components/admin/MessageTemplateSettings";

export default async function MessageTemplatesPage() {
  await requireOwnerUser();
  const supabase = createAdminClient();

  const [templates, schedule, pushEnabled] = await Promise.all([
    fetchMessageTemplates(supabase),
    fetchNotificationSchedule(supabase),
    fetchPushEnabled(supabase),
  ]);

  return <MessageTemplateSettings templates={templates} schedule={schedule} pushEnabled={pushEnabled} />;
}
