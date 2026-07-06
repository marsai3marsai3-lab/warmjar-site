import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "價格方案 | 屏東按摩價格 – 溫罐舒壓・油壓・筋膜刀",
  description:
    "溫罐子提供多元屏東按摩服務價格方案，溫罐舒壓、全身油壓、筋膜刀、美胸按摩、指壓等，價格透明合理。LINE @warmjar 預約或來電洽詢。",
  alternates: { canonical: "/pricing" },
};

const pricingCategories = [
  {
    category: "小臉舒顏",
    items: [
      {
        name: "撥筋棒 60 分鐘",
        price: 1280,
        note: "搭配熱石，含洗卸、臉部放鬆、頭部放鬆、保濕提亮面膜",
      },
      {
        name: "筋膜刀（臉部）60 分鐘",
        price: 1280,
        note: "搭配熱石，含洗卸、臉部放鬆、頭部放鬆、保濕提亮面膜",
      },
    ],
  },
  {
    category: "美胸基礎呵護（純手技）",
    items: [
      { name: "基礎美胸循環 60 分鐘", price: 1280, note: "含胸部保濕敷膜" },
      { name: "美胸循環＋背部放鬆 90 分鐘", price: 1880, note: "含胸部保濕敷膜" },
    ],
  },
  {
    category: "美胸律動放鬆",
    items: [
      { name: "澎潤美胸 60 分鐘", price: 1580, note: "含胸部保濕敷膜" },
      { name: "澎潤美胸＋背部放鬆 90 分鐘", price: 2180, note: "含胸部保濕敷膜" },
    ],
  },
  {
    category: "美胸低周波",
    items: [
      { name: "女神緊緻 60 分鐘", price: 1580, note: "含胸部保濕敷膜" },
      { name: "女神緊緻＋背部放鬆 90 分鐘", price: 2180, note: "含胸部保濕敷膜" },
    ],
  },
  {
    category: "低周波加購（單部位）",
    items: [
      { name: "微電流加購（單部位）15 分鐘", price: 499, note: "限搭配美胸低周波課程" },
    ],
  },
  {
    category: "美胸專業呵護",
    items: [
      { name: "孕期放鬆 60 分鐘", price: 1580, note: "16-36 週，緩解胸脹、乳腺按摩" },
      { name: "豐沛奶水 90 分鐘", price: 1980, note: "緩解乳脹不適、排空乳腺" },
    ],
  },
  {
    category: "假體放鬆",
    items: [
      { name: "柔軟放鬆 90 分鐘", price: 1880, note: "放鬆假體，讓觸感更自然" },
    ],
  },
  {
    category: "溫罐舒放",
    items: [
      { name: "肩背舒放 60 分鐘", price: 1280, note: "" },
      { name: "背腰舒放 90 分鐘", price: 1880, note: "" },
      { name: "腿部舒放 60 分鐘", price: 1280, note: "" },
      { name: "全身全腿舒放 120 分鐘", price: 2280, note: "" },
      { name: "全身暖腹舒放 120 分鐘", price: 2280, note: "" },
    ],
  },
  {
    category: "熱石油壓舒放",
    items: [
      { name: "肩背舒放 60 分鐘", price: 1280, note: "" },
      { name: "全背舒放 90 分鐘", price: 1880, note: "" },
      { name: "腿部舒放 60 分鐘", price: 1280, note: "" },
      { name: "全身舒放 120 分鐘", price: 2280, note: "" },
    ],
  },
  {
    category: "耳燭 / 臍燭療癒",
    items: [
      { name: "耳燭療癒 30 分鐘", price: 600, note: "放鬆耳壓・淨化舒壓・改善睡眠" },
      { name: "臍燭療癒 50 分鐘", price: 1000, note: "溫暖腹部・促進代謝・舒緩疲勞" },
    ],
  },
  {
    category: "全方位放鬆",
    items: [
      { name: "全方位放鬆 60 分鐘", price: 1280, note: "筋膜刀、拔罐、運動按摩・男師專業操作" },
      { name: "全方位放鬆 90 分鐘", price: 1880, note: "筋膜刀、拔罐、運動按摩・男師專業操作" },
      { name: "全方位放鬆 120 分鐘", price: 2280, note: "筋膜刀、拔罐、運動按摩・男師專業操作" },
    ],
  },
  {
    category: "筋膜刀（走筋膜）",
    items: [
      { name: "上半身筋膜放鬆 60 分鐘", price: 1280, note: "" },
      { name: "下半身筋膜放鬆 60 分鐘", price: 1280, note: "" },
      { name: "全身筋膜放鬆 100 分鐘", price: 2280, note: "" },
    ],
  },
  {
    category: "指壓舒放",
    items: [
      { name: "肩背舒放 60 分鐘", price: 1180, note: "不必脫衣" },
      { name: "臀腿舒放 60 分鐘", price: 1180, note: "不必脫衣" },
      { name: "背腿甦活 90 分鐘", price: 1580, note: "不必脫衣" },
      { name: "全身深層舒放 120 分鐘", price: 1980, note: "不必脫衣" },
    ],
  },
  {
    category: "加購項目",
    items: [
      { name: "肩頸加強 15 分鐘", price: 399, note: "限搭配溫罐/筋膜刀課程加購" },
      { name: "後腿加強 20 分鐘", price: 399, note: "限搭配溫罐/筋膜刀課程加購" },
      { name: "腹部加強 20 分鐘", price: 399, note: "限搭配溫罐/筋膜刀課程加購" },
      { name: "耳燭放鬆 15 分鐘", price: 300, note: "全項目皆可加購" },
      { name: "臍燭放鬆 20 分鐘", price: 399, note: "全項目皆可加購" },
    ],
  },
];

