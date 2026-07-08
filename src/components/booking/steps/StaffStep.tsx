"use client";

import { UserRound, Users } from "lucide-react";
import type { StaffOption } from "../types";

type StaffStepProps = {
  staffOptions: StaffOption[] | null;
  error: string | null;
  choice: string | null;
  onChoose: (choice: string) => void;
};

export function StaffStep({ staffOptions, error, choice, onChoose }: StaffStepProps) {
  return (
    <div className="px-4 py-6 space-y-3">
      <h2 className="font-heading text-xl font-semibold text-ink mb-1">選擇師傅</h2>
      <p className="text-ink-muted text-sm mb-4">可指定喜歡的師傅，或讓我們為您安排。</p>

      <button
        type="button"
        onClick={() => onChoose("any")}
        className={`w-full flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
          choice === "any" ? "border-terracotta bg-terracotta/5" : "border-cream-border bg-white"
        }`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-dark text-terracotta">
          <Users size={20} />
        </span>
        <span>
          <span className="block font-medium text-ink">不指定</span>
          <span className="block text-sm text-ink-light">由系統為您安排可服務的師傅</span>
        </span>
      </button>

      {error && <p className="text-sm text-terracotta-dark">{error}</p>}
      {!staffOptions && !error && <p className="text-sm text-ink-light">載入師傅列表中…</p>}
      {staffOptions?.length === 0 && (
        <p className="text-sm text-ink-light">目前沒有可指定的師傅，請選擇「不指定」。</p>
      )}

      {staffOptions?.map((staff) => (
        <button
          key={staff.id}
          type="button"
          onClick={() => onChoose(staff.id)}
          className={`w-full flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
            choice === staff.id ? "border-terracotta bg-terracotta/5" : "border-cream-border bg-white"
          }`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream-dark text-terracotta">
            <UserRound size={20} />
          </span>
          <span className="font-medium text-ink">{staff.name}</span>
        </button>
      ))}
    </div>
  );
}
