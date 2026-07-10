"use client";

import { useEffect, useState } from "react";
import { MemberAppointmentsTab, type MemberAppointment } from "./MemberAppointmentsTab";
import { MemberStoredValueTab, type MemberStoredValueBundle } from "./MemberStoredValueTab";
import { MemberProfileTab, type MemberProfileFields } from "./MemberProfileTab";

type Stage = "loading" | "need_otp" | "ready" | "error";
const TABS = ["我的預約", "儲值", "個人資料"] as const;
type Tab = (typeof TABS)[number];

export function MemberApp() {
  const [stage, setStage] = useState<Stage>("loading");
  const [error, setError] = useState<string | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("我的預約");
  const [appointments, setAppointments] = useState<MemberAppointment[] | null>(null);
  const [storedValue, setStoredValue] = useState<MemberStoredValueBundle | null>(null);
  const [profile, setProfile] = useState<MemberProfileFields | null>(null);

  useEffect(() => {
    void initLiff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initLiff() {
    try {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) {
        setError("LIFF 尚未設定完成，請稍後再試或洽詢店家");
        setStage("error");
        return;
      }

      const liffModule = await import("@line/liff");
      const liff = liffModule.default;
      await liff.init({ liffId });

      if (!liff.isLoggedIn()) {
        liff.login();
        return; // liff.login() 會導頁，之後重新載入頁面再走一次這支流程
      }

      const token = liff.getIDToken();
      if (!token) {
        setError("無法取得 LINE 登入資訊，請重新開啟此頁");
        setStage("error");
        return;
      }
      setIdToken(token);

      const res = await fetch("/api/member/liff-bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "登入失敗，請稍後再試");
        setStage("error");
        return;
      }

      if (data.bound) {
        await loadAll();
        setStage("ready");
      } else {
        setStage("need_otp");
      }
    } catch {
      setError("初始化失敗，請確認從 LINE 開啟此頁面");
      setStage("error");
    }
  }

  async function loadAll() {
    const [apptRes, svRes, profileRes] = await Promise.all([
      fetch("/api/member/appointments").then((r) => r.json()),
      fetch("/api/member/stored-value").then((r) => r.json()),
      fetch("/api/member/profile").then((r) => r.json()),
    ]);
    setAppointments(apptRes.appointments ?? []);
    setStoredValue({ account: svRes.account, transactions: svRes.transactions ?? [] });
    setProfile(profileRes.profile ?? null);
  }

  async function handleSendOtp() {
    setOtpError(null);
    setOtpBusy(true);
    try {
      const res = await fetch("/api/book/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error ?? "發送失敗");
        return;
      }
      setOtpSent(true);
      setDevCode(data.devCode ?? null);
    } catch {
      setOtpError("發送失敗，請稍後再試");
    } finally {
      setOtpBusy(false);
    }
  }

  async function handleVerifyAndBind() {
    if (!idToken) return;
    setOtpError(null);
    setOtpBusy(true);
    try {
      const verifyRes = await fetch("/api/book/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otpCode }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setOtpError(verifyData.error ?? "驗證碼錯誤");
        return;
      }

      const bindRes = await fetch("/api/member/liff-complete-bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, phone }),
      });
      const bindData = await bindRes.json();
      if (!bindRes.ok) {
        setOtpError(bindData.error ?? "綁定失敗，請稍後再試");
        return;
      }

      await loadAll();
      setStage("ready");
    } catch {
      setOtpError("驗證失敗，請稍後再試");
    } finally {
      setOtpBusy(false);
    }
  }

  if (stage === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 text-sm text-ink-light">連接 LINE 中…</div>
    );
  }

  if (stage === "error") {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center text-sm">
        <p className="text-terracotta-dark">{error}</p>
        <p className="mt-2 text-ink-light">請從 LINE 圖文選單重新進入，或直接來電 0979-050-630。</p>
      </div>
    );
  }

  if (stage === "need_otp") {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-8">
        <h1 className="font-heading text-lg font-semibold text-ink">首次使用，請完成手機驗證</h1>
        <p className="text-sm text-ink-muted">若您是門市老客人，這步驟會自動合併您原本的預約與儲值紀錄。</p>

        {!otpSent ? (
          <div className="space-y-2">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="手機號碼（09 開頭）"
              className="w-full rounded-lg border border-cream-border px-3 py-2 text-sm"
            />
            <button
              disabled={otpBusy || !phone}
              onClick={handleSendOtp}
              className="w-full rounded-full bg-terracotta py-2.5 text-sm font-medium text-cream disabled:opacity-50"
            >
              發送驗證碼
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {devCode && <p className="text-xs text-gold-light">開發模式驗證碼：{devCode}</p>}
            <input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="6 碼驗證碼"
              className="w-full rounded-lg border border-cream-border px-3 py-2 text-sm"
            />
            <button
              disabled={otpBusy || otpCode.length !== 6}
              onClick={handleVerifyAndBind}
              className="w-full rounded-full bg-terracotta py-2.5 text-sm font-medium text-cream disabled:opacity-50"
            >
              確認綁定
            </button>
          </div>
        )}
        {otpError && <p className="text-sm text-terracotta-dark">{otpError}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-5 pb-10">
      <div>
        <h1 className="font-heading text-xl font-semibold text-ink">{profile?.name ?? "會員"} 您好</h1>
        {storedValue && storedValue.account.principalBalance + storedValue.account.bonusBalance > 0 && (
          <p className="mt-1 text-sm font-medium text-terracotta-dark">
            儲值餘額 NT$ {(storedValue.account.principalBalance + storedValue.account.bonusBalance).toLocaleString()}
          </p>
        )}
      </div>

      <div className="flex gap-1 border-b border-cream-border">
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

      {tab === "我的預約" && (
        <MemberAppointmentsTab appointments={appointments ?? []} onChanged={loadAll} />
      )}
      {tab === "儲值" && <MemberStoredValueTab bundle={storedValue} />}
      {tab === "個人資料" && profile && <MemberProfileTab profile={profile} onSaved={loadAll} />}
    </div>
  );
}
