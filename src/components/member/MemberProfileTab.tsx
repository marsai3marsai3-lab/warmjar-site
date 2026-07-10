"use client";

import { useState, useTransition } from "react";

export type MemberProfileFields = {
  name: string;
  phone: string | null;
  birthday: string | null;
  email: string | null;
};

export function MemberProfileTab({
  profile,
  onSaved,
}: {
  profile: MemberProfileFields;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(profile.name);
  const [birthday, setBirthday] = useState(profile.birthday ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/member/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, birthday: birthday || null, email: email || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "更新失敗");
        return;
      }
      setMessage("已儲存");
      onSaved();
    });
  }

  return (
    <section className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink-muted">手機號碼</label>
        <input
          value={profile.phone ?? ""}
          disabled
          className="w-full rounded-lg border border-cream-border bg-cream-dark px-3 py-2 text-sm text-ink-light"
        />
        <p className="mt-1 text-xs text-ink-light">手機號碼是綁定身分用，如需更改請直接來電 0979-050-630。</p>
      </div>
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
        <label className="mb-1 block text-sm font-medium text-ink-muted">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-cream-border px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-terracotta-dark">{error}</p>}
      {message && <p className="text-sm text-olive-dark">{message}</p>}

      <button
        disabled={isPending || !name.trim()}
        onClick={handleSave}
        className="rounded-full bg-terracotta px-6 py-2.5 text-sm font-medium text-cream disabled:opacity-50"
      >
        儲存
      </button>
    </section>
  );
}
