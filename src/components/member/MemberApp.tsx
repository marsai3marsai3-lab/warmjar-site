"use client";

import { useEffect, useRef, useState } from "react";
import { MemberAppointmentsTab, type MemberAppointment } from "./MemberAppointmentsTab";
import { MemberStoredValueTab, type MemberStoredValueBundle } from "./MemberStoredValueTab";
import { MemberProfileTab, type MemberProfileFields } from "./MemberProfileTab";

type LoadingStage = "init" | "checking_login" | "redirecting" | "verifying";
type Stage = LoadingStage | "need_otp" | "ready" | "error";
const TABS = ["我的預約", "儲值", "個人資料"] as const;
type Tab = (typeof TABS)[number];

// 每個進行中的子階段各自對應一句畫面文字，真機排查時能看出卡在哪一步
// ——原本整段流程只有一句「連接 LINE 中」，卡住時完全看不出是 init、
// isLoggedIn 判斷、跳轉登入、還是等後端驗證回應。
const LOADING_LABEL: Record<LoadingStage, string> = {
  init: "初始化 LIFF 中…",
  checking_login: "檢查登入狀態中…",
  redirecting: "跳轉 LINE 登入中…",
  verifying: "驗證身分中…",
};

export function MemberApp() {
  const [stage, setStage] = useState<Stage>("init");
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

  // 防止「這次 effect 已經清掉了，但先前那次呼叫的 async 工作晚一步
  // 才 resolve」蓋掉當下畫面狀態——React dev 模式的 StrictMode 會把
  // effect 故意重複跑一次（mount→cleanup→mount），initLiff() 因此可能
  // 同時有兩個執行個體在跑；用這支 ref 讓「已經被取代」的那個個體，
  // resolve 之後不再呼叫任何 setState。
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    void initLiff();
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initLiff() {
    try {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) {
        setError("LIFF 尚未設定完成（NEXT_PUBLIC_LIFF_ID 未填），請稍後再試或洽詢店家");
        setStage("error");
        return;
      }

      // 原本只有 liff.init() 包了 10 秒逾時，前面「動態載入 @line/liff
      // 這個 SDK chunk」完全沒有保護——如果這支 import() 本身卡住（真機
      // 排查時遇過：透過 cloudflared 通道下載 SDK chunk 卡住不動），
      // 逾時計時器根本還沒建立，永遠不會觸發。改成把「載入 SDK + 呼叫
      // init()」整段包進同一個 10 秒視窗。
      //
      // 刻意不改成 static import：這個檔案雖然是 "use client"，但
      // client component 在 Next.js App Router 底下 SSR 階段一樣會被
      // 執行一次產生初始 HTML，@line/liff 這種存取 window/navigator 的
      // 瀏覽器 SDK 若在模組頂層被 static import，很可能讓 /member 的
      // SSR 直接噴錯——這正是原始草案（phase-6-line-integration-draft.md
      // A.2）選擇「npm 套件 + client component 內動態 import」的理由，
      // 不是隨手挑的寫法，保留動態 import、只是把逾時範圍擴大。
      const LIFF_INIT_TIMEOUT_MS = 10_000;
      const liff = await Promise.race([
        (async () => {
          const liffModule = await import("@line/liff");
          await liffModule.default.init({ liffId });
          return liffModule.default;
        })(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(`LIFF 初始化逾時（${LIFF_INIT_TIMEOUT_MS / 1000} 秒無回應，含 SDK 載入與 liff.init()）`)
              ),
            LIFF_INIT_TIMEOUT_MS
          )
        ),
      ]);
      if (!mountedRef.current) return;

      setStage("checking_login");

      if (!liff.isLoggedIn()) {
        setStage("redirecting");

        // liff.login() 理論上會用 location.href 導去 LINE 登入頁，導頁
        // 一旦真的發生，整個頁面（含這支 timer）會被瀏覽器銷毀，不會
        // 執行到下面這行。如果 5 秒後這行還是跑了，代表導頁根本沒發生
        // ——外部瀏覽器測試時常見成因：LIFF 綁定的 LINE Login channel
        // 沒有開放 Web 登入、或瀏覽器封鎖第三方 cookie 導致 LIFF SDK
        // 內部狀態寫不進去，兩者都不會拋出 JS 例外，只會靜靜卡住。
        const REDIRECT_TIMEOUT_MS = 5_000;
        setTimeout(() => {
          if (!mountedRef.current) return;
          setError(
            `跳轉 LINE 登入逾時（${REDIRECT_TIMEOUT_MS / 1000} 秒內頁面沒有跳轉，代表 liff.login() 沒有真的導頁）。` +
              "可能原因：①這個 LIFF 綁定的 LINE Login channel 未開放外部瀏覽器登入或 Scope 未存檔；" +
              "②瀏覽器封鎖第三方 cookie／儲存空間導致 LIFF SDK 內部狀態寫入失敗（部分瀏覽器的無痕/隱私模式常見）。" +
              "建議：改用手機 LINE 內建瀏覽器開啟此頁測試，若手機也卡在這裡，優先檢查 Login channel 的 Scope 設定。"
          );
          setStage("error");
        }, REDIRECT_TIMEOUT_MS);

        liff.login();
        return;
      }

      const token = liff.getIDToken();
      if (!token) {
        setError("無法取得 LINE 登入資訊，請重新開啟此頁");
        setStage("error");
        return;
      }
      setIdToken(token);

      setStage("verifying");
      const VERIFY_TIMEOUT_MS = 10_000;
      const verifyController = new AbortController();
      const verifyTimer = setTimeout(() => verifyController.abort(), VERIFY_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch("/api/member/liff-bind", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: token }),
          signal: verifyController.signal,
        });
      } catch (fetchErr) {
        if (fetchErr instanceof DOMException && fetchErr.name === "AbortError") {
          throw new Error(`身分驗證逾時（${VERIFY_TIMEOUT_MS / 1000} 秒無回應），請確認網路連線`);
        }
        throw fetchErr;
      } finally {
        clearTimeout(verifyTimer);
      }
      if (!mountedRef.current) return;
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "登入失敗，請稍後再試");
        setStage("error");
        return;
      }

      if (data.bound) {
        await loadAll();
        if (!mountedRef.current) return;
        setStage("ready");
      } else {
        setStage("need_otp");
      }
    } catch (err) {
      if (!mountedRef.current) return;
      // 真機排查用：把實際錯誤內容顯示出來，不要無聲吞掉只給通用文案。
      const detail = err instanceof Error ? err.message : String(err);
      setError(`初始化失敗：${detail}（請確認從 LINE 開啟此頁面）`);
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

  if (stage === "init" || stage === "checking_login" || stage === "redirecting" || stage === "verifying") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 text-sm text-ink-light">
        {LOADING_LABEL[stage]}
      </div>
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
