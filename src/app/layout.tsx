import type { Metadata } from "next";
import { Noto_Sans_TC, Noto_Serif_TC } from "next/font/google";
import "./globals.css";
import FloatingSocial from "@/components/FloatingSocial";
import MobileNavFast from "@/components/MobileNavFast";

const notoSansTc = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const notoSerifTc = Noto_Serif_TC({
  variable: "--font-noto-serif-tc",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.warmjar.com.tw";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "溫罐子 | 屏東按摩Spa館 – 屏東舒壓按摩推薦",
    template: "%s | 屏東溫罐舒壓推薦 | 溫罐子",
  },
  description:
    "溫罐子Spa館位於屏東市，提供溫罐舒壓、筋膜刀、油壓、美胸按摩等專業舒壓服務。自製點心湯品，讓您在身心放鬆之餘享受暖心款待。歡迎來電或 LINE 預約。",
  keywords: [
    "屏東按摩",
    "屏東Spa館",
    "屏東舒壓按摩",
    "屏東全身油壓",
    "屏東肩頸按摩",
    "屏東放鬆按摩",
    "溫罐舒壓",
    "屏東按摩推薦",
    "溫罐子",
  ],
  openGraph: {
    type: "website",
    locale: "zh_TW",
    siteName: "溫罐子Spa館",
    title: "溫罐子 | 屏東按摩Spa館",
    description:
      "屏東市莊敬街 — 溫罐舒壓、筋膜刀、油壓、美胸按摩，附贈自製點心湯品。LINE @warmjar 立即預約。",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "溫罐子Spa館 – 屏東舒壓按摩",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "溫罐子 | 屏東按摩Spa館",
    description:
      "屏東市莊敬街 — 溫罐舒壓、筋膜刀、油壓、美胸按摩，附贈自製點心湯品。",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: BASE_URL,
  },
};

const mobileNavLinks = [
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-TW"
      className={`${notoSansTc.variable} ${notoSerifTc.variable}`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="min-h-screen flex flex-col bg-cream text-ink">

        {/* ── 手機導覽：純 CSS，不需要 JavaScript ── */}
        <input type="checkbox" id="mn" className="sr-only peer" />

        {/* 漢堡按鈕 — label 綁定 checkbox，點擊即切換 */}
        <label
          htmlFor="mn"
          className="fixed top-5 right-3.5 z-[999] lg:hidden w-11 h-11 rounded-full bg-white/80 backdrop-blur-sm shadow border border-[#e0d5c5] flex items-center justify-center cursor-pointer text-xl text-[#2C2416] select-none"
          aria-label="開啟選單"
          style={{ touchAction: "manipulation" }}
        >
          ☰
        </label>

        {/* 抽屜覆層：預設 hidden，checkbox 勾選後顯示 */}
        <div className="fixed inset-0 z-[998] lg:hidden hidden peer-checked:block">
          {/* 暗色背景：點擊關閉 */}
          <label htmlFor="mn" className="absolute inset-0 bg-[#2C2416]/40 cursor-pointer" />

          {/* 抽屜本體 */}
          <div className="absolute top-0 right-0 h-full w-72 bg-[#FAF7F2] shadow-2xl flex flex-col">
            {/* 頂部 */}
            <div className="flex items-center justify-between px-5 py-5 border-b border-[#e0d5c5]">
              <div>
                <p className="font-heading text-lg font-semibold text-[#2C2416]">溫罐子</p>
                <p className="text-xs text-[#8a7a6a] tracking-widest">Warm Jar</p>
              </div>
              <label htmlFor="mn" className="p-2 cursor-pointer text-[#8a7a6a] text-lg leading-none">✕</label>
            </div>

            {/* 導覽連結 — 使用原生 <a> 跳頁後自動關閉抽屜 */}
            <nav className="flex-1 overflow-y-auto px-4 py-3">
              {mobileNavLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-center py-3.5 px-3 text-[#2C2416] font-medium text-base border-b border-[#e8e0d4] last:border-0"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* 底部 */}
            <div className="px-4 py-5 border-t border-[#e0d5c5]">
              <a
                href="https://line.me/R/ti/p/@warmjar"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-[#6B7C4E] text-[#FAF7F2] text-center font-medium py-3.5 rounded-full text-sm"
              >
                LINE 立即預約
              </a>
              <a
                href="tel:0979050630"
                className="flex items-center justify-center gap-1.5 text-[#8a7a6a] text-sm mt-3"
              >
                📞 0979-050-630
              </a>
            </div>
          </div>
        </div>

        <MobileNavFast />
        {children}
        <FloatingSocial />
      </body>
    </html>
  );
}
