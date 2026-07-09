"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import type { ServiceCommissionRow, StaffCommissionRow, StaffServiceOverrideRow } from "@/lib/checkout/commissionRateData";
import { resolveCommissionRate, COMMISSION_RATE_SOURCE_LABEL } from "@/lib/checkout/commissionRate";
import {
  updateServiceCommissionRate,
  updateStaffDefaultRate,
  updateStaffServiceOverride,
} from "@/app/admin/(ops)/checkout/_actions";

type StaffOption = { id: string; name: string };

export function CommissionRateSettings({
  services,
  staffDefaults,
  staffOptions,
  selectedStaffId,
  overrides,
}: {
  services: ServiceCommissionRow[];
  staffDefaults: StaffCommissionRow[];
  staffOptions: StaffOption[];
  selectedStaffId: string | null;
  overrides: StaffServiceOverrideRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serviceRates, setServiceRates] = useState<Record<string, string>>(
    Object.fromEntries(services.map((s) => [s.id, String(s.defaultCommissionRate)]))
  );
  const [staffRates, setStaffRates] = useState<Record<string, string>>(
    Object.fromEntries(staffDefaults.map((s) => [s.id, String(s.defaultCommissionRate)]))
  );
  const [overrideValues, setOverrideValues] = useState<Record<string, string>>(
    Object.fromEntries(overrides.map((o) => [o.serviceId, o.commissionRateOverride?.toString() ?? ""]))
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedStaffDefault = staffDefaults.find((s) => s.id === selectedStaffId)?.defaultCommissionRate ?? 0;
  const selectedStaffName = staffOptions.find((s) => s.id === selectedStaffId)?.name ?? "";

  function saveServiceRate(serviceId: string) {
    const rate = Number(serviceRates[serviceId]);
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await updateServiceCommissionRate(serviceId, rate);
      if (!result.ok) setError(result.error);
      else {
        setMessage("已儲存");
        router.refresh();
      }
    });
  }

  function saveStaffDefault(staffId: string) {
    const rate = Number(staffRates[staffId]);
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await updateStaffDefaultRate(staffId, rate);
      if (!result.ok) setError(result.error);
      else {
        setMessage("已儲存");
        router.refresh();
      }
    });
  }

  function saveOverride(serviceId: string, clear: boolean) {
    if (!selectedStaffId) return;
    const raw = overrideValues[serviceId];
    const rate = clear ? null : raw?.trim() ? Number(raw) : null;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await updateStaffServiceOverride(selectedStaffId, serviceId, rate);
      if (!result.ok) setError(result.error);
      else {
        setMessage("已儲存");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6 px-4 py-5 pb-10">
      <h1 className="font-heading text-xl font-semibold text-ink">抽成率設定</h1>
      <p className="text-xs text-ink-light">
        生效順序：師傅×服務個別設定 &gt; 服務預設 &gt; 師傅保底。僅店主可見與可編輯。
      </p>

      {message && <p className="text-sm text-olive-dark">{message}</p>}
      {error && <p className="text-sm text-terracotta-dark">{error}</p>}

      <section>
        <h2 className="mb-2 font-heading text-lg font-semibold text-ink">服務項目預設抽成率</h2>
        <div className="space-y-2">
          {services.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-xl border border-cream-border bg-white p-3 text-sm">
              <span className="flex-1 text-ink">{s.name}</span>
              <input
                type="number"
                value={serviceRates[s.id] ?? ""}
                onChange={(e) => setServiceRates((prev) => ({ ...prev, [s.id]: e.target.value }))}
                className="w-20 rounded-lg border border-cream-border px-2 py-1"
              />
              <span className="text-ink-muted">%</span>
              <button
                disabled={isPending}
                onClick={() => saveServiceRate(s.id)}
                className="rounded-full border border-terracotta px-3 py-1 text-xs text-terracotta disabled:opacity-50"
              >
                儲存
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-semibold text-ink">師傅個別覆蓋</h2>
          <div className="flex gap-1.5">
            {staffOptions.map((s) => (
              <Link
                key={s.id}
                href={`/admin/commission-rates?staffId=${s.id}`}
                className={`rounded-full px-3 py-1 text-sm ${
                  s.id === selectedStaffId ? "bg-terracotta text-cream" : "border border-cream-border text-ink-muted"
                }`}
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {overrides.map((o) => {
            const service = services.find((s) => s.id === o.serviceId);
            const resolved = resolveCommissionRate({
              staffServiceOverride: o.commissionRateOverride,
              serviceDefaultRate: service?.defaultCommissionRate,
              staffDefaultRate: selectedStaffDefault,
            });
            const sourceDetail =
              resolved.source === "staff_service_override"
                ? `${selectedStaffName}×${o.serviceName} 個別設定`
                : COMMISSION_RATE_SOURCE_LABEL[resolved.source];

            return (
              <div key={o.serviceId} className="rounded-xl border border-cream-border bg-white p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">{o.serviceName}</span>
                  <span className="text-xs text-ink-muted">
                    目前生效 {resolved.rate}%（來自：{sourceDetail}）
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-ink-light">個別覆蓋</span>
                  <input
                    type="number"
                    value={overrideValues[o.serviceId] ?? ""}
                    onChange={(e) => setOverrideValues((prev) => ({ ...prev, [o.serviceId]: e.target.value }))}
                    placeholder="未設定"
                    className="w-20 rounded-lg border border-cream-border px-2 py-1 text-sm"
                  />
                  <span className="text-ink-muted">%</span>
                  <button
                    disabled={isPending}
                    onClick={() => saveOverride(o.serviceId, false)}
                    className="rounded-full border border-terracotta px-3 py-1 text-xs text-terracotta disabled:opacity-50"
                  >
                    儲存
                  </button>
                  <button
                    disabled={isPending || o.commissionRateOverride === null}
                    onClick={() => saveOverride(o.serviceId, true)}
                    className="rounded-full border border-cream-border px-3 py-1 text-xs text-ink-muted disabled:opacity-50"
                  >
                    清除覆蓋
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-heading text-lg font-semibold text-ink">師傅保底抽成率</h2>
        <p className="mb-2 text-xs text-ink-light">防禦性欄位，只有服務本身沒有預設值時才會用到，正常不會生效。</p>
        <div className="space-y-2">
          {staffDefaults.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-xl border border-cream-border bg-white p-3 text-sm">
              <span className="flex-1 text-ink">{s.name}</span>
              <input
                type="number"
                value={staffRates[s.id] ?? ""}
                onChange={(e) => setStaffRates((prev) => ({ ...prev, [s.id]: e.target.value }))}
                className="w-20 rounded-lg border border-cream-border px-2 py-1"
              />
              <span className="text-ink-muted">%</span>
              <button
                disabled={isPending}
                onClick={() => saveStaffDefault(s.id)}
                className="rounded-full border border-terracotta px-3 py-1 text-xs text-terracotta disabled:opacity-50"
              >
                儲存
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