const includes = [
  "課程前諮詢力道偏好",
  "使用天然精油或舒壓素材",
  "私密隔間・安心環境",
  "課程結束後自製點心湯品",
  "師傅全程專業陪伴",
];

export default function PricingPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="bg-[#f5ede3] py-20 lg:py-24">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <p className="text-gold text-sm tracking-[0.3em] mb-3 font-medium">
              PRICING
            </p>
            <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-ink mb-6">
              價格方案
            </h1>
            <p className="text-ink-muted text-lg leading-relaxed">
              透明合理的價格，所有課程均含專業諮詢與課後自製點心湯品。
              如有特殊需求或想了解方案組合，歡迎 LINE 詢問。
            </p>
          </div>
        </section>

        {/* Includes */}
        <section className="py-12 bg-cream border-b border-cream-border">
          <div className="max-w-5xl mx-auto px-4">
            <p className="text-center text-sm text-ink-muted font-medium mb-6 tracking-wide">
              全部課程皆包含
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {includes.map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-1.5 bg-white border border-cream-border rounded-full px-3.5 py-2 text-sm text-ink-muted whitespace-nowrap"
                >
                  <Check size={13} className="text-olive shrink-0" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* 特別優惠 */}
        <section className="py-14 bg-cream">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* 新客體驗價 */}
            <div className="relative bg-gradient-to-br from-terracotta to-terracotta-dark rounded-2xl p-6 text-cream overflow-hidden shadow-md">
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
              <div className="absolute -bottom-8 -left-4 w-24 h-24 bg-white/5 rounded-full" />
              <div className="relative">
                <span className="inline-block text-xs tracking-[0.2em] text-cream/70 uppercase mb-2">
                  New Guest Offer
                </span>
                <h3 className="font-heading text-xl font-semibold mb-1">新客來店體驗價</h3>
                <p className="text-cream/70 text-sm mb-5">
                  首次到訪享受專屬優惠，任選課程皆適用
                </p>
                <div className="flex items-start gap-2 bg-white/15 rounded-xl px-4 py-3 mb-4">
                  <span className="text-cream/80 mt-0.5 shrink-0">💚</span>
                  <p className="text-cream/90 text-sm leading-relaxed">
                    加入官方 LINE 帳號成為會員(免費)，即可享有新客體驗價
                  </p>
                </div>
                <div className="bg-white/15 rounded-xl px-5 py-4 text-center">
                  <div className="font-heading text-4xl font-bold">
                    折抵 $281
                  </div>
                  <p className="text-cream/80 text-sm mt-1">加官方 LINE 好友，任選課程折抵</p>
                </div>
                <p className="text-cream/60 text-xs mt-4">
                  ※ 體驗價每人限用一次，不與其他優惠同享
                </p>
              </div>
            </div>

            {/* 生日優惠 */}
            <div className="relative bg-gradient-to-br from-gold/90 to-gold-light rounded-2xl p-6 text-ink overflow-hidden shadow-md">
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/20 rounded-full" />
              <div className="absolute -bottom-8 -left-4 w-24 h-24 bg-white/10 rounded-full" />
              <div className="relative">
                <span className="inline-block text-xs tracking-[0.2em] text-ink/60 uppercase mb-2">
                  Birthday Special
                </span>
                <h3 className="font-heading text-xl font-semibold mb-1">生日當月 85 折</h3>
                <p className="text-ink/70 text-sm mb-5">
                  壽星限定！生日當月到訪(不限次數)，全品項享 85 折優惠
                </p>
                <div className="bg-white/30 rounded-xl px-5 py-4 text-center mb-4">
                  <div className="font-heading text-5xl font-bold text-ink">
                    85<span className="text-2xl">折</span>
                  </div>
                  <p className="text-ink/70 text-sm mt-1">全品項均適用</p>
                </div>
                <p className="text-ink/60 text-xs">
                  ※ 請於預約時告知生日，憑身分證件核對當月壽星。
                  不與新客體驗價同享。
                </p>
              </div>
            </div>

          </div>
        </section>

        {/* Pricing grid */}
        <section className="py-20 lg:py-28 bg-cream">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pricingCategories.map((cat) => (
                <div
                  key={cat.category}
                  id={cat.category}
                  className="scroll-mt-28 bg-white rounded-2xl border border-cream-border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="bg-gradient-to-r from-terracotta/10 to-cream-dark px-6 py-5 border-b border-cream-border">
                    <h2 className="font-heading text-xl font-semibold text-ink">
                      {cat.category}
                    </h2>
                  </div>
                  <div className="px-6 py-5 space-y-4">
                    {cat.items.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-start justify-between gap-4"
                      >
                        <div>
                          <p className="text-ink font-medium text-sm">
                            {item.name}
                          </p>
                          <p className="text-ink-light text-xs mt-0.5">
                            {item.note}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-terracotta font-heading font-semibold text-xl">
                            ${item.price.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-6 pb-5">
                    <a
                      href="https://line.me/R/ti/p/@warmjar"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center bg-terracotta/10 text-terracotta font-medium py-2.5 rounded-xl hover:bg-terracotta hover:text-cream transition-colors text-sm"
                    >
                      LINE 預約
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Note */}
            <div className="mt-10 bg-cream-dark rounded-2xl p-6 border border-cream-border">
              <p className="text-ink-muted text-sm leading-relaxed text-center">
                ※ 以上價格為參考定價，實際以現場公告為準。如有優惠方案或組合課程，
                歡迎透過 LINE 或電話詢問。本服務為民俗調理，非醫療行為。
              </p>
            </div>

            {/* ECPay placeholder */}
            {/*
              金流預留位置：日後接綠界 ECPay 線上付款
              TODO: 接入 ECPay SDK，在此加入線上付款按鈕
            */}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-[#f5ede3]">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-ink mb-4">
              準備好預約了嗎？
            </h2>
            <p className="text-ink-muted mb-8">
              LINE 或電話預約皆可，我們會為您安排最合適的師傅與時段。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://line.me/R/ti/p/@warmjar"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-terracotta text-cream font-medium px-7 py-3.5 rounded-full hover:bg-terracotta-dark transition-colors shadow-sm"
              >
                LINE @warmjar 預約
              </a>
              <Link
                href="/booking"
                className="border-2 border-ink/20 text-ink font-medium px-7 py-3.5 rounded-full hover:border-terracotta hover:text-terracotta transition-colors flex items-center justify-center gap-2"
              >
                查看預約方式 <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
