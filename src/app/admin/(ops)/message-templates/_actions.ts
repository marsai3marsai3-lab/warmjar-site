"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwnerForAction } from "@/lib/admin/auth";
import { writeAuditLog } from "@/lib/booking/auditLog";
import {
  updateMessageTemplate,
  updateNotificationSchedule,
  updatePushEnabled,
  type NotificationSchedule,
} from "@/lib/line/messageTemplatesData";
import type { FlexTemplateContent } from "@/lib/line/flexMessageBuilder";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * 只開放固定版型的欄位（標題/內文行/註腳/按鈕），不是自由 Flex JSON
 * 編輯器——避免手滑打壞整份訊息結構（見
 * docs/phase-6-line-integration-draft.md B.2）。
 */
export async function updateMessageTemplateAction(
  templateId: string,
  input: { content: FlexTemplateContent; isActive: boolean }
): Promise<ActionResult> {
  try {
    const { profile } = await requireOwnerForAction();
    const supabase = createAdminClient();

    if (!input.content.title.trim()) {
      return { ok: false, error: "標題不能空白" };
    }

    await updateMessageTemplate(supabase, templateId, input, profile.id);

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.message_template.update",
      targetTable: "message_templates",
      targetId: templateId,
      after: input,
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

/**
 * Phase 7-A §5.4：上線後的緊急關閉開關，owner 限定（跟退費/改抽成率
 * 同一等級——這顆能讓全店推播瞬間停擺，不比照 §4.3 綁定按鈕的
 * manager/owner 皆可）。
 */
export async function updatePushEnabledAction(enabled: boolean): Promise<ActionResult> {
  try {
    const { profile } = await requireOwnerForAction();
    const supabase = createAdminClient();

    await updatePushEnabled(supabase, enabled, profile.id);

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.push_enabled.update",
      targetTable: "system_settings",
      after: { push_enabled: enabled },
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function updateNotificationScheduleAction(schedule: NotificationSchedule): Promise<ActionResult> {
  try {
    const { profile } = await requireOwnerForAction();
    const supabase = createAdminClient();

    if (!TIME_PATTERN.test(schedule.reminder_day_before) || !TIME_PATTERN.test(schedule.revisit_care)) {
      return { ok: false, error: "時間格式錯誤，請用 24 小時制 HH:MM" };
    }

    await updateNotificationSchedule(supabase, schedule, profile.id);

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.notification_schedule.update",
      targetTable: "system_settings",
      after: schedule,
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}
