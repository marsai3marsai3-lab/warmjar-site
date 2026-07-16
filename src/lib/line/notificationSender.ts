import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { renderTemplate } from "./templateRender";
import { buildFlexMessage, buildTextMessage, type FlexTemplateContent, type TextTemplateContent } from "./flexMessageBuilder";
import { pushLineMessage, checkLineProfileReachable, type ProfileReachability } from "./lineClient";

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

export type SendNotificationDeps = {
  checkReachable?: typeof checkLineProfileReachable;
  push?: typeof pushLineMessage;
};

export type SendDecision = { action: "send" } | { action: "skip"; reason: string; markBlocked?: boolean };

/**
 * 純函式：給定「有沒有可推播的 LINE 身分」「DB 裡既有的封鎖標記」
 * 「這次推播前置檢查（GetProfile）的結果」，決定要不要送、要不要順便
 * 標記封鎖。GetProfile 對「已封鎖」跟「從未加好友」都回 404，設計上
 * 不區分兩者（處置相同：推不到），log 原因統一記 "profile_404"——見
 * docs/phase6-stage-split-design.md §2.3。check_failed（前置檢查本身
 * 網路/API 錯誤）不誤判封鎖，照常送出，讓 push 那層自己處理錯誤。
 */
export function decideSendAction(params: {
  lineUserId: string | null;
  alreadyBlocked: boolean;
  reachability: ProfileReachability;
}): SendDecision {
  if (!params.lineUserId) return { action: "skip", reason: "客人尚未綁定 LINE" };
  if (params.alreadyBlocked) return { action: "skip", reason: "客人已封鎖官方帳號" };
  if (params.reachability === "not_reachable") {
    return { action: "skip", reason: "profile_404", markBlocked: true };
  }
  return { action: "send" };
}

/**
 * 排程掃描（system_cron）的呼叫端必須自己先過濾掉
 * notifications_log 已經有成功紀錄的 (appointment, template)——這支
 * 函式只負責「查範本、查客人有沒有能通知的 LINE 身分、渲染、送出、
 * 寫 log」，不做排程層級的去重判斷（那是 idx_notifications_log_dedupe
 * 加上呼叫端查詢在防的事，手動單發 admin_manual 本來就不受去重限制）。
 */
export async function sendNotification(
  supabase: SupabaseClient<Database>,
  input: SendNotificationInput,
  deps: SendNotificationDeps = {}
): Promise<SendNotificationResult> {
  const checkReachable = deps.checkReachable ?? checkLineProfileReachable;
  const push = deps.push ?? pushLineMessage;

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
  const alreadyBlocked = customerRes.data?.profiles?.line_notify_blocked ?? false;

  // 只有「還沒被標記封鎖」的情況才需要花一次額外 API 呼叫做前置檢查，
  // 已知封鎖的直接短路，不浪費呼叫（見 §2.3）。
  const reachability: ProfileReachability =
    lineUserId && !alreadyBlocked ? await checkReachable(lineUserId) : "reachable";

  const decision = decideSendAction({ lineUserId, alreadyBlocked, reachability });

  if (decision.action === "skip") {
    if (decision.markBlocked && lineUserId) {
      await supabase.from("profiles").update({ line_notify_blocked: true }).eq("line_user_id", lineUserId);
    }
    return finish(supabase, input, { status: "skipped", reason: decision.reason });
  }

  const message =
    templateRes.data.channel === "line_text"
      ? buildTextMessage(renderTemplate(templateRes.data.content as unknown as TextTemplateContent, input.vars))
      : buildFlexAndRender(templateRes.data.content as unknown as FlexTemplateContent, input.vars);

  const pushResult = await push(lineUserId as string, [message]);

  return finish(
    supabase,
    input,
    pushResult.ok ? { status: "sent" } : { status: "failed", error: pushResult.error }
  );
}

/**
 * 供「建立預約」類呼叫端共用：發 booking_confirmed，失敗不外露、不
 * 影響呼叫端（建單）本身是否成功——比照 /book/create-appointment 既有
 * 的 fire-and-forget 慣例，抽成獨立函式方便單元測試覆蓋「呼叫參數
 * 是否正確」跟「失敗確實不會往外拋」這兩件事（見
 * appointments/new/_actions.ts 的呼叫端；驗收 1-2 發現後台代客建單
 * 原本完全沒接這支，補上時一併抽出，見 design-log.md）。triggeredBy
 * 固定用 "system_event"，跟 /book 那條路共用同一個值（不用
 * "admin_manual"）——語意上兩者都是「預約建立成功事件觸發」，且能
 * 讓這裡自動吃到既有的 idx_notifications_log_dedupe 保護；
 * "admin_manual" 語意不同（既有的「會員詳情頁手動單發」功能專用，
 * 故意排除在那個唯一索引外），不能混用。要分辨這筆通知是哪個 UI
 * 觸發的，查 appointments.source，不靠 triggered_by 承擔。
 */
export async function notifyBookingConfirmed(
  supabase: SupabaseClient<Database>,
  params: { customerId: string; relatedAppointmentId: string; vars: Record<string, string> },
  send: typeof sendNotification = sendNotification
): Promise<void> {
  try {
    await send(supabase, {
      customerId: params.customerId,
      templateKey: "booking_confirmed",
      relatedAppointmentId: params.relatedAppointmentId,
      triggeredBy: "system_event",
      vars: params.vars,
    });
  } catch {
    // 通知失敗不影響呼叫端（建單）本身，靜默略過。
  }
}

/**
 * 解封鎖恢復路徑：客人成功完成 LIFF 登入/綁定，代表他當下一定不是
 * 封鎖狀態（能打開 LIFF、能拿到 idToken），不管 line_notify_blocked
 * 是被 §2.3 的前置檢查誤標，還是舊資料，一律清除。呼叫端見
 * liff-bind／liff-complete-bind 兩支 route（登入成功的當下）。單行
 * DB 寫入、無分支邏輯，比照 webhook route 既有的同類寫法不另外寫
 * mock 測試，改在 Stage 6A-1 驗收標準用真機覆蓋（見
 * docs/phase6-stage-split-design.md §2.3）。
 */
export async function clearLineNotifyBlockedFlag(supabase: SupabaseClient<Database>, lineUserId: string): Promise<void> {
  await supabase.from("profiles").update({ line_notify_blocked: false }).eq("line_user_id", lineUserId);
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
