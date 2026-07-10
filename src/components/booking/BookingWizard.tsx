"use client";

import { useEffect, useMemo, useState } from "react";
import { StepIndicator } from "./StepIndicator";
import { SummaryBar } from "./SummaryBar";
import { ServiceStep } from "./steps/ServiceStep";
import { StaffStep } from "./steps/StaffStep";
import { DateTimeStep } from "./steps/DateTimeStep";
import { OtpStep } from "./steps/OtpStep";
import { CompleteStep } from "./steps/CompleteStep";
import type {
  BookingResult,
  DaySlots,
  SelectedVariant,
  ServiceCategory,
  ServiceVariant,
  StaffOption,
} from "./types";

function taipeiTodayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
}

function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const DATE_RANGE_DAYS = 14;

type SlotChoice = { startTime: string; endTime: string; availableStaffIds: string[] };

export function BookingWizard() {
  const [step, setStep] = useState(1);

  const dateRange = useMemo(() => {
    const today = taipeiTodayISO();
    return Array.from({ length: DATE_RANGE_DAYS }, (_, i) => addDaysISO(today, i));
  }, []);

  // Step 1: services
  const [categories, setCategories] = useState<ServiceCategory[] | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<SelectedVariant[]>([]);
  const selectedVariantIds = selectedVariants.map((v) => v.id);

  useEffect(() => {
    fetch("/api/book/services")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setCategoriesError(data.error);
          return;
        }
        setCategories(data.categories);
      })
      .catch(() => setCategoriesError("無法取得服務列表，請重新整理再試一次"));
  }, []);

  function toggleVariant(variant: ServiceVariant, serviceName: string) {
    setSelectedVariants((prev) => {
      const exists = prev.some((v) => v.id === variant.id);
      if (exists) return prev.filter((v) => v.id !== variant.id);
      return [...prev, { ...variant, serviceName }];
    });
  }

  // Step 2: staff
  const [staffOptions, setStaffOptions] = useState<StaffOption[] | null>(null);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffChoice, setStaffChoice] = useState<string | null>(null);

  useEffect(() => {
    if (step !== 2 || selectedVariantIds.length === 0) return;
    let cancelled = false;

    async function loadStaff() {
      setStaffOptions(null);
      setStaffError(null);
      try {
        const res = await fetch(`/api/book/staff?serviceVariantIds=${selectedVariantIds.join(",")}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.error) {
          setStaffError(data.error);
          return;
        }
        setStaffOptions(data.staff);
      } catch {
        if (!cancelled) setStaffError("無法取得師傅列表，請重新整理再試一次");
      }
    }

    loadStaff();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedVariantIds.join(",")]);

  // Step 3: date/time
  const [days, setDays] = useState<DaySlots[] | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotChoice | null>(null);

  useEffect(() => {
    if (step !== 3 || selectedVariantIds.length === 0) return;
    let cancelled = false;

    async function loadAvailability() {
      setAvailabilityLoading(true);
      setAvailabilityError(null);
      try {
        const res = await fetch("/api/book/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceVariantIds: selectedVariantIds,
            staffId: staffChoice && staffChoice !== "any" ? staffChoice : undefined,
            dateRange: { startDate: dateRange[0], endDate: dateRange[dateRange.length - 1] },
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.error) {
          setAvailabilityError(data.error);
          return;
        }
        setDays(data.days);
        setSelectedDate(
          (prev) => prev ?? data.days.find((d: DaySlots) => d.slots.length > 0)?.date ?? dateRange[0]
        );
      } catch {
        if (!cancelled) setAvailabilityError("無法取得可預約時段，請稍後再試");
      } finally {
        if (!cancelled) setAvailabilityLoading(false);
      }
    }

    loadAvailability();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedVariantIds.join(","), staffChoice, dateRange]);

  // Step 4: OTP
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [sendOtpError, setSendOtpError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [otpVerified, setOtpVerified] = useState(false);

  // Phase 6 A.1：只有從 LINE 內開啟（liff.isInClient()）才嘗試免驗證
  // 捷徑，一般瀏覽器訪客完全不受影響、不會載入 LIFF SDK。查不到綁定
  // 記錄就靜默失敗，照舊走原本的手機 OTP 流程。
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) return;
      try {
        const liffModule = await import("@line/liff");
        const liff = liffModule.default;
        await liff.init({ liffId });
        if (!liff.isInClient() || !liff.isLoggedIn()) return;

        const idToken = liff.getIDToken();
        if (!idToken) return;

        const res = await fetch("/api/book/liff-autofill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        const data = await res.json();
        if (cancelled || !data.bound) return;

        setCustomerName((prev) => prev || data.name || "");
        setCustomerPhone(data.phone);
        setOtpVerified(true);
      } catch {
        // 靜默失敗，維持原本 OTP 流程——這是加分捷徑，不是必要路徑。
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSendOtp() {
    setSendingOtp(true);
    setSendOtpError(null);
    setDevCode(null);
    try {
      const res = await fetch("/api/book/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: customerPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendOtpError(data.error ?? "發送失敗，請稍後再試");
        return;
      }
      setOtpSent(true);
      setDevCode(data.devCode ?? null);
    } catch {
      setSendOtpError("網路錯誤，請稍後再試");
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleVerifyOtp() {
    setVerifyingOtp(true);
    setVerifyError(null);
    try {
      const res = await fetch("/api/book/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: customerPhone, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyError(data.error ?? "驗證失敗，請稍後再試");
        return;
      }
      setOtpVerified(true);
    } catch {
      setVerifyError("網路錯誤，請稍後再試");
    } finally {
      setVerifyingOtp(false);
    }
  }

  // Step 5: submit + complete
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResult | null>(null);

  async function submitBooking() {
    if (!selectedDate || !selectedSlot) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/book/create-appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceVariantIds: selectedVariantIds,
          staffId: staffChoice && staffChoice !== "any" ? staffChoice : undefined,
          date: selectedDate,
          startTime: selectedSlot.startTime,
          customerName,
          customerPhone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "SLOT_ALREADY_BOOKED") {
          setSubmitError("此時段剛被預約，請重新選擇時段");
          setSelectedSlot(null);
          setStep(3);
          return;
        }
        setSubmitError(data.error ?? "預約建立失敗，請稍後再試");
        return;
      }
      setResult(data);
      setStep(5);
    } catch {
      setSubmitError("網路錯誤，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  }

  const nextConfig = (() => {
    switch (step) {
      case 1:
        return {
          label: "下一步：選師傅",
          disabled: selectedVariants.length === 0,
          onNext: () => setStep(2),
        };
      case 2:
        return {
          label: "下一步：選時段",
          disabled: staffChoice === null,
          onNext: () => setStep(3),
        };
      case 3:
        return {
          label: "下一步：手機驗證",
          disabled: !selectedSlot,
          onNext: () => setStep(4),
        };
      case 4:
        return {
          label: "確認預約",
          disabled: !otpVerified || customerName.trim().length === 0,
          onNext: submitBooking,
          loading: submitting,
        };
      default:
        return { label: "", disabled: true, onNext: () => {} };
    }
  })();

  const staffName =
    (result && staffOptions?.find((s) => s.id === result.staffId)?.name) ?? "系統安排";

  return (
    <div className="min-h-screen bg-cream pb-32">
      {step < 5 && <StepIndicator step={step} />}

      {step === 1 && (
        <ServiceStep
          categories={categories}
          error={categoriesError}
          selectedVariantIds={selectedVariantIds}
          onToggle={toggleVariant}
        />
      )}

      {step === 2 && (
        <StaffStep
          staffOptions={staffOptions}
          error={staffError}
          choice={staffChoice}
          onChoose={setStaffChoice}
        />
      )}

      {step === 3 && (
        <>
          {submitError && (
            <div className="mx-4 mt-4 rounded-xl bg-terracotta/10 px-4 py-3 text-sm text-terracotta-dark">
              {submitError}
            </div>
          )}
          <DateTimeStep
            dateRange={dateRange}
            days={days}
            loading={availabilityLoading}
            error={availabilityError}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setSelectedSlot(null);
            }}
            onSelectSlot={setSelectedSlot}
          />
        </>
      )}

      {step === 4 && (
        <OtpStep
          customerName={customerName}
          onNameChange={setCustomerName}
          customerPhone={customerPhone}
          onPhoneChange={setCustomerPhone}
          otpSent={otpSent}
          onSendOtp={handleSendOtp}
          sendingOtp={sendingOtp}
          sendOtpError={sendOtpError}
          devCode={devCode}
          otpCode={otpCode}
          onOtpCodeChange={setOtpCode}
          onVerifyOtp={handleVerifyOtp}
          verifyingOtp={verifyingOtp}
          verifyError={verifyError}
          otpVerified={otpVerified}
        />
      )}

      {step === 5 && result && (
        <CompleteStep result={result} selectedVariants={selectedVariants} staffName={staffName} />
      )}

      {step < 5 && (
        <SummaryBar
          selectedVariants={selectedVariants}
          onBack={step > 1 ? () => setStep(step - 1) : undefined}
          onNext={nextConfig.onNext}
          nextLabel={nextConfig.label}
          nextDisabled={nextConfig.disabled}
          nextLoading={"loading" in nextConfig ? nextConfig.loading : false}
        />
      )}
    </div>
  );
}
