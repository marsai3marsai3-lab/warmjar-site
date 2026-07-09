"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABEL } from "@/lib/admin/labels";

type AdminAccountMenuProps = {
  displayName: string | null;
  email: string;
  role: string;
};

/**
 * 共用裝置安全功能（見 Phase 4 需求）：後台任何頁面都要能一眼看出
 * 「現在登著的是誰、什麼身分」，手機寬度收成頭像圓點但點開一樣看得到
 * 完整資訊跟登出按鈕，不是只有桌面版才有。
 */
export function AdminAccountMenu({ displayName, email, role }: AdminAccountMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const label = displayName || email || "使用者";
  const roleLabel = ROLE_LABEL[role] ?? role;
  const initial = label.trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-white/15 px-2 py-1 text-cream transition-colors hover:bg-white/25"
        aria-label="帳號選單"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cream text-xs font-semibold text-terracotta">
          {initial}
        </span>
        <span className="hidden text-left text-xs leading-tight sm:block">
          <span className="block font-medium">{label}</span>
          <span className="block text-cream/80">{roleLabel}</span>
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-cream-border bg-white p-2 text-left shadow-lg">
          <div className="border-b border-cream-border px-2 pb-2 sm:hidden">
            <p className="text-sm font-medium text-ink">{label}</p>
            <p className="text-xs text-ink-light">{roleLabel}</p>
          </div>
          <button
            disabled={loggingOut}
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-terracotta-dark hover:bg-cream-dark disabled:opacity-50"
          >
            <LogOut size={16} />
            {loggingOut ? "登出中…" : "登出"}
          </button>
        </div>
      )}
    </div>
  );
}
