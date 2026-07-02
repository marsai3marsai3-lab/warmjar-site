"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone } from "lucide-react";

const navLinks = [
  { href: "/", label: "首頁" },
  { href: "/about", label: "關於我們" },
  { href: "/services", label: "服務項目" },
  { href: "/online-courses", label: "線上課程" },
  { href: "/courses", label: "技術培訓" },
  { href: "/entrepreneurship", label: "創業課程" },
  { href: "/pricing", label: "價格方案" },
  { href: "/faq", label: "常見問題" },
  { href: "/contact", label: "聯絡我們" },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 漢堡按鈕：純 inline style，排除 Tailwind 問題 */}
      <button
        type="button"
        aria-label="開啟選單"
        onClick={() => setOpen(true)}
        className="lg:hidden"
        style={{
          position: "fixed",
          top: "18px",
          right: "14px",
          zIndex: 9999,
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(8px)",
          border: "1px solid #e0d5c5",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#2C2416",
          fontSize: "20px",
          lineHeight: 1,
        }}
      >
        ☰
      </button>

      {/* 抽屜：open 才掛載 DOM，完全不存在就不會擋到任何點擊 */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "rgba(44,36,22,0.45)",
          }}
          onClick={() => setOpen(false)}
        >
          {/* 抽屜本體：點抽屜內不關閉 */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              height: "100%",
              width: "288px",
              background: "#FAF7F2",
              display: "flex",
              flexDirection: "column",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 頂部 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px", borderBottom: "1px solid #e0d5c5" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "18px", color: "#2C2416" }}>溫罐子</div>
                <div style={{ fontSize: "11px", color: "#8a7a6a", letterSpacing: "0.15em" }}>Warm Jar</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ padding: "8px", color: "#8a7a6a", background: "none", border: "none", cursor: "pointer", fontSize: "20px" }}
              >
                ✕
              </button>
            </div>

            {/* 導覽連結 */}
            <nav style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "14px 12px",
                    borderBottom: "1px solid #e8e0d4",
                    color: "#2C2416",
                    fontWeight: 500,
                    fontSize: "16px",
                    textDecoration: "none",
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* 底部 */}
            <div style={{ padding: "16px 16px 20px", borderTop: "1px solid #e0d5c5" }}>
              <a
                href="https://line.me/R/ti/p/@warmjar"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  background: "#6B7C4E",
                  color: "#FAF7F2",
                  textAlign: "center",
                  padding: "14px",
                  borderRadius: "999px",
                  fontWeight: 500,
                  fontSize: "14px",
                  textDecoration: "none",
                  marginBottom: "10px",
                }}
              >
                LINE 立即預約
              </a>
              <a
                href="tel:0979050630"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  color: "#8a7a6a",
                  fontSize: "14px",
                  textDecoration: "none",
                  padding: "8px",
                }}
              >
                <Phone size={14} />
                0979-050-630
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
