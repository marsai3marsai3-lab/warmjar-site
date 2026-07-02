"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

const navLinks = [
  { href: "/", label: "首頁" },
  { href: "/about", label: "關於我們" },
  { href: "/founder", label: "創辦人理念" },
  { href: "/services", label: "服務項目" },
  { href: "/online-courses", label: "線上課程" },
  { href: "/courses", label: "技術培訓" },
  { href: "/entrepreneurship", label: "創業課程" },
  { href: "/pricing", label: "價格方案" },
  { href: "/faq", label: "常見問題" },
  { href: "/contact", label: "聯絡我們" },
];

const socials = [
  {
    href: "https://www.instagram.com/warmjar",
    label: "Instagram",
    icon: <InstagramIcon size={18} />,
  },
  {
    href: "https://www.facebook.com/profile.php?id=61555245221852",
    label: "Facebook",
    icon: <FacebookIcon size={18} />,
  },
  {
    href: "https://www.tiktok.com/@warmjar",
    label: "TikTok",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.77a8.16 8.16 0 004.77 1.52V6.84a4.85 4.85 0 01-1-.15z" />
      </svg>
    ),
  },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 mobile-arc-header
        bg-white/95 backdrop-blur-sm
        ${scrolled
          ? "lg:bg-cream/95 lg:backdrop-blur-md lg:shadow-sm lg:border-b lg:border-cream-border"
          : "lg:bg-transparent lg:backdrop-blur-none lg:shadow-none"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 sm:h-24">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            {/* 手機版圓形 logo 圖示 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              className="lg:hidden w-10 h-10 rounded-full object-contain border border-[#e0d5c5] bg-white/60 p-0.5"
            />
            <div className="flex flex-col leading-tight">
              <span className="text-2xl sm:text-3xl font-heading font-semibold text-ink group-hover:text-terracotta transition-colors">
                溫罐子
              </span>
              <span className="text-sm text-ink-light tracking-widest">
                Warm Jar
              </span>
            </div>
          </Link>

          {/* 手機版 2x2 連結格 */}
          <div className="flex lg:hidden flex-col flex-1 ml-4 mr-14 justify-center items-center gap-1 min-w-0">
            {[
              [
                { href: "/services", label: "服務項目", external: false },
                { href: "/online-courses", label: "線上課程", external: false },
              ],
              [
                { href: "/courses", label: "技術培訓", external: false },
                { href: "https://line.me/R/ti/p/@warmjar", label: "預約諮詢", external: true },
              ],
            ].map((row, ri) => (
              <div key={ri} className="flex items-center">
                {row.map((item, ci) => (
                  <span key={item.label} className="flex items-center">
                    {ci > 0 && (
                      <span className="text-ink-light/30 mx-1.5 text-[9px]">|</span>
                    )}
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-ink-muted font-medium whitespace-nowrap hover:text-terracotta transition-colors"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className="text-[11px] text-ink-muted font-medium whitespace-nowrap hover:text-terracotta transition-colors"
                      >
                        {item.label}
                      </Link>
                    )}
                  </span>
                ))}
              </div>
            ))}
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-6 ml-10 xl:ml-14">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm xl:text-base text-ink-muted hover:text-terracotta transition-colors font-medium whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop right: socials + phone + CTA */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-3">
            {/* Social icons */}
            <div className="hidden xl:flex items-center gap-2 border-x border-cream-border px-4">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="text-ink-light hover:text-terracotta transition-colors"
                >
                  {s.icon}
                </a>
              ))}
            </div>
            <a
              href="tel:0979050630"
              className="hidden xl:flex items-center gap-1.5 text-sm text-ink-muted hover:text-terracotta transition-colors whitespace-nowrap"
            >
              <Phone size={14} />
              0979-050-630
            </a>
            {user ? (
              <div className="flex items-center gap-3 border-l border-cream-border pl-3">
                <Link
                  href="/dashboard"
                  className="text-sm text-ink-muted hover:text-terracotta transition-colors font-medium whitespace-nowrap"
                >
                  我的課程
                </Link>
                <span className="text-cream-border">|</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-ink-muted hover:text-terracotta transition-colors font-medium whitespace-nowrap"
                >
                  登出
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm text-ink-muted hover:text-terracotta transition-colors font-medium whitespace-nowrap border-l border-cream-border pl-3"
              >
                學員登入
              </Link>
            )}
            <a
              href="https://line.me/R/ti/p/@warmjar"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-olive text-cream text-sm font-medium px-5 py-2.5 rounded-full hover:bg-olive-dark transition-colors shadow-sm whitespace-nowrap"
            >
              LINE 立即預約
            </a>
          </div>

        </div>
      </div>
    </header>
  );
}
