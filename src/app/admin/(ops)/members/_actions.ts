"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminForAction, requireOwnerForAction } from "@/lib/admin/auth";
import { writeAuditLog } from "@/lib/booking/auditLog";
import { derivePaymentMethod } from "@/lib/checkout/checkoutValidation";
import { applyStoredValueTopup } from "@/lib/storedValue/storedValueData";
import { sendNotification } from "@/lib/line/notificationSender";
import { fetchManualSendCountToday } from "@/lib/line/messageTemplatesData";
import { canSendManualNotification } from "@/lib/admin/manualSendPolicy";
import { taipeiTodayISO } from "@/lib/admin/dateUtils";
import { buildBookingUrl, buildCounterBindUrl, buildMemberUrl } from "@/lib/line/liffLinks";
import { createCounterBindGrant } from "@/lib/member/counterBindGrant";
import { customerHasLineBinding } from "@/lib/booking/customersForMember";

type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateMemberProfile(
  customerId: string,
  input: { name: string; birthday?: string | null; internalNote?: string | null }
): Promise<ActionResult> {
  try {
    const { profile } = await requireAdminForAction();
    const supabase = createAdminClient();

    const current = await supabase
      .from("customers")
      .select("name, birthday, internal_note")
      .eq("id", customerId)
      .maybeSingle();
    if (current.error || !current.data) return { ok: false, error: "找不到這位會員" };

    const { error } = await supabase
      .from("customers")
      .update({ name: input.name, birthday: input.birthday ?? null, internal_note: input.internalNote ?? null })
      .eq("id", customerId);
    if (error) return { ok: false, error: "更新失敗，請稍後再試" };

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.member.update_profile",
      targetTable: "customers",
      targetId: customerId,
      before: current.data,
      after: input,
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

export async function createTag(name: string, color?: string): Promise<
  { ok: true; tag: { id: string; name: string; color: string | null } } | { ok: false; error: string }
> {
  try {
    await requireAdminForAction();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("tags")
      .insert({ name, color: color ?? null })
      .select("id, name, color")
      .single();
    if (error) return { ok: false, error: "建立標籤失敗，可能已存在同名標籤" };

    return { ok: true, tag: data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

export async function setCustomerTags(customerId: string, tagIds: string[]): Promise<ActionResult> {
  try {
    const { profile } = await requireAdminForAction();
    const supabase = createAdminClient();

    // replace-on-save，跟 saveRecurringSchedule 同一套模式：先刪再插，
    // 讓「目前這個客人身上有哪些標籤」永遠等於呼叫端傳進來的集合。
    const del = await supabase.from("customer_tags").delete().eq("customer_id", customerId);
    if (del.error) return { ok: false, error: "更新失敗，請稍後再試" };

    if (tagIds.length > 0) {
      const ins = await supabase
        .from("customer_tags")
        .insert(tagIds.map((tagId) => ({ customer_id: customerId, tag_id: tagId })));
      if (ins.error) return { ok: false, error: "更新失敗，請稍後再試" };
    }

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.member.set_tags",
      targetTable: "customers",
      targetId: customerId,
      after: { tagIds },
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

export async function addMemberNote(customerId: string, note: string): Promise<ActionResult> {
  try {
    const { profile } = await requireAdminForAction();
    const supabase = createAdminClient();

    // photo_urls 固定寫空陣列——照片上傳這階段只做 UI 占位，見
    // docs/phase-3-3-members-draft.md E.1 與 docs/design-log.md
    // 2026-07-11 決策（綁定 Phase 6 電子同意書機制才開放）。
    const { error } = await supabase
      .from("member_notes")
      .insert({ customer_id: customerId, author_id: profile.id, note, photo_urls: [] });
    if (error) return { ok: false, error: "新增筆記失敗，請稍後再試" };

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.member.add_note",
      targetTable: "member_notes",
      targetId: customerId,
      after: { note },
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

export async function toggleBlacklist(customerId: string, blacklisted: boolean): Promise<ActionResult> {
  try {
    const { profile } = await requireOwnerForAction();
    const supabase = createAdminClient();

    const current = await supabase.from("customers").select("status").eq("id", customerId).maybeSingle();
    if (current.error || !current.data) return { ok: false, error: "找不到這位會員" };

    const nextStatus = blacklisted ? "blacklisted" : "active";
    const { error } = await supabase.from("customers").update({ status: nextStatus }).eq("id", customerId);
    if (error) return { ok: false, error: "更新失敗，請稍後再試" };

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.member.toggle_blacklist",
      targetTable: "customers",
      targetId: customerId,
      before: { status: current.data.status },
      after: { status: nextStatus },
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

export async function updateMemberRating(customerId: string, rating: number | null): Promise<ActionResult> {
  try {
    const { profile } = await requireOwnerForAction();
    const supabase = createAdminClient();

    if (rating !== null && (rating < 1 || rating > 5)) {
      return { ok: false, error: "評分必須介於 1 到 5" };
    }

    const current = await supabase.from("customers").select("rating").eq("id", customerId).maybeSingle();
    if (current.error || !current.data) return { ok: false, error: "找不到這位會員" };

    const { error } = await supabase.from("customers").update({ rating }).eq("id", customerId);
    if (error) return { ok: false, error: "更新失敗，請稍後再試" };

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.member.update_rating",
      targetTable: "customers",
      targetId: customerId,
      before: { rating: current.data.rating },
      after: { rating },
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

/**
 * Phase 5 B.1：櫃檯儲值購買，manager 可操作（跟結帳權限一致，不像
 * 方案設定／退費限定 owner）。付款總額必須精確等於方案本金
 * （儲值買的是固定金額的方案，不像結帳有折扣可以調整應收金額）。
 */
export async function createStoredValueTopup(input: {
  customerId: string;
  planId: string;
  soldBy: string;
  payments: { method: string; amount: number }[];
}): Promise<ActionResult> {
  try {
    const { profile } = await requireAdminForAction();
    const supabase = createAdminClient();

    const planRes = await supabase
      .from("stored_value_plans")
      .select("id, principal_amount, bonus_amount, is_active")
      .eq("id", input.planId)
      .maybeSingle();
    if (planRes.error || !planRes.data) return { ok: false, error: "找不到這個方案" };
    if (!planRes.data.is_active) return { ok: false, error: "這個方案目前已停用，無法賣出" };

    const paymentsTotal = input.payments.reduce((sum, p) => sum + p.amount, 0);
    if (paymentsTotal !== planRes.data.principal_amount) {
      return { ok: false, error: "付款總額與方案金額不符，請重新確認" };
    }

    const orderIns = await supabase
      .from("stored_value_topup_orders")
      .insert({
        customer_id: input.customerId,
        plan_id: input.planId,
        principal_amount: planRes.data.principal_amount,
        bonus_amount: planRes.data.bonus_amount,
        payment_method: derivePaymentMethod(input.payments),
        status: "paid",
        paid_at: new Date().toISOString(),
        sold_by: input.soldBy,
      })
      .select("id")
      .single();
    if (orderIns.error || !orderIns.data) return { ok: false, error: "建立儲值訂單失敗，請稍後再試" };
    const topupOrderId = orderIns.data.id;

    try {
      if (input.payments.length > 0) {
        const paymentsIns = await supabase.from("stored_value_topup_payments").insert(
          input.payments.map((p) => ({ topup_order_id: topupOrderId, method: p.method, amount: p.amount }))
        );
        if (paymentsIns.error) throw new Error("付款紀錄寫入失敗");
      }

      // 上帳共用函式，跟未來 ECPay webhook 走同一個函式（見
      // docs/phase-5-stored-value-draft.md B.2）。
      await applyStoredValueTopup(supabase, topupOrderId, profile.id);

      await writeAuditLog(supabase, {
        actorId: profile.id,
        action: "admin.stored_value.topup",
        targetTable: "stored_value_topup_orders",
        targetId: topupOrderId,
        after: {
          customerId: input.customerId,
          planId: input.planId,
          soldBy: input.soldBy,
          principalAmount: planRes.data.principal_amount,
          bonusAmount: planRes.data.bonus_amount,
        },
      });

      return { ok: true };
    } catch (innerErr) {
      // 金流紀錄不能刪，只能標記失敗——比照 Phase 4 結帳建立失敗的
      // 補償模式。
      await supabase.from("stored_value_topup_orders").update({ status: "failed" }).eq("id", topupOrderId);
      return {
        ok: false,
        error:
          innerErr instanceof Error
            ? `儲值失敗：${innerErr.message}（若款項已收，請勿重複收款）`
            : "儲值失敗，請重新操作（若款項已收，請勿重複收款）",
      };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

/**
 * Phase 5 D：只退本金，贈額同步歸零，帳戶保留可再儲值，無手續費。
 * 2026-07-13 決策：principal_balance=0 時 UI 層直接不顯示這個入口
 * （見 canShowStoredValueRefundButton），這裡仍然再驗證一次，不只
 * 靠前端擋。
 */
export async function refundStoredValue(customerId: string): Promise<ActionResult> {
  try {
    const { profile } = await requireOwnerForAction();
    const supabase = createAdminClient();

    const accountRes = await supabase
      .from("stored_value_accounts")
      .select("principal_balance, bonus_balance")
      .eq("customer_id", customerId)
      .maybeSingle();
    if (accountRes.error || !accountRes.data) return { ok: false, error: "找不到儲值帳戶" };
    if (accountRes.data.principal_balance <= 0) return { ok: false, error: "沒有本金餘額可退" };

    const { principal_balance: principalBalance, bonus_balance: bonusBalance } = accountRes.data;

    // 流水帳先寫、餘額快取後更新（見 checkout/_actions.ts 相同註解：
    // 流水帳是唯一真實來源，先寫成功才動快取，失敗時比較好復原）。
    const { error: txError } = await supabase.from("stored_value_transactions").insert({
      account_customer_id: customerId,
      type: "refund",
      principal_delta: -principalBalance,
      bonus_delta: -bonusBalance,
      operator_id: profile.id,
    });
    if (txError) return { ok: false, error: "退費失敗，請稍後再試" };

    const { error } = await supabase
      .from("stored_value_accounts")
      .update({ principal_balance: 0, bonus_balance: 0 })
      .eq("customer_id", customerId);
    if (error) return { ok: false, error: "流水帳已寫入，但餘額更新失敗，請聯繫工程師確認" };

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.stored_value.refund",
      targetTable: "stored_value_accounts",
      targetId: customerId,
      before: { principalBalance, bonusBalance },
      after: { principalBalance: 0, bonusBalance: 0 },
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

/**
 * Phase 7-A §4.3：櫃檯代客綁定——店員對著站在櫃檯前、已核對過身分的
 * 客人產生一組 10 分鐘短效的 QR 連結，manager+owner 皆可（跟手動單發
 * 同一權限級別，不是移動金錢或高風險操作）。grantToken 本身不含任何
 * 敏感資訊（customerId 明碼可讀，只是簽章防竄改），QR 內容不用特別
 * 保密處理，但短效 + 產生後立刻遞給客人是唯一的防護層（見設計文件
 * §4.3「安全取捨」）。
 */
export async function generateCounterBindGrant(
  customerId: string
): Promise<{ ok: true; url: string; expiresAt: number } | { ok: false; error: string }> {
  try {
    const { profile } = await requireAdminForAction();
    const supabase = createAdminClient();

    const secret = process.env.BOOKING_TOKEN_SECRET;
    if (!secret) return { ok: false, error: "系統設定錯誤，請稍後再試" };

    const customerRes = await supabase.from("customers").select("id").eq("id", customerId).maybeSingle();
    if (customerRes.error || !customerRes.data) return { ok: false, error: "找不到這位會員" };
    if (await customerHasLineBinding(supabase, customerId)) {
      return { ok: false, error: "這位客人已經綁定 LINE，不需要再產生連結" };
    }

    const { token, expiresAt } = createCounterBindGrant(customerId, profile.id, secret);

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.member.generate_counter_bind_grant",
      targetTable: "customers",
      targetId: customerId,
    });

    return { ok: true, url: buildCounterBindUrl(token), expiresAt };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

/**
 * Phase 6 C.2：手動單發，manager+owner 皆可（不是 owner 限定——單發
 * 一則訊息不是退費/改抽成率那個級別的高風險操作）。決策 3：同一客人
 * 每日上限 3 則，用 notifications_log 當天 admin_manual+sent 的筆數
 * 實算，不是前端自己算的計數器。
 */
export async function sendManualNotification(customerId: string, templateKey: string): Promise<ActionResult> {
  try {
    const { profile } = await requireAdminForAction();
    const supabase = createAdminClient();

    const sentToday = await fetchManualSendCountToday(supabase, customerId, taipeiTodayISO());
    if (!canSendManualNotification(sentToday)) {
      return { ok: false, error: "今天已對這位客人發送 3 則訊息，達每日上限" };
    }

    const customerRes = await supabase.from("customers").select("name").eq("id", customerId).maybeSingle();
    if (customerRes.error || !customerRes.data) return { ok: false, error: "找不到這位會員" };

    const recentAppointmentRes = await supabase
      .from("appointments")
      .select("appointment_date, start_time, service_variants ( name ), staff ( name )")
      .eq("customer_id", customerId)
      .order("appointment_date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle()
      .returns<{
        appointment_date: string;
        start_time: string;
        service_variants: { name: string } | null;
        staff: { name: string } | null;
      } | null>();

    const result = await sendNotification(supabase, {
      customerId,
      templateKey,
      triggeredBy: "admin_manual",
      operatorId: profile.id,
      vars: {
        name: customerRes.data.name,
        date: recentAppointmentRes.data?.appointment_date ?? "",
        startTime: recentAppointmentRes.data?.start_time?.slice(0, 5) ?? "",
        staffName: recentAppointmentRes.data?.staff?.name ?? "",
        serviceName: recentAppointmentRes.data?.service_variants?.name ?? "",
        memberUrl: buildMemberUrl(),
        bookingUrl: buildBookingUrl(),
      },
    });

    if (result.status === "sent") return { ok: true };
    if (result.status === "skipped") return { ok: false, error: `無法發送：${result.reason}` };
    return { ok: false, error: `發送失敗：${result.error}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}
