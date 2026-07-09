"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminForAction, requireOwnerForAction } from "@/lib/admin/auth";
import { writeAuditLog } from "@/lib/booking/auditLog";
import { broadcastCalendarChange } from "@/lib/admin/realtime";
import { allocateCheckoutDiscounts, type DiscountSpec } from "@/lib/checkout/discountAllocation";
import { calculateCommissionAmount } from "@/lib/checkout/commissionRate";
import { fetchEffectiveCommissionRates } from "@/lib/checkout/commissionRateData";
import { derivePaymentMethod, isPaymentComplete } from "@/lib/checkout/checkoutValidation";
import { canVoidCheckout } from "@/lib/checkout/checkoutState";
import { findOrCreateCustomer } from "@/lib/booking/customers";

type ActionResult = { ok: true } | { ok: false; error: string };

type ResolveWalkInResult =
  | { ok: true; customerId: string; customerName: string }
  | { ok: false; error: string };

/** Walk-in 結帳（A.1 入口二）：憑姓名＋電話找到既有客人或建新客人，沿用 /book 既有的 findOrCreateCustomer。 */
export async function resolveWalkInCustomer(name: string, phone: string): Promise<ResolveWalkInResult> {
  try {
    await requireAdminForAction();
    const supabase = createAdminClient();

    if (!name.trim() || !phone.trim()) {
      return { ok: false, error: "請輸入姓名與電話" };
    }

    const customer = await findOrCreateCustomer(supabase, phone.trim(), name.trim());
    return { ok: true, customerId: customer.id, customerName: name.trim() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

type CheckoutItemInput = {
  appointmentId?: string | null;
  serviceVariantId: string;
  staffId: string;
  quantity: number;
  itemDiscount?: DiscountSpec | null;
};

type CreateCheckoutInput = {
  customerId: string;
  items: CheckoutItemInput[];
  orderDiscount?: DiscountSpec | null;
  depositId?: string | null;
  payments: { method: string; amount: number }[];
  reopenedFromCheckoutId?: string | null;
};

type CreateCheckoutResult = { ok: true; checkoutId: string } | { ok: false; error: string };

/**
 * 結帳完成是金流事實，不用真正的 DB transaction（Supabase JS client
 * 沒有跨表交易 API），改用「先建立 checkouts 錨點列，後續任何一步失敗
 * 就自動作廢」的補償機制——checkout_items/checkout_payments/
 * commission_records 對 checkouts 都是 ON DELETE RESTRICT，本來就不能
 * 直接刪除半成品，只能用既有的作廢流程收尾，剛好跟「結帳單不可改，
 * 錯了就作廢重開」的業務規則（D.2）一致，不是另外發明一套。
 */
export async function createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  try {
    const { profile } = await requireAdminForAction();
    const supabase = createAdminClient();

    if (input.items.length === 0) {
      return { ok: false, error: "至少要有一個結帳項目" };
    }

    const variantIds = [...new Set(input.items.map((i) => i.serviceVariantId))];
    const variantsRes = await supabase
      .from("service_variants")
      .select("id, face_value_price, service_id")
      .in("id", variantIds);
    if (variantsRes.error) return { ok: false, error: "服務項目資料錯誤" };
    const variantById = new Map(variantsRes.data.map((v) => [v.id, v]));

    for (const item of input.items) {
      if (!variantById.has(item.serviceVariantId)) {
        return { ok: false, error: "服務項目資料錯誤，請重新整理後再試" };
      }
    }

    const discountInputs = input.items.map((item, index) => ({
      id: String(index),
      faceValue: variantById.get(item.serviceVariantId)!.face_value_price * item.quantity,
      itemDiscount: item.itemDiscount,
    }));
    const allocated = allocateCheckoutDiscounts(discountInputs, input.orderDiscount);
    const allocatedById = new Map(allocated.map((a) => [a.id, a]));

    const subtotalFaceValue = discountInputs.reduce((sum, d) => sum + d.faceValue, 0);
    const totalPaidAmount = allocated.reduce((sum, a) => sum + a.paidAmount, 0);
    const discountAmount = subtotalFaceValue - totalPaidAmount;

    let depositApplied = 0;
    if (input.depositId) {
      const depositRes = await supabase
        .from("deposit_records")
        .select("id, amount, status, applied_checkout_id")
        .eq("id", input.depositId)
        .maybeSingle();
      if (depositRes.error || !depositRes.data) return { ok: false, error: "找不到這筆訂金紀錄" };
      if (depositRes.data.status !== "paid" || depositRes.data.applied_checkout_id) {
        return { ok: false, error: "這筆訂金已經被使用或狀態不是已付款，無法折抵" };
      }
      depositApplied = depositRes.data.amount;
    }

    const paymentsTotal = input.payments.reduce((sum, p) => sum + p.amount, 0);
    if (!isPaymentComplete(paymentsTotal, depositApplied, totalPaidAmount)) {
      return { ok: false, error: "付款總額與應收金額不符，請重新確認" };
    }

    const rateMap = await fetchEffectiveCommissionRates(
      supabase,
      input.items.map((i) => ({ staffId: i.staffId, serviceId: variantById.get(i.serviceVariantId)!.service_id }))
    );

    const checkoutIns = await supabase
      .from("checkouts")
      .insert({
        customer_id: input.customerId,
        checked_out_by: profile.id,
        subtotal_face_value: subtotalFaceValue,
        total_paid_amount: totalPaidAmount,
        discount_amount: discountAmount,
        deposit_applied: depositApplied,
        payment_method: derivePaymentMethod(input.payments),
        status: "completed",
        reopened_from_checkout_id: input.reopenedFromCheckoutId ?? null,
      })
      .select("id")
      .single();
    if (checkoutIns.error || !checkoutIns.data) {
      return { ok: false, error: "建立結帳單失敗，請稍後再試" };
    }
    const checkoutId = checkoutIns.data.id;

    try {
      for (let index = 0; index < input.items.length; index++) {
        const item = input.items[index];
        const variant = variantById.get(item.serviceVariantId)!;
        const allocatedItem = allocatedById.get(String(index));
        if (!allocatedItem) throw new Error("折扣分攤計算異常");

        const itemIns = await supabase
          .from("checkout_items")
          .insert({
            checkout_id: checkoutId,
            item_type: "service",
            appointment_id: item.appointmentId ?? null,
            service_variant_id: item.serviceVariantId,
            staff_id: item.staffId,
            face_value: allocatedItem.faceValue,
            paid_amount: allocatedItem.paidAmount,
            quantity: item.quantity,
          })
          .select("id")
          .single();
        if (itemIns.error || !itemIns.data) throw new Error("結帳項目寫入失敗");

        const rateKey = `${item.staffId}:${variant.service_id}`;
        const resolved = rateMap.get(rateKey);
        if (!resolved) throw new Error("抽成率解析失敗");

        const commissionIns = await supabase.from("commission_records").insert({
          checkout_item_id: itemIns.data.id,
          staff_id: item.staffId,
          commission_rate: resolved.rate,
          commission_amount: calculateCommissionAmount(allocatedItem.faceValue, resolved.rate),
        });
        if (commissionIns.error) throw new Error("抽成紀錄寫入失敗");
      }

      if (input.payments.length > 0) {
        const paymentsIns = await supabase.from("checkout_payments").insert(
          input.payments.map((p) => ({ checkout_id: checkoutId, method: p.method, amount: p.amount }))
        );
        if (paymentsIns.error) throw new Error("付款紀錄寫入失敗");
      }

      if (input.depositId) {
        const depositUpdate = await supabase
          .from("deposit_records")
          .update({ applied_checkout_id: checkoutId })
          .eq("id", input.depositId);
        if (depositUpdate.error) throw new Error("訂金折抵標記失敗");
      }

      const appointmentIds = [
        ...new Set(input.items.map((i) => i.appointmentId).filter((id): id is string => !!id)),
      ];
      if (appointmentIds.length > 0) {
        const apptUpdate = await supabase
          .from("appointments")
          .update({ status: "completed" })
          .in("id", appointmentIds)
          .neq("status", "completed");
        if (apptUpdate.error) throw new Error("預約狀態更新失敗");
      }

      await writeAuditLog(supabase, {
        actorId: profile.id,
        action: "admin.checkout.create",
        targetTable: "checkouts",
        targetId: checkoutId,
        after: {
          customerId: input.customerId,
          subtotalFaceValue,
          totalPaidAmount,
          discountAmount,
          depositApplied,
          itemCount: input.items.length,
          reopenedFromCheckoutId: input.reopenedFromCheckoutId ?? null,
        },
      });

      for (const appointmentId of appointmentIds) {
        await broadcastCalendarChange({ appointmentId, date: new Date().toISOString().slice(0, 10) });
      }

      return { ok: true, checkoutId };
    } catch (innerErr) {
      await supabase
        .from("checkouts")
        .update({
          status: "voided",
          void_reason: `系統自動作廢：${innerErr instanceof Error ? innerErr.message : "建立過程發生錯誤"}`,
          voided_at: new Date().toISOString(),
        })
        .eq("id", checkoutId);
      return {
        ok: false,
        error: "結帳建立失敗，已自動作廢，請重新操作（若款項已收，請勿重複收款，如有疑問聯繫工程師確認）",
      };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

export async function voidCheckout(checkoutId: string, reason: string): Promise<ActionResult> {
  try {
    const { profile } = await requireOwnerForAction();
    const supabase = createAdminClient();

    const checkoutRes = await supabase.from("checkouts").select("id, status").eq("id", checkoutId).maybeSingle();
    if (checkoutRes.error || !checkoutRes.data) return { ok: false, error: "找不到這張結帳單" };
    if (!canVoidCheckout(checkoutRes.data.status)) {
      return { ok: false, error: "這張結帳單目前狀態不能作廢" };
    }

    const { error: voidError } = await supabase
      .from("checkouts")
      .update({
        status: "voided",
        void_reason: reason,
        voided_by: profile.id,
        voided_at: new Date().toISOString(),
      })
      .eq("id", checkoutId);
    if (voidError) return { ok: false, error: "作廢失敗，請稍後再試" };

    const itemsRes = await supabase.from("checkout_items").select("id").eq("checkout_id", checkoutId);
    if (itemsRes.error) return { ok: false, error: "作廢結帳單成功，但清理抽成紀錄失敗，請聯繫工程師確認" };
    const itemIds = (itemsRes.data ?? []).map((i) => i.id);
    if (itemIds.length > 0) {
      await supabase
        .from("commission_records")
        .update({ voided: true, voided_at: new Date().toISOString() })
        .in("checkout_item_id", itemIds);
    }

    await supabase.from("deposit_records").update({ applied_checkout_id: null }).eq("applied_checkout_id", checkoutId);

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.checkout.void",
      targetTable: "checkouts",
      targetId: checkoutId,
      before: { status: checkoutRes.data.status },
      after: { status: "voided", reason },
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

export async function updateServiceCommissionRate(serviceId: string, rate: number): Promise<ActionResult> {
  try {
    const { profile } = await requireOwnerForAction();
    const supabase = createAdminClient();
    if (rate < 0 || rate > 100) return { ok: false, error: "抽成率必須介於 0 到 100" };

    const current = await supabase
      .from("services")
      .select("default_commission_rate")
      .eq("id", serviceId)
      .maybeSingle();
    if (current.error || !current.data) return { ok: false, error: "找不到這個服務項目" };

    const { error } = await supabase.from("services").update({ default_commission_rate: rate }).eq("id", serviceId);
    if (error) return { ok: false, error: "更新失敗，請稍後再試" };

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.commission.update_service_default",
      targetTable: "services",
      targetId: serviceId,
      before: { defaultCommissionRate: current.data.default_commission_rate },
      after: { defaultCommissionRate: rate },
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

export async function updateStaffServiceOverride(
  staffId: string,
  serviceId: string,
  rate: number | null
): Promise<ActionResult> {
  try {
    const { profile } = await requireOwnerForAction();
    const supabase = createAdminClient();
    if (rate !== null && (rate < 0 || rate > 100)) return { ok: false, error: "抽成率必須介於 0 到 100" };

    const { error } = await supabase
      .from("staff_service_skills")
      .upsert(
        { staff_id: staffId, service_id: serviceId, commission_rate_override: rate },
        { onConflict: "staff_id,service_id" }
      );
    if (error) return { ok: false, error: "更新失敗，請稍後再試" };

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.commission.update_staff_override",
      targetTable: "staff_service_skills",
      targetId: staffId,
      after: { staffId, serviceId, commissionRateOverride: rate },
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}

export async function updateStaffDefaultRate(staffId: string, rate: number): Promise<ActionResult> {
  try {
    const { profile } = await requireOwnerForAction();
    const supabase = createAdminClient();
    if (rate < 0 || rate > 100) return { ok: false, error: "抽成率必須介於 0 到 100" };

    const current = await supabase.from("staff").select("default_commission_rate").eq("id", staffId).maybeSingle();
    if (current.error || !current.data) return { ok: false, error: "找不到這位師傅" };

    const { error } = await supabase.from("staff").update({ default_commission_rate: rate }).eq("id", staffId);
    if (error) return { ok: false, error: "更新失敗，請稍後再試" };

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.commission.update_staff_default",
      targetTable: "staff",
      targetId: staffId,
      before: { defaultCommissionRate: current.data.default_commission_rate },
      after: { defaultCommissionRate: rate },
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}
