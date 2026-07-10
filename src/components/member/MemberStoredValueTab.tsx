"use client";

export type MemberStoredValueBundle = {
  account: { principalBalance: number; bonusBalance: number };
  transactions: {
    id: string;
    type: string;
    principalDelta: number;
    bonusDelta: number;
    planName: string | null;
    createdAt: string;
  }[];
};

const TX_LABEL: Record<string, string> = {
  topup: "儲值",
  consume: "消費",
  refund: "退費",
  adjustment: "調整",
  void_reversal: "作廢回沖",
};

// 唯讀——退費維持 owner 限定的後台操作，客人不能自助退費（Phase 5 既定規則，本輪不變更）。
export function MemberStoredValueTab({ bundle }: { bundle: MemberStoredValueBundle | null }) {
  if (!bundle) return <p className="text-sm text-ink-light">載入中…</p>;

  const total = bundle.account.principalBalance + bundle.account.bonusBalance;

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-cream-border bg-white p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-muted">本金餘額</span>
          <span className="text-ink">NT$ {bundle.account.principalBalance.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-muted">贈額餘額</span>
          <span className="text-ink">NT$ {bundle.account.bonusBalance.toLocaleString()}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-cream-border pt-1 font-medium">
          <span className="text-ink">可用總計</span>
          <span className="text-ink">NT$ {total.toLocaleString()}</span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-ink-muted">交易紀錄</p>
        {bundle.transactions.length === 0 && <p className="text-sm text-ink-light">目前沒有儲值交易紀錄。</p>}
        <div className="space-y-2">
          {bundle.transactions.map((t) => (
            <div key={t.id} className="rounded-xl border border-cream-border bg-white p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">
                  {TX_LABEL[t.type] ?? t.type}
                  {t.planName && `・${t.planName}`}
                </span>
                <span className="text-xs text-ink-light">
                  {new Date(t.createdAt).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" })}
                </span>
              </div>
              <p className="mt-1 text-ink-muted">
                本金 {t.principalDelta >= 0 ? "+" : ""}
                {t.principalDelta.toLocaleString()}／贈額 {t.bonusDelta >= 0 ? "+" : ""}
                {t.bonusDelta.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
