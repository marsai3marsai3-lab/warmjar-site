"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Ban, Star } from "lucide-react";
import type { MemberDetail } from "@/lib/admin/memberDetail";
import type { TagOption } from "@/lib/admin/memberData";
import { STATUS_LABEL, STATUS_BLOCK_STYLE, DEPOSIT_STATUS_LABEL, SOURCE_LABEL } from "@/lib/admin/labels";
import { canRescheduleAppointment } from "@/lib/admin/appointmentActions";
import { taipeiTodayISO } from "@/lib/admin/dateUtils";
import {
  addMemberNote,
  createTag,
  setCustomerTags,
  toggleBlacklist,
  updateMemberProfile,
  updateMemberRating,
} from "@/app/admin/(ops)/members/_actions";
import { canShowRefundButton } from "@/lib/admin/depositActions";
import { RescheduleDialog } from "./RescheduleDialog";
import { RefundDepositButton } from "./RefundDepositButton";

const TABS = ["基本資料", "預約歷史", "訂金與爽約", "服務紀錄"] as const;
type Tab = (typeof TABS)[number];

const DEPOSIT_REASON_LABEL: Record<string, string> = {
  no_history: "尚無結案紀錄",
  in_good_standing: "信用良好",
  flagged_no_show: "近期爽約，需付訂金",
  flagged_late_cancellation: "近期一小時內取消，需付訂金",
  waived: "已人工免收",
};

function isBirthdayThisMonth(birthday: string | null): boolean {
  if (!birthday) return false;
  return Number(birthday.slice(5, 7)) === Number(taipeiTodayISO().slice(5, 7));
}

