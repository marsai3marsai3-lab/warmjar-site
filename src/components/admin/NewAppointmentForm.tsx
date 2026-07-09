"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, UserCheck } from "lucide-react";
import { taipeiTodayISO } from "@/lib/admin/dateUtils";
import { isLinkedToCustomer, type CustomerCandidate } from "@/lib/admin/customerAutofill";
import { createManualAppointment } from "@/app/admin/(ops)/appointments/new/_actions";
import { CustomerSearchField } from "./CustomerSearchField";

type ServiceVariant = { id: string; name: string; durationMinutes: number; price: number };
type ServiceItem = { id: string; name: string; variants: ServiceVariant[] };
type ServiceCategory = { id: string; name: string; services: ServiceItem[] };
type StaffOption = { id: string; name: string };
type DaySlot = { startTime: string; endTime: string; availableStaffIds: string[] };
type SourceValue = "walk_in" | "phone" | "line_oa" | "instagram" | "admin";

const SOURCE_OPTIONS: { value: SourceValue; label: string }[] = [
  { value: "walk_in", label: "現場臨櫃" },
  { value: "phone", label: "電話預約" },
  { value: "line_oa", label: "官方LINE" },
  { value: "instagram", label: "IG" },
  { value: "admin", label: "其他" },
];

const FIELD_INPUT_CLASS =
  "w-full rounded-lg border border-cream-border px-3 py-2 text-sm outline-none focus:border-terracotta";

