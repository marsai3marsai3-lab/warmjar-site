export type CommissionRateSource = "staff_service_override" | "service_default" | "staff_default";

export type CommissionRateResolutionInput = {
  staffServiceOverride: number | null | undefined;
  serviceDefaultRate: number | null | undefined;
  staffDefaultRate: number;
};

export type ResolvedCommissionRate = {
  rate: number;
  source: CommissionRateSource;
};

/**
 * 三層解析順序（2026-07-12 決策，見 docs/design-log.md）：
 * staff_service_skills.commission_rate_override > services.default_commission_rate
 * > staff.default_commission_rate。服務層是 NOT NULL（schema 保證），
 * staffDefaultRate 純粹是防禦性最後防線，正常不會真的用到——但型別上
 * 呼叫端還是要傳，因為資料異常時（例如舊資料或手動改壞）不該讓整個
 * 結帳流程掛掉。
 *
 * 回傳值一定帶 source 標籤——2026-07-12 決策附加要求：設定介面必須
 * 顯示「目前生效值來自哪一層」，不能只顯示數字讓人自己反推。
 */
export function resolveCommissionRate(input: CommissionRateResolutionInput): ResolvedCommissionRate {
  if (input.staffServiceOverride != null) {
    return { rate: input.staffServiceOverride, source: "staff_service_override" };
  }
  if (input.serviceDefaultRate != null) {
    return { rate: input.serviceDefaultRate, source: "service_default" };
  }
  return { rate: input.staffDefaultRate, source: "staff_default" };
}

export const COMMISSION_RATE_SOURCE_LABEL: Record<CommissionRateSource, string> = {
  staff_service_override: "個別設定",
  service_default: "服務預設",
  staff_default: "師傅保底",
};

/**
 * 抽成鐵律（CLAUDE.md 規則 1）：一律以 face_value 計算，跟客人實付
 * （paid_amount／折扣後金額）完全無關——呼叫端不可以把折扣後金額傳進
 * 這個函式。四捨五入到整數元（金額一律整數，不用浮點數）。
 */
export function calculateCommissionAmount(faceValue: number, rate: number): number {
  return Math.round((faceValue * rate) / 100);
}