export function MemberDetailView({
  detail,
  tagOptions,
  isOwner,
}: {
  detail: MemberDetail;
  tagOptions: TagOption[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("基本資料");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState(detail.profile.name);
  const [birthday, setBirthday] = useState(detail.profile.birthday ?? "");
  const [internalNote, setInternalNote] = useState(detail.profile.internalNote ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(detail.profile.tags.map((t) => t.id));
  const [newTagName, setNewTagName] = useState("");

  const [newNote, setNewNote] = useState("");
  const [rescheduleTarget, setRescheduleTarget] = useState<{
    id: string;
    serviceVariantId: string;
    date: string;
  } | null>(null);

  const isBlacklisted = detail.profile.status === "blacklisted";

  function refresh() {
    router.refresh();
  }

  function handleSaveProfile() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateMemberProfile(detail.profile.id, {
        name,
        birthday: birthday || null,
        internalNote: internalNote || null,
      });
      if (!result.ok) setError(result.error);
      else {
        setMessage("基本資料已儲存");
        refresh();
      }
    });
  }

  function handleSaveTags(nextIds: string[]) {
    setSelectedTagIds(nextIds);
    startTransition(async () => {
      const result = await setCustomerTags(detail.profile.id, nextIds);
      if (!result.ok) setError(result.error);
      else refresh();
    });
  }

  function handleCreateTag() {
    if (!newTagName.trim()) return;
    startTransition(async () => {
      const result = await createTag(newTagName.trim());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewTagName("");
      handleSaveTags([...selectedTagIds, result.tag.id]);
    });
  }

  function handleToggleBlacklist() {
    const next = !isBlacklisted;
    if (!window.confirm(next ? "確定要將這位會員列入黑名單嗎？" : "確定要解除黑名單嗎？")) return;
    startTransition(async () => {
      const result = await toggleBlacklist(detail.profile.id, next);
      if (!result.ok) setError(result.error);
      else refresh();
    });
  }

  function handleRating(rating: number) {
    startTransition(async () => {
      const result = await updateMemberRating(detail.profile.id, rating === detail.profile.rating ? null : rating);
      if (!result.ok) setError(result.error);
      else refresh();
    });
  }

  function handleAddNote() {
    if (!newNote.trim()) return;
    startTransition(async () => {
      const result = await addMemberNote(detail.profile.id, newNote.trim());
      if (!result.ok) setError(result.error);
      else {
        setNewNote("");
        refresh();
      }
    });
  }

  return (
    <div className="space-y-5 px-4 py-5 pb-10">
      <div className="flex items-center justify-between">
        <Link href="/admin/members" className="text-sm text-ink-muted">
          ← 返回
        </Link>
      </div>

      <div>
        <h1 className="font-heading text-xl font-semibold text-ink">{detail.profile.name}</h1>
        <p className="mt-1 text-sm text-ink-light">{detail.profile.phone ?? "—"}</p>
        {detail.profile.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {detail.profile.tags.map((t) => (
              <span key={t.id} className="rounded-full bg-cream-dark px-2 py-0.5 text-xs text-ink-muted">
                {t.name}
              </span>
            ))}
          </div>
        )}
        <div className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-ink-light">
          {detail.profile.birthday && (
            <span>
              🎂 {detail.profile.birthday}
              {isBirthdayThisMonth(detail.profile.birthday) && "（本月壽星）"}
            </span>
          )}
          <span>來源：{SOURCE_LABEL[detail.profile.source ?? ""] ?? detail.profile.source ?? "—"}</span>
        </div>
        <p className="mt-1 text-xs text-ink-light">
          狀態：{isBlacklisted ? <span className="text-terracotta-dark">● 黑名單</span> : <span>● 正常</span>}
        </p>
      </div>

      {isOwner && (
        <div className="space-y-2 rounded-xl border border-gold/40 bg-gold/5 p-3">
          <p className="text-xs font-medium text-ink-muted">店主專區</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} disabled={isPending} onClick={() => handleRating(star)} aria-label={`評分 ${star} 星`}>
                <Star
                  size={18}
                  className={star <= (detail.profile.rating ?? 0) ? "fill-gold text-gold" : "text-ink-light"}
                />
              </button>
            ))}
          </div>
          <button
            disabled={isPending}
            onClick={handleToggleBlacklist}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm ${
              isBlacklisted
                ? "border-cream-border text-ink-muted"
                : "border-terracotta-dark text-terracotta-dark"
            }`}
          >
            <Ban size={14} />
            {isBlacklisted ? "解除黑名單" : "列入黑名單"}
          </button>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto border-b border-cream-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm ${
              tab === t ? "border-terracotta font-medium text-terracotta" : "border-transparent text-ink-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-terracotta-dark">{error}</p>}
      {message && <p className="text-sm text-olive-dark">{message}</p>}

      {tab === "基本資料" && (
        <section className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">姓名</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-cream-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">生日</label>
            <input
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              className="w-full rounded-lg border border-cream-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">備註（師傅專用，僅後台可見）</label>
            <textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-cream-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink-muted">標籤</label>
            <div className="mb-2 flex flex-wrap gap-2">
              {tagOptions.map((t) => (
                <button
                  key={t.id}
                  disabled={isPending}
                  onClick={() =>
                    handleSaveTags(
                      selectedTagIds.includes(t.id)
                        ? selectedTagIds.filter((id) => id !== t.id)
                        : [...selectedTagIds, t.id]
                    )
                  }
                  className={`rounded-full border px-3 py-1 text-xs ${
                    selectedTagIds.includes(t.id)
                      ? "border-terracotta bg-terracotta text-cream"
                      : "border-cream-border text-ink-muted"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="新增標籤名稱"
                className="flex-1 rounded-lg border border-cream-border px-3 py-1.5 text-sm"
              />
              <button
                disabled={isPending}
                onClick={handleCreateTag}
                className="rounded-full border border-terracotta px-4 py-1.5 text-sm text-terracotta disabled:opacity-50"
              >
                新增
              </button>
            </div>
          </div>
          <button
            disabled={isPending}
            onClick={handleSaveProfile}
            className="rounded-full bg-terracotta px-6 py-2.5 text-sm font-medium text-cream disabled:opacity-50"
          >
            儲存基本資料
          </button>
        </section>
      )}

      {tab === "預約歷史" && (
        <section className="space-y-2">
          {detail.appointments.length === 0 && <p className="text-sm text-ink-light">目前沒有預約紀錄。</p>}
          {detail.appointments.map((a) => (
            <div key={a.id} className="rounded-xl border border-cream-border bg-white p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">
                  {a.date} {a.startTime}–{a.endTime}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BLOCK_STYLE[a.status] ?? ""}`}>
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
              </div>
              <p className="mt-1 text-ink-muted">
                {a.serviceName}・{a.staffName}
              </p>
              <p className="mt-0.5 text-xs text-ink-light">來源：{SOURCE_LABEL[a.source] ?? a.source}</p>
              {canRescheduleAppointment(a.status, !!a.checkedInAt) && (
                <button
                  onClick={() => setRescheduleTarget({ id: a.id, serviceVariantId: a.serviceVariantId, date: a.date })}
                  className="mt-2 rounded-full border border-cream-border px-3 py-1 text-xs text-ink-muted hover:border-terracotta"
                >
                  改期/換師傅
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {tab === "訂金與爽約" && (
        <section className="space-y-4">
          <div className="rounded-xl border border-cream-border bg-white p-3 text-sm">
            <p className="font-medium text-ink">目前訂金狀態</p>
            <p className="mt-1 text-ink-muted">
              {detail.currentDepositPolicy.requiresDeposit ? "目前需付訂金" : "目前不需付訂金"}（
              {DEPOSIT_REASON_LABEL[detail.currentDepositPolicy.reason] ?? detail.currentDepositPolicy.reason}）
            </p>
            <p className="mt-1 text-xs text-ink-light">歷史爽約次數：{detail.noShowCount}</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-ink-muted">訂金紀錄</p>
            {detail.deposits.length === 0 && <p className="text-sm text-ink-light">目前沒有訂金紀錄。</p>}
            <div className="space-y-2">
              {detail.deposits.map((d) => (
                <div key={d.id} className="rounded-xl border border-cream-border bg-white p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">NT$ {d.amount.toLocaleString()}</span>
                    <span className="text-ink-muted">{DEPOSIT_STATUS_LABEL[d.status] ?? d.status}</span>
                  </div>
                  {d.note && <p className="mt-1 text-xs text-ink-light">備註：{d.note}</p>}
                  {canShowRefundButton(isOwner, d.status) && (
                    <RefundDepositButton
                      depositId={d.id}
                      onSuccess={refresh}
                      className="mt-2 rounded-full border border-gold px-3 py-1 text-xs text-gold-light"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === "服務紀錄" && (
        <section className="space-y-3">
          <div className="space-y-2 rounded-xl border border-cream-border bg-white p-3">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="本次調理筆記"
              rows={3}
              className="w-full rounded-lg border border-cream-border px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled
              title="即將推出：照片上傳綁定 Phase 6 電子同意書機制才開放"
              className="w-full cursor-not-allowed rounded-lg border border-dashed border-cream-border py-2 text-sm text-ink-light"
            >
              照片上傳（即將推出）
            </button>
            <button
              disabled={isPending || !newNote.trim()}
              onClick={handleAddNote}
              className="rounded-full bg-terracotta px-6 py-2 text-sm font-medium text-cream disabled:opacity-50"
            >
              新增筆記
            </button>
          </div>

          {detail.notes.length === 0 && <p className="text-sm text-ink-light">目前沒有服務紀錄。</p>}
          <div className="space-y-2">
            {detail.notes.map((n) => (
              <div key={n.id} className="rounded-xl border border-cream-border bg-white p-3 text-sm">
                <p className="text-ink">{n.note}</p>
                <p className="mt-1 text-xs text-ink-light">
                  {n.authorName ?? "—"}・{new Date(n.createdAt).toLocaleString("zh-TW")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {rescheduleTarget && (
        <RescheduleDialog
          appointmentId={rescheduleTarget.id}
          serviceVariantId={rescheduleTarget.serviceVariantId}
          currentDate={rescheduleTarget.date}
          currentStaffId={null}
          onClose={() => setRescheduleTarget(null)}
          onSuccess={() => {
            setRescheduleTarget(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
