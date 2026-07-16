"use client";

import { useEffect, useState, useTransition } from "react";
import { toDataURL } from "qrcode";
import { generateCounterBindGrant } from "@/app/admin/(ops)/members/_actions";

/**
 * Phase 7-A §4.3：櫃檯代客綁定。開啟時立刻向後端要一組短效 grant，
 * QR code 在瀏覽器端本機產生（不經過任何第三方 QR 產生服務，grant
 * token 本身不會離開這個頁面跟客人的手機）。
 */
export function CounterBindDialog({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const [, startTransition] = useTransition();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startTransition(async () => {
      const result = await generateCounterBindGrant(customerId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setExpiresAt(result.expiresAt);
      try {
        const dataUrl = await toDataURL(result.url, { width: 240, margin: 1 });
        setQrDataUrl(dataUrl);
      } catch {
        setError("QR code 產生失敗，請重新開啟");
      }
    });
  }, [customerId]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-4 text-center sm:rounded-2xl">
        <h2 className="font-heading text-lg font-semibold text-ink">LINE 綁定連結</h2>
        <p className="mt-1 text-xs text-ink-light">
          請確認客人本人在場，讓客人用手機 LINE 掃描下方 QR code，10 分鐘內有效。
        </p>

        {!qrDataUrl && !error && <p className="mt-6 text-sm text-ink-light">產生中…</p>}
        {error && <p className="mt-6 text-sm text-terracotta-dark">{error}</p>}
        {qrDataUrl && (
          <div className="mt-4 flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- QR 是本機產生的 data URL，非遠端圖片 */}
            <img src={qrDataUrl} alt="LINE 綁定 QR code" width={240} height={240} />
            {expiresAt && (
              <p className="text-xs text-ink-light">
                有效至{" "}
                {new Date(expiresAt).toLocaleTimeString("zh-TW", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Taipei",
                })}
              </p>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-full border border-cream-border py-2 text-sm text-ink-muted"
        >
          關閉
        </button>
      </div>
    </div>
  );
}
