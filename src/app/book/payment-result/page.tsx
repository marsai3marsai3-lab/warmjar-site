"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Header from "@/components/Header";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const merchantTradeNo = searchParams.get("merchantTradeNo");
  const [status, setStatus] = useState<"loading" | "pending" | "paid" | "failed" | "error">(
    "loading"
  );

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    async function poll() {
      if (!merchantTradeNo) {
        setStatus("error");
        return;
      }

      try {
        const res = await fetch(`/api/book/ecpay/status?merchantTradeNo=${merchantTradeNo}`);
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setStatus("error");
          return;
        }
        if (data.status === "paid") {
          setStatus("paid");
          return;
        }
        if (data.status === "failed") {
          setStatus("failed");
          return;
        }
        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          setStatus("pending");
          return;
        }
        setStatus("pending");
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [merchantTradeNo]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-sm w-full rounded-2xl border border-cream-border bg-white p-8 text-center">
        {(status === "loading" || status === "pending") && (
          <>
            <Loader2 className="mx-auto mb-4 animate-spin text-terracotta" size={40} />
            <h1 className="font-heading text-xl font-semibold text-ink mb-2">確認付款結果中…</h1>
            <p className="text-sm text-ink-muted">請稍候，我們正在跟金流確認您的付款狀態。</p>
          </>
        )}
        {status === "paid" && (
          <>
            <CheckCircle2 className="mx-auto mb-4 text-olive" size={40} />
            <h1 className="font-heading text-xl font-semibold text-ink mb-2">付款成功</h1>
            <p className="text-sm text-ink-muted">訂金已收到，預約已為您確認，期待您的光臨。</p>
          </>
        )}
        {status === "failed" && (
          <>
            <XCircle className="mx-auto mb-4 text-terracotta-dark" size={40} />
            <h1 className="font-heading text-xl font-semibold text-ink mb-2">付款未完成</h1>
            <p className="text-sm text-ink-muted">
              這筆付款沒有成功，您的時段保留期限內可以重新嘗試付款，或透過 LINE／電話與我們聯繫。
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="mx-auto mb-4 text-terracotta-dark" size={40} />
            <h1 className="font-heading text-xl font-semibold text-ink mb-2">查詢失敗</h1>
            <p className="text-sm text-ink-muted">
              無法確認付款狀態，請透過 LINE／電話與我們聯繫確認。
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        <Suspense fallback={null}>
          <PaymentResultContent />
        </Suspense>
      </main>
    </>
  );
}
