"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwnerForAction } from "@/lib/admin/auth";
import { writeAuditLog } from "@/lib/booking/auditLog";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * 方案本身沒有刪除動作，只有調整金額／啟用停用（見
 * docs/phase-5-stored-value-draft.md A 節）——`stored_value_topup_orders`
 * 在下單當下就快照了金額，改這裡的金額不會動到已經賣出的份數。
 */
export async function updateStoredValuePlan(
  planId: string,
  input: { principalAmount: number; bonusAmount: number; isActive: boolean }
): Promise<ActionResult> {
  try {
    const { profile } = await requireOwnerForAction();
    const supabase = createAdminClient();

    if (input.principalAmount <= 0 || input.bonusAmount < 0) {
      return { ok: false, error: "金額設定不合理" };
    }

    const current = await supabase
      .from("stored_value_plans")
      .select("principal_amount, bonus_amount, is_active")
      .eq("id", planId)
      .maybeSingle();
    if (current.error || !current.data) return { ok: false, error: "找不到這個方案" };

    const { error } = await supabase
      .from("stored_value_plans")
      .update({
        principal_amount: input.principalAmount,
        bonus_amount: input.bonusAmount,
        is_active: input.isActive,
      })
      .eq("id", planId);
    if (error) return { ok: false, error: "更新失敗，請稍後再試" };

    await writeAuditLog(supabase, {
      actorId: profile.id,
      action: "admin.stored_value_plan.update",
      targetTable: "stored_value_plans",
      targetId: planId,
      before: current.data,
      after: input,
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "發生錯誤，請稍後再試" };
  }
}
