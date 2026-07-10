export type StoredValueAllocation = { bonusUsed: number; principalUsed: number };

/**
 * 扣款順序：贈額優先、再扣本金（CLAUDE.md 既定規則）。呼叫端要先擋
 * 「amountToApply 不能超過 principalBalance + bonusBalance」（餘額
 * 不可為負，見 docs/stored-value-rules.md 決策 1）——這個函式本身
 * 不做這個檢查，只負責在「金額已知合法」的前提下算出怎麼分配。
 */
export function allocateStoredValueDeduction(
  amountToApply: number,
  principalBalance: number,
  bonusBalance: number
): StoredValueAllocation {
  const bonusUsed = Math.min(amountToApply, bonusBalance);
  const principalUsed = Math.min(amountToApply - bonusUsed, principalBalance);
  return { bonusUsed, principalUsed };
}
