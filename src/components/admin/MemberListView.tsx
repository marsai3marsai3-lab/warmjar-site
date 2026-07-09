"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import type { MemberListRow, TagOption } from "@/lib/admin/memberData";

const DEBOUNCE_MS = 300;

type Filters = {
  search: string;
  tagIds: string[];
  blacklistedOnly: boolean;
  birthdayThisMonth: boolean;
  requiresDepositOnly: boolean;
  hasNoShowHistory: boolean;
};

const INITIAL_FILTERS: Filters = {
  search: "",
  tagIds: [],
  blacklistedOnly: false,
  birthdayThisMonth: false,
  requiresDepositOnly: false,
  hasNoShowHistory: false,
};

function buildQuery(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.tagIds.length > 0) params.set("tagIds", filters.tagIds.join(","));
  if (filters.blacklistedOnly) params.set("blacklistedOnly", "1");
  if (filters.birthdayThisMonth) params.set("birthdayThisMonth", "1");
  if (filters.requiresDepositOnly) params.set("requiresDepositOnly", "1");
  if (filters.hasNoShowHistory) params.set("hasNoShowHistory", "1");
  return params.toString();
}

export function MemberListView({ tagOptions }: { tagOptions: TagOption[] }) {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [members, setMembers] = useState<MemberListRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/members?${buildQuery(filters)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "查詢失敗");
          setMembers([]);
          return;
        }
        setError(null);
        setMembers(data.members ?? []);
      } catch {
        if (!cancelled) setError("查詢失敗，請稍後再試");
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filters]);

  function toggleTag(tagId: string) {
    setFilters((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId) ? prev.tagIds.filter((id) => id !== tagId) : [...prev.tagIds, tagId],
    }));
  }

  return (
    <div className="space-y-5 px-4 py-5 pb-10">
      <h1 className="font-heading text-xl font-semibold text-ink">會員</h1>

      <input
        value={filters.search}
        onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
        placeholder="搜尋姓名（2字以上）或手機（4碼以上）"
        className="w-full rounded-lg border border-cream-border px-3 py-2 text-sm outline-none focus:border-terracotta"
      />

      {tagOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tagOptions.map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={`rounded-full border px-3 py-1 text-xs ${
                filters.tagIds.includes(tag.id)
                  ? "border-terracotta bg-terracotta text-cream"
                  : "border-cream-border text-ink-muted"
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-sm text-ink-muted">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={filters.birthdayThisMonth}
            onChange={(e) => setFilters((prev) => ({ ...prev, birthdayThisMonth: e.target.checked }))}
          />
          本月壽星
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={filters.requiresDepositOnly}
            onChange={(e) => setFilters((prev) => ({ ...prev, requiresDepositOnly: e.target.checked }))}
          />
          目前需付訂金
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={filters.hasNoShowHistory}
            onChange={(e) => setFilters((prev) => ({ ...prev, hasNoShowHistory: e.target.checked }))}
          />
          曾有爽約紀錄
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={filters.blacklistedOnly}
            onChange={(e) => setFilters((prev) => ({ ...prev, blacklistedOnly: e.target.checked }))}
          />
          黑名單
        </label>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-terracotta-dark/40 bg-terracotta/5 px-3 py-2.5 text-sm text-terracotta-dark">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      {members === null && !error && <p className="text-sm text-ink-light">載入中…</p>}
      {members?.length === 0 && !error && <p className="text-sm text-ink-light">沒有符合條件的會員。</p>}

      <div className="space-y-2">
        {members?.map((m) => (
          <Link
            key={m.id}
            href={`/admin/members/${m.id}`}
            className="block rounded-xl border border-cream-border bg-white p-3 text-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-ink">{m.name}</span>
              <span className="text-ink-light">{m.phone}</span>
            </div>
            {m.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {m.tags.map((tag) => (
                  <span key={tag.id} className="rounded-full bg-cream-dark px-2 py-0.5 text-xs text-ink-muted">
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-light">
              <span>最後來店：{m.lastVisitAt ?? "—"}</span>
              <span>累計消費：N/A（尚未結帳上線）</span>
              <span>爽約次數：{m.noShowCount}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