export function NewAppointmentForm() {
  const router = useRouter();

  const [categories, setCategories] = useState<ServiceCategory[] | null>(null);
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);

  const [staffOptions, setStaffOptions] = useState<StaffOption[] | null>(null);
  const [staffChoice, setStaffChoice] = useState<string>("any");

  const [date, setDate] = useState(taipeiTodayISO());
  const [slots, setSlots] = useState<DaySlot[] | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [linkedCustomer, setLinkedCustomer] = useState<CustomerCandidate | null>(null);
  const [source, setSource] = useState<SourceValue>("walk_in");
  const [note, setNote] = useState("");

  const isExistingCustomer = isLinkedToCustomer(linkedCustomer, customerName, customerPhone);

  function selectCustomer(customer: CustomerCandidate) {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setLinkedCustomer(customer);
  }

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/book/services")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => setError("無法取得服務列表"));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStaff() {
      if (selectedVariantIds.length === 0) {
        setStaffOptions(null);
        return;
      }
      try {
        const res = await fetch(`/api/book/staff?serviceVariantIds=${selectedVariantIds.join(",")}`);
        const data = await res.json();
        if (!cancelled) setStaffOptions(data.staff ?? []);
      } catch {
        if (!cancelled) setError("無法取得師傅列表");
      }
    }

    loadStaff();
    return () => {
      cancelled = true;
    };
  }, [selectedVariantIds]);

  useEffect(() => {
    let cancelled = false;

    async function loadSlots() {
      if (selectedVariantIds.length === 0) {
        setSlots(null);
        return;
      }
      setSelectedTime(null);
      try {
        const res = await fetch("/api/book/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceVariantIds: selectedVariantIds,
            staffId: staffChoice !== "any" ? staffChoice : undefined,
            dateRange: { startDate: date, endDate: date },
          }),
        });
        const data = await res.json();
        if (!cancelled) setSlots(data.days?.[0]?.slots ?? []);
      } catch {
        if (!cancelled) setError("無法取得可預約時段");
      }
    }

    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [selectedVariantIds, staffChoice, date]);

  function toggleVariant(variantId: string) {
    setSelectedVariantIds((prev) =>
      prev.includes(variantId) ? prev.filter((id) => id !== variantId) : [...prev, variantId]
    );
  }

  const missingFields: string[] = [];
  if (selectedVariantIds.length === 0) missingFields.push("服務項目");
  if (!selectedTime) missingFields.push("時段");
  if (!customerName.trim()) missingFields.push("姓名");
  if (!customerPhone.trim()) missingFields.push("電話");
  const canSubmit = missingFields.length === 0;

  async function handleSubmit() {
    if (!canSubmit || !selectedTime) return;
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await createManualAppointment({
        serviceVariantIds: selectedVariantIds,
        staffId: staffChoice !== "any" ? staffChoice : undefined,
        date,
        startTime: selectedTime,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        source,
        customerNote: note.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccessMessage("預約已建立");
      setSelectedVariantIds([]);
      setSelectedTime(null);
      setCustomerName("");
      setCustomerPhone("");
      setLinkedCustomer(null);
      setNote("");
      setTimeout(() => router.push(`/admin/calendar?date=${date}&view=day`), 800);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 px-4 py-5 pb-10">
      <h1 className="font-heading text-xl font-semibold text-ink">手動建立預約</h1>

      <section>
        <h2 className="mb-2 text-sm font-medium text-ink-muted">服務項目（可複選）</h2>
        {!categories && <p className="text-sm text-ink-light">載入中…</p>}
        <div className="space-y-3">
          {categories?.map((category) => (
            <div key={category.id}>
              <p className="mb-1.5 text-xs text-gold">{category.name}</p>
              {category.services.map((service) => (
                <div key={service.id} className="mb-2 flex flex-wrap gap-2">
                  {service.variants.map((variant) => {
                    const selected = selectedVariantIds.includes(variant.id);
                    return (
                      <button
                        key={variant.id}
                        onClick={() => toggleVariant(variant.id)}
                        className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm ${
                          selected ? "border-terracotta bg-terracotta text-cream" : "border-cream-border text-ink-muted"
                        }`}
                      >
                        {selected && <Check size={14} />}
                        {service.name}・{variant.name}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-ink-muted">師傅</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStaffChoice("any")}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              staffChoice === "any" ? "border-terracotta bg-terracotta text-cream" : "border-cream-border text-ink-muted"
            }`}
          >
            不指定
          </button>
          {staffOptions?.map((staff) => (
            <button
              key={staff.id}
              onClick={() => setStaffChoice(staff.id)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                staffChoice === staff.id ? "border-terracotta bg-terracotta text-cream" : "border-cream-border text-ink-muted"
              }`}
            >
              {staff.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-ink-muted">日期與時段</h2>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mb-3 rounded-lg border border-cream-border px-3 py-1.5 text-sm"
        />
        {selectedVariantIds.length === 0 ? (
          <p className="text-sm text-ink-light">請先選擇服務項目</p>
        ) : slots === null ? (
          <p className="text-sm text-ink-light">載入中…</p>
        ) : slots.length === 0 ? (
          <div className="rounded-xl border border-gold/40 bg-gold/5 p-3 text-sm">
            <p className="font-medium text-ink">
              {date === taipeiTodayISO() ? "今日已無足夠空檔" : "這天沒有可預約的時段"}
            </p>
            <p className="mt-1 text-ink-muted">
              請改選其他日期，或調整已選的服務項目／師傅組合後再試一次。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {slots.map((slot) => (
              <button
                key={slot.startTime}
                onClick={() => setSelectedTime(slot.startTime)}
                className={`rounded-lg border py-2 text-sm ${
                  selectedTime === slot.startTime
                    ? "border-terracotta bg-terracotta text-cream"
                    : "border-cream-border text-ink"
                }`}
              >
                {slot.startTime}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-ink-muted">客人資料</h2>
          {isExistingCustomer && (
            <span className="flex items-center gap-1 rounded-full bg-olive/10 px-2 py-0.5 text-xs font-medium text-olive-dark">
              <UserCheck size={12} />
              舊客
            </span>
          )}
        </div>
        <CustomerSearchField
          field="name"
          value={customerName}
          onChange={setCustomerName}
          onSelect={selectCustomer}
          placeholder="姓名（輸入 2 字以上搜尋舊客）"
          className={FIELD_INPUT_CLASS}
        />
        <CustomerSearchField
          field="phone"
          value={customerPhone}
          onChange={(v) => setCustomerPhone(v.replace(/[^0-9]/g, ""))}
          onSelect={selectCustomer}
          placeholder="手機號碼（輸入第 4 碼起搜尋舊客）"
          inputMode="numeric"
          className={FIELD_INPUT_CLASS}
        />
        <div className="flex gap-2">
          {SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSource(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                source === opt.value ? "border-terracotta bg-terracotta text-cream" : "border-cream-border text-ink-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="備註（選填）"
          rows={2}
          className="w-full rounded-lg border border-cream-border px-3 py-2 text-sm"
        />
      </section>

      {error && <p className="text-sm text-terracotta-dark">{error}</p>}
      {successMessage && <p className="text-sm text-olive-dark">{successMessage}</p>}

      {!canSubmit && !submitting && (
        <div className="flex items-center gap-2 rounded-xl border border-gold bg-gold/10 px-3 py-2.5 text-sm font-medium text-ink">
          <AlertCircle size={18} className="shrink-0 text-gold-light" />
          <span>還缺：{missingFields.join("、")}</span>
        </div>
      )}

      <button
        disabled={submitting || !canSubmit}
        onClick={handleSubmit}
        className="w-full rounded-full bg-terracotta py-3 text-sm font-medium text-cream disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "建立中…" : "建立預約"}
      </button>
    </div>
  );
}
