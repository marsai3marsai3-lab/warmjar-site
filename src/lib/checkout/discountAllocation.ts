export type DiscountSpec = { type: "amount" | "percentage"; value: number };

export type CheckoutItemDiscountInput = {
  id: string;
  faceValue: number; // 已含數量（face_value × quantity）
  itemDiscount?: DiscountSpec | null;
};

export type AllocatedCheckoutItem = {
  id: string;
  faceValue: number;
  paidAmount: number;
};

/**
 * 金額折扣直接扣減；百分比折扣四捨五入到整數（金額一律整數，不用浮點數
 * ——CLAUDE.md 規則 5）。折扣不會讓金額變負數，最低是 0。
 */
export function applyDiscount(amount: number, discount?: DiscountSpec | null): number {
  if (!discount) return amount;
  if (discount.type === "amount") return Math.max(0, amount - discount.value);
  return Math.max(0, Math.round((amount * (100 - discount.value)) / 100));
}

/**
 * face_value 永遠不變（CLAUDE.md 規則 1 的核心）——這個函式只計算每個
 * 項目的 paid_amount，輸出的 faceValue 原封不動照抄輸入。
 *
 * 兩層折扣：先套用各項目的項目折扣，加總後再套用整單折扣，整單折扣
 * 的結果用「最大餘數法」按比例分攤回每個項目，保證
 * `Σ paidAmount === 整單折扣後的應收總額` 精確相等，不會因為四捨五入
 * 讓 1 元憑空消失或多出來（見 docs/phase-4-checkout-draft.md 1.5）。
 */
export function allocateCheckoutDiscounts(
  items: CheckoutItemDiscountInput[],
  orderDiscount?: DiscountSpec | null
): AllocatedCheckoutItem[] {
  if (items.length === 0) return [];

  const afterItemDiscount = items.map((item) => ({
    id: item.id,
    faceValue: item.faceValue,
    amount: applyDiscount(item.faceValue, item.itemDiscount),
  }));

  const preOrderDiscountTotal = afterItemDiscount.reduce((sum, i) => sum + i.amount, 0);

  // 所有項目在項目折扣後都是 0（例如全部打到骨折），沒有基礎可以再按
  // 比例分攤整單折扣，維持 0——不是錯誤，是「已經折到底了」。
  if (preOrderDiscountTotal === 0) {
    return afterItemDiscount.map((i) => ({ id: i.id, faceValue: i.faceValue, paidAmount: 0 }));
  }

  const grandTotal = applyDiscount(preOrderDiscountTotal, orderDiscount);

  const shares = afterItemDiscount.map((i) => {
    const exact = (i.amount * grandTotal) / preOrderDiscountTotal;
    const floor = Math.floor(exact);
    return { id: i.id, faceValue: i.faceValue, floor, remainder: exact - floor };
  });

  const flooredTotal = shares.reduce((sum, s) => sum + s.floor, 0);
  let remaining = grandTotal - flooredTotal;

  // 依捨去時損失的小數部分（餘數）由大到小排序，差額逐一分給餘數最大
  // 的項目各加 1 元，直到補滿——標準的整數金額分攤演算法（largest
  // remainder method），Array.sort 穩定排序讓同餘數時的分配順序固定、
  // 可測試。
  const byRemainderDesc = [...shares].sort((a, b) => b.remainder - a.remainder);
  const bonus = new Map<string, number>();
  for (const s of byRemainderDesc) {
    if (remaining <= 0) break;
    bonus.set(s.id, 1);
    remaining -= 1;
  }

  return shares.map((s) => ({
    id: s.id,
    faceValue: s.faceValue,
    paidAmount: s.floor + (bonus.get(s.id) ?? 0),
  }));
}
