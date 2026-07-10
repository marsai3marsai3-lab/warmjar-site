"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Trash2 } from "lucide-react";
import type { CheckoutCandidateAppointment } from "@/lib/checkout/checkoutData";
import { allocateCheckoutDiscounts, type DiscountSpec } from "@/lib/checkout/discountAllocation";
import { isPaymentComplete, remainingDue } from "@/lib/checkout/checkoutValidation";
import { allocateStoredValueDeduction } from "@/lib/storedValue/storedValueAllocation";
import { CustomerSearchField } from "./CustomerSearchField";
import type { CustomerCandidate } from "@/lib/admin/customerAutofill";
import { createCheckout, resolveWalkInCustomer } from "@/app/admin/(ops)/checkout/_actions";

export type ComposerItem = {
  key: string;
  appointmentId: string | null;
  serviceVariantId: string;
  serviceName: string;
  faceValuePerUnit: number;
  quantity: number;
  staffId: string;
  staffName: string;
  itemDiscount: DiscountSpec | null;
};

type ServiceVariantOption = { id: string; name: string; durationMinutes: number; price: number };
type ServiceOption = { id: string; name: string; variants: ServiceVariantOption[] };
type ServiceCategoryOption = { id: string; name: string; services: ServiceOption[] };
type StaffOption = { id: string; name: string };

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "現金",
  ecpay_credit: "刷卡",
  ecpay_transfer: "轉帳",
};

const DISCOUNT_TYPE_LABEL: Record<string, string> = { amount: "金額", percentage: "百分比" };

function discountFromForm(type: string, value: string): DiscountSpec | null {
  if (type === "none" || !value.trim()) return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  return { type: type as "amount" | "percentage", value: num };
}

