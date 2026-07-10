import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { renderTemplate } from "./templateRender";
import { buildFlexMessage, buildTextMessage, type FlexTemplateContent, type TextTemplateContent } from "./flexMessageBuilder";
import { pushLineMessage } from "./lineClient";

export type SendNotificationInput = {
  customerId: string;
  templateKey: string;
  vars: Record<string, string>;
  relatedAppointmentId?: string | null;
  triggeredBy: "system_cron" | "system_event" | "admin_manual";
  operatorId?: string | null;
};

export type SendNotificationResult =
  | { status: "sent" }
  | { status: "failed"; error: string }
  | { status: "skipped"; reason: string };

/**
 * 排程掃描（system_cron）的呼叫端必須自己先過濾掉
 * notifications_log 已經有成功紀錄的 (appointment, template)——這支
 * 函式只負責「查範本、查客人有沒有能通知的 LINE 身分、渲染、送出、
 * 寫 log」，不做排程層級的去重判斷（那是 idx_notifications_log_dedupe
 * 加上呼叫端查詢在防的事，手動單發 admin_manual 本來就不受去重限制）。
 */
export async function sendNotification(
  supabase: SupabaseClient<Database>,
  input: SendNotificationInput
): Promise<SendNotificationResult> {
  const templateRes = await supabase
    .from("message_templates")
    .select("channel, content, is_active")
    .eq("key", input.templateKey)
    .maybeSingle();

  if (templateRes.error || !templateRes.data || !templateRes.data.is_active) {
    return finish(supabase, input, { status: "skipped", reason: "範本不存在或已停用" });
  }

  const customerRes = await supabase
    .from("customers")
    .select("profile_id, profiles ( line_user_id, line_notify_blocked )")
    .eq("id", input.customerId)
    .maybeSingle();

  const lineUserId = customerRes.data?.profiles?.line_user_id ?? null;
  const blocked = customerRes.data?.profiles?.line_notify_blocked ?? false;

  if (customerRes.error || !lineUserId) {
    return finish(supabase, input, { status: "skipped", reason: "客人尚未綁定 LINE" });
  }
  if (blocked) {
    return finish(supabase, input, { status: "skipped", reason: "客人已封鎖官方帳號" });
  }

  const message =
    templateRes.data.channel === "line_text"
      ? buildTextMessage(renderTemplate(templateRes.data.content as unknown as TextTemplateContent, input.vars))
      : buildFlexAndRender(templateRes.data.content as unknown as FlexTemplateContent, input.vars);

  const pushResult = await pushLineMessage(lineUserId, [message]);

  return finish(
    supabase,
    input,
    pushResult.ok ? { status: "sent" } : { status: "failed", error: pushResult.error }
  );
}

function buildFlexAndRender(content: FlexTemplateContent, vars: Record<string, string>) {
  const rendered = renderTemplate(content, vars);
  return buildFlexMessage(rendered.title, rendered);
}

async function finish(
  supabase: SupabaseClient<Database>,
  input: SendNotificationInput,
  result: SendNotificationResult
): Promise<SendNotificationResult> {
  await supabase.from("notifications_log").insert({
    customer_id: input.customerId,
    template_key: input.templateKey,
    related_appointment_id: input.relatedAppointmentId ?? null,
    status: result.status,
    error_message: result.status === "failed" ? result.error : result.status === "skipped" ? result.reason : null,
    triggered_by: input.triggeredBy,
    operator_id: input.operatorId ?? null,
  });
  return result;
}
