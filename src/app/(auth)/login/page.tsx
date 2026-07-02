"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("電子郵件或密碼錯誤，請重新確認。");
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <section className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-cream">
      <div className="w-full max-w-sm">

        {/* Logo + 標題 */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center mb-6 group">
            <span className="font-heading text-3xl font-semibold text-ink group-hover:text-terracotta transition-colors">
              溫罐子
            </span>
            <span className="text-xs text-ink-light tracking-widest">Warm Jar</span>
          </Link>
          <h1 className="font-heading text-2xl text-ink mb-1">學員登入</h1>
          <p className="text-ink-muted text-sm">登入後可無限次觀看已購買的線上課程</p>
        </div>

        {/* 表單卡片 */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl border border-cream-border shadow-sm p-7 space-y-5"
        >
          {/* 電子郵件 */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">
              電子郵件
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-xl border border-cream-border bg-cream px-4 py-3 text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition"
            />
          </div>

          {/* 密碼 */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">
              密碼
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-cream-border bg-cream px-4 py-3 text-sm text-ink placeholder-ink/30 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition"
            />
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* 登入按鈕 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-terracotta text-cream rounded-full py-3.5 text-sm font-medium hover:bg-terracotta-dark transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "登入中…" : "立即登入"}
          </button>
        </form>

        {/* 底部連結 */}
        <p className="text-center text-sm text-ink-muted mt-6">
          還沒有帳號？{" "}
          <Link href="/register" className="text-terracotta font-medium hover:underline">
            立即註冊
          </Link>
        </p>

        <p className="text-center mt-3">
          <Link href="/" className="text-xs text-ink-light hover:text-ink transition-colors">
            ← 返回官網首頁
          </Link>
        </p>
      </div>
    </section>
  );
}