export function CheckoutComposer({
  initialCustomer,
  initialItems,
  sameDayCandidates,
  reopenedFromCheckoutId,
}: {
  initialCustomer: { id: string; name: string; phone: string | null } | null;
  initialItems: ComposerItem[];
  sameDayCandidates: CheckoutCandidateAppointment[];
  reopenedFromCheckoutId: string | null;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string | null>(initialCustomer?.id ?? null);
  const [customerName, setCustomerName] = useState(initialCustomer?.name ?? "");
  const [customerPhone, setCustomerPhone] = useState(initialCustomer?.phone ?? "");
  const [resolvingCustomer, setResolvingCustomer] = useState(false);

  const [items, setItems] = useState<ComposerItem[]>(initialItems);
  const [includedCandidateIds, setIncludedCandidateIds] = useState<Set<string>>(new Set());

  const [orderDiscountType, setOrderDiscountType] = useState("none");
  const [orderDiscountValue, setOrderDiscountValue] = useState("");

  const [availableDeposit, setAvailableDeposit] = useState<{ id: string; amount: number } | null>(null);

  const [cashAmount, setCashAmount] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [storedValueAmount, setStoredValueAmount] = useState("");
  const [storedValueBalance, setStoredValueBalance] = useState<{
    principalBalance: number;
    bonusBalance: number;
  } | null>(null);

  const [categories, setCategories] = useState<ServiceCategoryOption[] | null>(null);
  const [addVariantId, setAddVariantId] = useState("");
  const [addStaffOptions, setAddStaffOptions] = useState<StaffOption[]>([]);
  const [addStaffId, setAddStaffId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExistingCustomer = !!initialCustomer || (customerId !== null && customerName.length > 0);

  useEffect(() => {
    fetch("/api/book/services")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const appointmentIds = items.map((i) => i.appointmentId).filter((id): id is string => !!id);
      if (appointmentIds.length === 0) {
        setAvailableDeposit(null);
        return;
      }
      try {
        const res = await fetch(`/api/admin/checkout/deposit?appointmentIds=${appointmentIds.join(",")}`);
        const data = await res.json();
        if (!cancelled) setAvailableDeposit(data.deposit ?? null);
      } catch {
        // ignore
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [items]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!customerId) {
        setStoredValueBalance(null);
        return;
      }
      try {
        const res = await fetch(`/api/admin/checkout/stored-value-balance?customerId=${customerId}`);
        const data = await res.json();
        if (!cancelled) setStoredValueBalance(data.balance ?? null);
      } catch {
        // ignore
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!addVariantId) {
        setAddStaffOptions([]);
        setAddStaffId("");
        return;
      }
      const res = await fetch(`/api/book/staff?serviceVariantIds=${addVariantId}`);
      const data = await res.json();
      if (!cancelled) setAddStaffOptions(data.staff ?? []);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [addVariantId]);

  function toggleCandidate(candidate: CheckoutCandidateAppointment) {
    setIncludedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(candidate.id)) {
        next.delete(candidate.id);
        setItems((items) => items.filter((i) => i.appointmentId !== candidate.id));
      } else {
        next.add(candidate.id);
        setItems((items) => [
          ...items,
          {
            key: candidate.id,
            appointmentId: candidate.id,
            serviceVariantId: candidate.serviceVariantId,
            serviceName: candidate.serviceName,
            faceValuePerUnit: candidate.faceValue,
            quantity: 1,
            staffId: candidate.staffId ?? "",
            staffName: candidate.staffName,
            itemDiscount: null,
          },
        ]);
      }
      return next;
    });
  }

  function updateItem(key: string, patch: Partial<ComposerItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function addManualItem() {
    if (!addVariantId || !addStaffId || !categories) return;
    let found: { name: string; price: number } | null = null;
    for (const cat of categories) {
      for (const svc of cat.services) {
        const v = svc.variants.find((v) => v.id === addVariantId);
        if (v) found = { name: `${svc.name}・${v.name}`, price: v.price };
      }
    }
    if (!found) return;
    const staff = addStaffOptions.find((s) => s.id === addStaffId);
    setItems((prev) => [
      ...prev,
      {
        key: `manual-${Date.now()}-${Math.random()}`,
        appointmentId: null,
        serviceVariantId: addVariantId,
        serviceName: found!.name,
        faceValuePerUnit: found!.price,
        quantity: 1,
        staffId: addStaffId,
        staffName: staff?.name ?? "",
        itemDiscount: null,
      },
    ]);
    setAddVariantId("");
    setAddStaffId("");
  }

  async function handleResolveWalkIn() {
    setResolvingCustomer(true);
    setError(null);
    try {
      const result = await resolveWalkInCustomer(customerName, customerPhone);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCustomerId(result.customerId);
    } finally {
      setResolvingCustomer(false);
    }
  }

  function selectCustomer(customer: CustomerCandidate) {
    setCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
  }

  const orderDiscount = discountFromForm(orderDiscountType, orderDiscountValue);
  const discountInputs = items.map((item) => ({
    id: item.key,
    faceValue: item.faceValuePerUnit * item.quantity,
    itemDiscount: item.itemDiscount,
  }));
  const allocated = allocateCheckoutDiscounts(discountInputs, orderDiscount);
  const allocatedByKey = new Map(allocated.map((a) => [a.id, a]));
  const subtotalFaceValue = discountInputs.reduce((sum, d) => sum + d.faceValue, 0);
  const totalPaidAmount = allocated.reduce((sum, a) => sum + a.paidAmount, 0);
  const depositApplied = availableDeposit?.amount ?? 0;

  const storedValueTotal = (storedValueBalance?.principalBalance ?? 0) + (storedValueBalance?.bonusBalance ?? 0);
  const storedValueAmountNum = Number(storedValueAmount) || 0;
  const storedValuePreview = allocateStoredValueDeduction(
    storedValueAmountNum,
    storedValueBalance?.principalBalance ?? 0,
    storedValueBalance?.bonusBalance ?? 0
  );
  const otherPaymentsTotal = [cashAmount, cardAmount, transferAmount].reduce(
    (sum, v) => sum + (Number(v) || 0),
    0
  );
  const paymentsTotal = otherPaymentsTotal + storedValueAmountNum;
  const remaining = remainingDue(totalPaidAmount, depositApplied, paymentsTotal);
  const storedValueExceedsBalance = storedValueAmountNum > storedValueTotal;
  const canSubmit =
    !!customerId &&
    items.length > 0 &&
    isPaymentComplete(paymentsTotal, depositApplied, totalPaidAmount) &&
    !storedValueExceedsBalance &&
    !submitting;

  function fillMaxStoredValue() {
    const remainingBeforeStoredValue = totalPaidAmount - depositApplied - otherPaymentsTotal;
    setStoredValueAmount(String(Math.max(0, Math.min(remainingBeforeStoredValue, storedValueTotal))));
  }

  async function handleSubmit() {
    if (!customerId) return;
    setSubmitting(true);
    setError(null);
    try {
      const payments = [
        { method: "cash", amount: Number(cashAmount) || 0 },
        { method: "ecpay_credit", amount: Number(cardAmount) || 0 },
        { method: "ecpay_transfer", amount: Number(transferAmount) || 0 },
        { method: "stored_value", amount: storedValueAmountNum },
      ].filter((p) => p.amount > 0);

      const result = await createCheckout({
        customerId,
        items: items.map((item) => ({
          appointmentId: item.appointmentId,
          serviceVariantId: item.serviceVariantId,
          staffId: item.staffId,
          quantity: item.quantity,
          itemDiscount: item.itemDiscount,
        })),
        orderDiscount,
        depositId: availableDeposit?.id ?? null,
        payments,
        reopenedFromCheckoutId,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/admin/checkout/${result.checkoutId}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 px-4 py-5 pb-10">
      <h1 className="font-heading text-xl font-semibold text-ink">結帳{reopenedFromCheckoutId ? "（重開）" : ""}</h1>

      <section>
        <h2 className="mb-2 text-sm font-medium text-ink-muted">客人</h2>
        {isExistingCustomer ? (
          <div className="rounded-xl border border-cream-border bg-white p-3 text-sm">
            <span className="font-medium text-ink">{customerName}</span>
            {customerPhone && <span className="ml-2 text-ink-light">{customerPhone}</span>}
          </div>
        ) : (
          <div className="space-y-2">
            <CustomerSearchField
              field="name"
              value={customerName}
              onChange={(v) => {
                setCustomerName(v);
                setCustomerId(null);
              }}
              onSelect={selectCustomer}
              placeholder="姓名（輸入 2 字以上搜尋舊客）"
              className="w-full rounded-lg border border-cream-border px-3 py-2 text-sm outline-none focus:border-terracotta"
            />
            <CustomerSearchField
              field="phone"
              value={customerPhone}
              onChange={(v) => {
                setCustomerPhone(v.replace(/[^0-9]/g, ""));
                setCustomerId(null);
              }}
              onSelect={selectCustomer}
              placeholder="手機號碼"
              inputMode="numeric"
              className="w-full rounded-lg border border-cream-border px-3 py-2 text-sm outline-none focus:border-terracotta"
            />
            {!customerId && (
              <button
                disabled={resolvingCustomer || !customerName.trim() || !customerPhone.trim()}
                onClick={handleResolveWalkIn}
                className="rounded-full border border-terracotta px-4 py-1.5 text-sm text-terracotta disabled:opacity-50"
              >
                {resolvingCustomer ? "處理中…" : "確認客人（找不到就新建）"}
              </button>
            )}
            {customerId && <p className="text-xs text-olive-dark">已確認客人</p>}
          </div>
        )}
      </section>

      {sameDayCandidates.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-ink-muted">本次到店還有其他預約，一起結帳嗎？</h2>
          <div className="space-y-1.5">
            {sameDayCandidates.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 rounded-xl border border-cream-border bg-white p-2.5 text-sm"
              >
                <input
                  type="checkbox"
                  checked={includedCandidateIds.has(c.id)}
                  onChange={() => toggleCandidate(c)}
                />
                <span>
                  {c.startTime} {c.serviceName}・{c.staffName}・NT$ {c.faceValue.toLocaleString()}
                </span>
              </label>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium text-ink-muted">項目明細</h2>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.key} className="rounded-xl border border-cream-border bg-white p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">{item.serviceName}</span>
                <span className="text-ink-light">面額 NT$ {(item.faceValuePerUnit * item.quantity).toLocaleString()}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="text-xs text-ink-light">師傅</span>
                <select
                  value={item.staffId}
                  onChange={(e) => updateItem(item.key, { staffId: e.target.value })}
                  className="rounded-lg border border-cream-border px-2 py-1 text-sm"
                >
                  <option value="">請選擇</option>
                  {item.staffId && !addStaffOptions.some((s) => s.id === item.staffId) && (
                    <option value={item.staffId}>{item.staffName}</option>
                  )}
                  {addStaffOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-ink-light">項目折扣</span>
                <select
                  value={item.itemDiscount?.type ?? "none"}
                  onChange={(e) => {
                    const type = e.target.value;
                    updateItem(item.key, {
                      itemDiscount: type === "none" ? null : { type: type as "amount" | "percentage", value: item.itemDiscount?.value ?? 0 },
                    });
                  }}
                  className="rounded-lg border border-cream-border px-2 py-1 text-xs"
                >
                  <option value="none">無</option>
                  <option value="amount">金額</option>
                  <option value="percentage">百分比</option>
                </select>
                {item.itemDiscount && (
                  <input
                    type="number"
                    value={item.itemDiscount.value || ""}
                    onChange={(e) =>
                      updateItem(item.key, {
                        itemDiscount: { type: item.itemDiscount!.type, value: Number(e.target.value) || 0 },
                      })
                    }
                    className="w-20 rounded-lg border border-cream-border px-2 py-1 text-xs"
                  />
                )}
                <button onClick={() => removeItem(item.key)} aria-label="移除項目" className="ml-auto">
                  <Trash2 size={14} className="text-terracotta-dark" />
                </button>
              </div>
              <p className="mt-1.5 text-xs text-ink-light">
                此項應收 NT$ {(allocatedByKey.get(item.key)?.paidAmount ?? 0).toLocaleString()}
              </p>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-ink-light">尚未加入任何項目。</p>}
        </div>

        <div className="mt-3 space-y-2 rounded-xl border border-dashed border-cream-border p-3">
          <p className="text-xs font-medium text-ink-muted">＋ 新增項目（加購／walk-in 手動加）</p>
          <select
            value={addVariantId}
            onChange={(e) => setAddVariantId(e.target.value)}
            className="w-full rounded-lg border border-cream-border px-2 py-1.5 text-sm"
          >
            <option value="">選擇服務項目</option>
            {categories?.map((cat) => (
              <optgroup key={cat.id} label={cat.name}>
                {cat.services.map((svc) =>
                  svc.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {svc.name}・{v.name}（NT$ {v.price}）
                    </option>
                  ))
                )}
              </optgroup>
            ))}
          </select>
          {addVariantId && (
            <select
              value={addStaffId}
              onChange={(e) => setAddStaffId(e.target.value)}
              className="w-full rounded-lg border border-cream-border px-2 py-1.5 text-sm"
            >
              <option value="">選擇師傅</option>
              {addStaffOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <button
            disabled={!addVariantId || !addStaffId}
            onClick={addManualItem}
            className="rounded-full border border-terracotta px-4 py-1.5 text-sm text-terracotta disabled:opacity-50"
          >
            加入項目
          </button>
        </div>
      </section>

      <section className="space-y-2 rounded-xl border border-cream-border bg-white p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-muted">面額小計</span>
          <span className="text-ink">NT$ {subtotalFaceValue.toLocaleString()}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-muted">整單折讓</span>
          <select
            value={orderDiscountType}
            onChange={(e) => setOrderDiscountType(e.target.value)}
            className="rounded-lg border border-cream-border px-2 py-1 text-xs"
          >
            <option value="none">無</option>
            <option value="amount">金額</option>
            <option value="percentage">百分比</option>
          </select>
          {orderDiscountType !== "none" && (
            <input
              type="number"
              value={orderDiscountValue}
              onChange={(e) => setOrderDiscountValue(e.target.value)}
              placeholder={DISCOUNT_TYPE_LABEL[orderDiscountType]}
              className="w-24 rounded-lg border border-cream-border px-2 py-1 text-xs"
            />
          )}
        </div>
        <div className="flex items-center justify-between text-sm font-medium">
          <span className="text-ink">應收</span>
          <span className="text-ink">NT$ {totalPaidAmount.toLocaleString()}</span>
        </div>
      </section>

      {availableDeposit && (
        <section className="rounded-xl border border-gold/40 bg-gold/5 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-ink">訂金折抵（已付訂金，自動列入）</span>
            <span className="font-medium text-ink">NT$ {availableDeposit.amount.toLocaleString()}</span>
          </div>
        </section>
      )}

      <section className="space-y-2 rounded-xl border border-cream-border bg-white p-3">
        <p className="text-sm font-medium text-ink-muted">付款方式（可複選，總額須等於尚需收款）</p>
        {[
          { label: PAYMENT_METHOD_LABEL.cash, value: cashAmount, set: setCashAmount },
          { label: PAYMENT_METHOD_LABEL.ecpay_credit, value: cardAmount, set: setCardAmount },
          { label: PAYMENT_METHOD_LABEL.ecpay_transfer, value: transferAmount, set: setTransferAmount },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-2">
            <span className="w-12 text-sm text-ink-muted">{row.label}</span>
            <input
              type="number"
              value={row.value}
              onChange={(e) => row.set(e.target.value)}
              className="flex-1 rounded-lg border border-cream-border px-3 py-1.5 text-sm"
              placeholder="0"
            />
          </div>
        ))}
        {storedValueTotal > 0 && (
          <div>
            <div className="flex items-center gap-2">
              <span className="w-12 text-sm text-ink-muted">儲值</span>
              <input
                type="number"
                value={storedValueAmount}
                onChange={(e) => setStoredValueAmount(e.target.value)}
                className="flex-1 rounded-lg border border-cream-border px-3 py-1.5 text-sm"
                placeholder="0"
              />
              <span className="shrink-0 text-xs text-ink-light">可用 NT${storedValueTotal.toLocaleString()}</span>
              <button
                onClick={fillMaxStoredValue}
                className="shrink-0 rounded-full border border-cream-border px-2 py-1 text-xs text-ink-muted"
              >
                全部扣抵
              </button>
            </div>
            <p className="mt-1 pl-14 text-xs text-ink-light">
              （本金 NT${storedValueBalance?.principalBalance.toLocaleString()}＋贈額 NT$
              {storedValueBalance?.bonusBalance.toLocaleString()}）
              {storedValueAmountNum > 0 && !storedValueExceedsBalance && (
                <>
                  ・將扣除：贈額 NT${storedValuePreview.bonusUsed.toLocaleString()}＋本金 NT$
                  {storedValuePreview.principalUsed.toLocaleString()}
                </>
              )}
              {storedValueExceedsBalance && <span className="text-terracotta-dark">・超過可用餘額</span>}
            </p>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-muted">
            已輸入 NT$ {paymentsTotal.toLocaleString()} ／ 尚需 NT$ {(totalPaidAmount - depositApplied).toLocaleString()}
          </span>
          {isPaymentComplete(paymentsTotal, depositApplied, totalPaidAmount) ? (
            <Check size={16} className="text-olive-dark" />
          ) : (
            <span className="text-xs text-terracotta-dark">差 NT$ {Math.abs(remaining).toLocaleString()}</span>
          )}
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-terracotta-dark/40 bg-terracotta/5 px-3 py-2.5 text-sm text-terracotta-dark">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      <button
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="w-full rounded-full bg-terracotta py-3 text-sm font-medium text-cream disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "處理中…" : "確認結帳"}
      </button>
    </div>
  );
}
