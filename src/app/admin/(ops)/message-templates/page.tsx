import { requireOwnerUser } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchMessageTemplates, fetchNotificationSchedule } from "@/lib/line/messageTemplatesData";
import { MessageTemplateSettings } from "@/components/admin/MessageTemplateSettings";

export default async function MessageTemplatesPage() {
  await requireOwnerUser();
  const supabase = createAdminClient();

  const [templates, schedule] = await Promise.all([
    fetchMessageTemplates(supabase),
    fetchNotificationSchedule(supabase),
  ]);

  return <MessageTemplateSettings templates={templates} schedule={schedule} />;
}
