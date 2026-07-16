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
import type { StoredValueAccount, StoredValuePlan, StoredValueTransaction } from "@/lib/storedValue/storedValueData";
import { canShowStoredValueRefundButton } from "@/lib/storedValue/storedValueRefund";
import {
  addMemberNote,
  createTag,
  refundStoredValue,
  setCustomerTags,
  toggleBlacklist,
  updateMemberProfile,
  updateMemberRating,
} from "@/app/admin/(ops)/members/_actions";
import { canShowRefundButton } from "@/lib/admin/depositActions";
import { RescheduleDialog } from "./RescheduleDialog";
import { RefundDepositButton } from "./RefundDepositButton";
import { StoredValueTopupDialog } from "./StoredValueTopupDialog";
import { SendLineMessageDialog } from "./SendLineMessageDialog";
import { CounterBindDialog } from "./CounterBindDialog";

const TABS = ["基本資料", "預約歷史", "訂金與爽約", "服務紀錄", "儲值"] as const;
type Tab = (typeof TABS)[number];

const DEPOSIT_REASON_LABEL: Record<string, string> = {
  no_history: "尚無結案紀錄",
  in_good_standing: "信用良好",
  flagged_no_show: "近期爽約，需付訂金",
  flagged_late_cancellation: "近期一小時內取消，需付訂金",
  waived: "已人工免收",
};

const STORED_VALUE_TX_LABEL: Record<string, string> = {
  topup: "儲值",
  consume: "消費",
  refund: "退費",
  adjustment: "調整",
  void_reversal: "作廢回沖",
};

type StaffOption = { id: string; name: string };

function isBirthdayThisMonth(birthday: string | null): boolean {
  if (!birthday) return false;
  return Number(birthday.slice(5, 7)) === Number(taipeiTodayISO().slice(5, 7));
}

export function MemberDetailView({
  detail,
  tagOptions,
  isOwner,
  storedValueAccount,
  storedValueTransactions,
  activePlans,
  staffOptions,
  messageTemplates,
  sentTodayCount,
}: {
  detail: MemberDetail;
  tagOptions: TagOption[];
  isOwner: boolean;
  storedValueAccount: StoredValueAccount;
  storedValueTransactions: StoredValueTransaction[];
  activePlans: StoredValuePlan[];
  staffOptions: StaffOption[];
  messageTemplates: { key: string; name: string }[];
  sentTodayCount: number;
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
  const [showTopupDialog, setShowTopupDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showBindDialog, setShowBindDialog] = useState(false);

  const isBlacklisted = detail.profile.status === "blacklisted";
  const storedValueTotal = storedValueAccount.principalBalance + storedValueAccount.bonusBalance;

  function refresh() {
    router.refresh();
  }

  function handleStoredValueRefund() {
    if (
      !window.confirm(
        `確定要退費嗎？將退回本金 NT$${storedValueAccount.principalBalance.toLocaleString()}（現金/原路，人工作業），贈額 NT$${storedValueAccount.bonusBalance.toLocaleString()} 將同步歸零，帳戶保留可再儲值。`
      )
    )
      return;
    startTransition(async () => {
      const result = await refundStoredValue(detail.profile.id);
      if (!result.ok) setError(result.error);
      else refresh();
    });
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
          <span className="ml-3">LINE：{detail.profile.lineBound ? "已綁定" : "尚未綁定"}</span>
        </p>
        {storedValueTotal > 0 && (
          <p className="mt-1 text-sm font-medium text-terracotta-dark">
            儲值餘額 NT$ {storedValueTotal.toLocaleString()}
          </p>
        )}
        {detail.profile.lineBound && (
          <button
            onClick={() => setShowSendDialog(true)}
            className="mt-2 rounded-full border border-terracotta px-3 py-1 text-xs text-terracotta"
          >
            發送 LINE 訊息
          </button>
        )}
        {!detail.profile.lineBound && (
          <button
            onClick={() => setShowBindDialog(true)}
            className="mt-2 rounded-full border border-terracotta px-3 py-1 text-xs text-terracotta"
          >
            產生 LINE 綁定連結
          </button>
        )}
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

      {tab === "儲值" && (
        <section className="space-y-4">
          <div className="rounded-xl border border-cream-border bg-white p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-muted">本金餘額</span>
              <span className="text-ink">NT$ {storedValueAccount.principalBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">贈額餘額</span>
              <span className="text-ink">NT$ {storedValueAccount.bonusBalance.toLocaleString()}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-cream-border pt-1 font-medium">
              <span className="text-ink">可用總計</span>
              <span className="text-ink">NT$ {storedValueTotal.toLocaleString()}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setShowTopupDialog(true)}
                className="flex-1 rounded-full bg-terracotta py-2 text-sm font-medium text-cream"
              >
                + 儲值
              </button>
              {canShowStoredValueRefundButton(isOwner, storedValueAccount.principalBalance) && (
                <button
                  disabled={isPending}
                  onClick={handleStoredValueRefund}
                  className="flex-1 rounded-full border border-gold py-2 text-sm font-medium text-gold-light disabled:opacity-50"
                >
                  退費
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-ink-muted">交易紀錄</p>
            {storedValueTransactions.length === 0 && <p className="text-sm text-ink-light">目前沒有儲值交易紀錄。</p>}
            <div className="space-y-2">
              {storedValueTransactions.map((t) => (
                <div key={t.id} className="rounded-xl border border-cream-border bg-white p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">
                      {STORED_VALUE_TX_LABEL[t.type] ?? t.type}
                      {t.planName && `・${t.planName}`}
                    </span>
                    <span className="text-xs text-ink-light">
                      {new Date(t.createdAt).toLocaleString("zh-TW", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-ink-muted">
                    本金 {t.principalDelta >= 0 ? "+" : ""}
                    {t.principalDelta.toLocaleString()}／贈額 {t.bonusDelta >= 0 ? "+" : ""}
                    {t.bonusDelta.toLocaleString()}
                    {t.soldByName && `・銷售：${t.soldByName}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {showTopupDialog && (
        <StoredValueTopupDialog
          customerId={detail.profile.id}
          plans={activePlans}
          staffOptions={staffOptions}
          onClose={() => setShowTopupDialog(false)}
          onSuccess={() => {
            setShowTopupDialog(false);
            refresh();
          }}
        />
      )}

      {showSendDialog && (
        <SendLineMessageDialog
          customerId={detail.profile.id}
          templates={messageTemplates}
          sentTodayCount={sentTodayCount}
          onClose={() => setShowSendDialog(false)}
          onSuccess={() => {
            setShowSendDialog(false);
            refresh();
          }}
        />
      )}

      {showBindDialog && (
        <CounterBindDialog customerId={detail.profile.id} onClose={() => setShowBindDialog(false)} />
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
