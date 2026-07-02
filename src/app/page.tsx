import type { Metadata } from "next";
import type React from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LocalBusinessJsonLd } from "@/components/JsonLd";
import {
  Star,
  ChevronRight,
  Phone,
  ExternalLink,
  Flame,
  Leaf,
} from "lucide-react";
import { FacialMassagePngIcon, CuppingPngIcon, FasciaPngIcon, OilMassagePngIcon, SportsMassagePngIcon, StretchPngIcon, AcupressurePngIcon, BreastMassagePngIcon, CoursePngIcon } from "@/components/ServiceIcons";

export const metadata: Metadata = {
  title: "屏東按摩養生館 – 溫罐舒壓・筋膜刀・油壓 | 溫罐子",
  description:
    "溫罐子屏東養生館，提供屏東按摩、溫罐舒壓、全身油壓、肩頸按摩、筋膜刀等專業放鬆按摩服務。自製點心湯品，讓您完整放鬆身心。LINE @warmjar 立即預約，體驗屏東按摩推薦首選。",
  alternates: { canonical: "/" },
};

type ServiceIconComponent = React.ComponentType<{ className?: string; strokeWidth?: number }>;

const services: { Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; name: string; href: string }[] = [
  { Icon: OilMassagePngIcon,    name: "全身油壓",   href: "/services#oil-massage" },
  { Icon: AcupressurePngIcon,  name: "指壓放鬆",   href: "/services#acupressure" },
  { Icon: BreastMassagePngIcon, name: "美胸按摩",  href: "/services#breast" },
  { Icon: FacialMassagePngIcon, name: "小臉按摩",  href: "/services#face" },
  { Icon: Flame,               name: "溫罐舒壓按摩", href: "/services#warm-jar" },
  { Icon: FasciaPngIcon,       name: "筋膜刀舒緩", href: "/services#fascia" },
  { Icon: SportsMassagePngIcon, name: "運動按摩",  href: "/services#sports" },
  { Icon: CuppingPngIcon,      name: "拔罐舒壓",   href: "/services#cupping" },
  { Icon: StretchPngIcon,      name: "伸展舒緩",   href: "/services#stretch" },
  { Icon: CoursePngIcon,      name: "技術課程",   href: "/courses" },
];

const testimonials = [
  {
    name: "Mini Lai",
    initial: "M",
    color: "bg-terracotta",
    comment:
      "第一次體驗～體驗完還會說明目前身體的狀況，還有甜點可以吃～",
    rating: 5,
    service: "溫罐體驗",
    time: "1 個月前",
  },
  {
    name: "高婉如",
    initial: "婉",
    color: "bg-olive",
    comment:
      "初體驗❤️ 謝謝珍珍今天的溫罐，過程都很放鬆，溫罐完之後還會很細心的分析身體狀況，還會說後續怎麼照顧自己，按摩完後還有準備茶點，超讚的！",
    rating: 5,
    service: "溫罐舒壓",
    time: "2 個月前",
  },
  {
    name: "黃雅琳",
    initial: "琳",
    color: "bg-gold",
    comment:
      "上完這堂溫罐課真的收穫滿滿！不只學到專業技術，還能立即運用在生活中！老師教學超用心，氣氛也很好～想學一技之長或放鬆身體的人必來。",
    rating: 5,
    service: "溫罐教學課程",
    time: "2 個月前",
  },
  {
    name: "琇鳳",
    initial: "鳳",
    color: "bg-ink-muted",
    comment:
      "第一次上溫罐課程就超有感！老師教學很細心，從手法到力道都講得很清楚，實際操作也有一對一指導。做完肩頸也輕鬆了～絕對是五星！",
    rating: 5,
    service: "溫罐教學課程",
    time: "2 個月前",
  },
  {
    name: "陳雅琪",
    initial: "琪",
    color: "bg-terracotta",
    comment:
      "第一次來溫罐子，足花花老師服務的，手法超好👍 超舒服，會持續來放鬆，推推大家來體驗！",
    rating: 5,
    service: "溫罐服務",
    time: "2 個月前",
  },
  {
    name: "婷",
    initial: "婷",
    color: "bg-olive",
    comment:
      "第一次學的課程就選擇了溫罐教學，覺得不只能增加收入，這可以幫助家人❤️ 一本厚厚的講義滿滿都是精華，感受到老師的用心。老師很漂亮🦊",
    rating: 5,
    service: "溫罐教學課程",
    time: "2 個月前",
  },
  {
    name: "WEN-CHI HSUEH",
    initial: "W",
    color: "bg-ink-muted",
    comment:
      "找到了溫罐子，原本只預約90分鐘體驗看看，沒想到萍萍技術不錯🔥 後來直接買課堂，溫罐後店家也有小點心，強烈建議一定要來體驗看看溫罐，好好保養自己的身體。",
    rating: 5,
    service: "溫罐舒壓",
    time: "2 個月前",
  },
  {
    name: "李沄瑾",
    initial: "瑾",
    color: "bg-terracotta",
    comment:
      "姊姊會細心解釋身體出砂的原因，還會提醒怎麼保養身體，結束還有點心！環境明亮舒服、姊姊們態度也很好😊 第一次體驗完決定每個月固定來一次。",
    rating: 5,
    service: "溫罐體驗",
    time: "3 個月前",
  },
  {
    name: "胡家榕",
    initial: "榕",
    color: "bg-olive",
    comment:
      "舒適的環境❤️ 寬敞明亮的大廳空間，過程中的溫罐芳療，臥著就能放鬆入睡～療程結束的茶點全是自家老闆純手工製作，精緻又不馬虎，真的值得推薦的舒壓好地方！",
    rating: 5,
    service: "溫罐舒壓",
    time: "3 個月前",
  },
  {
    name: "孟潘",
    initial: "潘",
    color: "bg-gold",
    comment:
      "來找萍萍老師學習溫罐，真心覺得老師教學非常用心、很有耐心。忘記的地方她會帶著手一步步做，細心修正每個動作。老師手法細膩，課程中加了不少徒手手法，整個學習過程讓我很安心。她是真的很認真在教學，能感受到她很喜歡這份事業。真心推薦給想學習溫罐的人🦋",
    rating: 5,
    service: "溫罐教學課程",
    time: "5 個月前",
  },
];

export default function HomePage() {
  return (
    <>
      <LocalBusinessJsonLd />
      <Header />
      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden pt-28 bg-gradient-to-b from-[#FAF7F2] to-[#F3EAE0]">

          {/* 裝飾光暈 */}
          <div className="absolute top-20 right-20 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(193,123,92,0.07) 0%, transparent 70%)" }} />

          {/* 植物裝飾 — 左 */}
          <div className="absolute left-0 top-16 pointer-events-none w-[90px] lg:w-[200px]" style={{ opacity: 0.18 }}>
            <svg viewBox="0 0 90 220" width="100%" fill="none" stroke="#5a7040" strokeLinecap="round" strokeLinejoin="round" preserveAspectRatio="xMidYMid meet">
              <path d="M60 215 C57 185 52 155 48 125 C44 95 46 65 54 30" strokeWidth="1.4"/>
              <path d="M48 125 C32 118 16 105 8 88 C24 82 40 100 48 125" strokeWidth="1"/>
              <path d="M50 158 C34 148 20 132 16 115 C32 115 46 138 50 158" strokeWidth="1"/>
              <path d="M49 96 C36 82 38 62 46 46 C56 60 54 82 49 96" strokeWidth="1"/>
              <path d="M52 68 C62 50 72 32 78 15 C66 22 56 42 52 68" strokeWidth="1"/>
              <path d="M51 108 C42 100 36 90 34 78" strokeWidth="0.8"/>
              <path d="M49 140 C40 130 34 118 36 105" strokeWidth="0.8"/>
            </svg>
          </div>

          {/* 植物裝飾 — 右 */}
          <div className="absolute right-0 top-16 pointer-events-none w-[90px] lg:w-[200px]" style={{ opacity: 0.18 }}>
            <svg viewBox="0 0 90 200" width="100%" fill="none" stroke="#5a7040" strokeLinecap="round" strokeLinejoin="round" preserveAspectRatio="xMidYMid meet">
              <path d="M30 195 C33 168 37 140 40 112 C43 84 40 55 34 25" strokeWidth="1.4"/>
              <path d="M40 112 C56 104 72 92 80 75 C64 70 48 88 40 112" strokeWidth="1"/>
              <path d="M38 148 C54 138 68 122 72 104 C56 105 42 128 38 148" strokeWidth="1"/>
              <path d="M37 82 C52 68 50 48 42 32 C32 46 34 68 37 82" strokeWidth="1"/>
              <path d="M39 128 C48 118 54 107 52 95" strokeWidth="0.8"/>
              <path d="M40 95 C50 84 54 72 50 60" strokeWidth="0.8"/>
            </svg>
          </div>

          {/* 手機：置中；桌機：靠左 */}
          <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-8 pb-20 lg:pb-28">
            <div className="text-center lg:text-left lg:max-w-2xl xl:max-w-3xl">

              {/* 小標 — 手機用葉片裝飾，桌機用橫線 */}
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-8">
                {/* 手機葉片裝飾 */}
                <span className="lg:hidden text-[#B8963E] opacity-60 text-base">❧</span>
                {/* 桌機橫線 */}
                <div className="hidden lg:block w-8 h-px bg-[#B8963E]" />
                <p className="text-gold text-xs tracking-[0.3em] font-medium">
                  屏東市莊敬街 · 紓壓·按摩·放鬆
                </p>
                <span className="lg:hidden text-[#B8963E] opacity-60 text-base">❧</span>
              </div>

              {/* 主標 */}
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl xl:text-6xl text-ink leading-snug mb-8">
                讓按摩舒壓成為<br />
                每個人生活中的<span className="text-terracotta">日常療癒</span>
              </h1>

              {/* 副文 */}
              <p className="text-base sm:text-lg text-ink-muted leading-relaxed mb-3 max-w-lg mx-auto lg:mx-0">
                我相信，舒壓不應該是偶爾的奢侈<br />
                而是每個人都能取用的自我照顧方式。
              </p>
              <p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-lg mx-auto lg:mx-0">
                溫罐子的目標<br />
                是成為最溫暖的身心照顧空間<br />
                也透過技術培訓讓這份溫度持續向外擴散。
              </p>

            </div>
          </div>
        </section>

        {/* ── Services ── */}
        <section className="py-20 lg:py-28 bg-gradient-to-b from-[#F3EAE0] to-[#FAF7F2]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section header — amoonears style */}
            <div className="flex items-center gap-4 mb-14">
              <Leaf className="w-9 h-9 text-gold/70" strokeWidth={1.25} />
              <div>
                <p className="font-heading text-2xl sm:text-3xl font-semibold text-ink-muted tracking-wide">
                  服務項目
                </p>
                <p className="text-gold text-sm tracking-[0.25em] font-medium">SERVICE</p>
              </div>
              <div className="flex-1 h-px bg-gold/30 ml-2" />
            </div>

            {/* Icon grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-x-8" style={{ rowGap: "5rem" }}>
              {services.map(({ Icon, name, href }) => (
                <Link key={name} href={href} className="group flex flex-col items-center gap-4">
                  <div className="text-[#B8963E] group-hover:text-terracotta transition-colors duration-300">
                    <Icon className="w-20 h-20 sm:w-24 sm:h-24" strokeWidth={1.0} />
                  </div>
                  <p className="text-sm sm:text-base text-ink-muted group-hover:text-terracotta transition-colors font-medium text-center leading-snug">
                    {name}
                  </p>
                </Link>
              ))}
            </div>

            {/* More button */}
            <div className="mt-14 text-center">
              <Link
                href="/services"
                className="inline-flex items-center gap-2 text-gold border border-gold/40 font-medium px-7 py-3 rounded-full hover:bg-gold hover:text-cream transition-all duration-200 text-sm tracking-wide"
              >
                點選查看更多 <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Feature – Snacks ── */}
        <section className="py-20 lg:py-28 bg-gradient-to-b from-[#FAF7F2] to-[#F0E6DC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div>
                <p className="text-gold text-sm tracking-[0.3em] mb-3 font-medium">WARM HEART</p>
                <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-ink mb-6 leading-snug">
                  舒壓後，來一口
                  <br />
                  <span className="text-terracotta">自製點心湯品</span>
                </h2>
                <p className="text-ink-muted text-lg leading-relaxed mb-6">
                  在溫罐子，每一位客人做完課程後都能享用我們精心準備的自製點心與湯品。
                  這是我們對「暖心款待」最真誠的表達——讓您的身心在離開之前，感受到最後一絲溫暖。
                </p>
                <ul className="space-y-3">
                  {["每日新鮮自製，隨季節變換", "暖胃湯品與手作小點心", "讓您在放鬆後感受滿滿溫馨"].map(
                    (item) => (
                      <li key={item} className="flex items-start gap-3 text-ink-muted">
                        <span className="mt-1 w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                          <span className="w-2 h-2 rounded-full bg-gold" />
                        </span>
                        {item}
                      </li>
                    )
                  )}
                </ul>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-3xl overflow-hidden relative">
                  <Image
                    src="/s1.jpg"
                    alt="自製點心湯品"
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 bg-terracotta text-cream rounded-2xl px-5 py-3 shadow-lg">
                  <p className="text-sm font-medium">每日新鮮現做</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Google 評論 ── */}
        <section className="py-20 lg:py-28 bg-gradient-to-b from-[#F0E6DC] to-[#FAF7F2]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {/* Google G */}
                  <svg viewBox="0 0 24 24" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <div>
                    <p className="font-heading text-2xl font-semibold text-ink">5.0</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={14} className="fill-[#FBBC05] text-[#FBBC05]" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-ink-muted text-sm">Google 顧客評價</p>
              </div>
              <a
                href="https://g.page/r/CWcj43H9SV_PEAE/review"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border-2 border-[#4285F4] text-[#4285F4] font-medium px-5 py-2.5 rounded-full hover:bg-[#4285F4] hover:text-white transition-colors text-sm shrink-0"
              >
                <ExternalLink size={15} />
                在 Google 留下評價
              </a>
            </div>

            {/* Review cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  className="bg-white rounded-2xl p-6 border border-cream-border shadow-sm hover:shadow-md transition-shadow flex flex-col"
                >
                  {/* Reviewer */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-10 h-10 rounded-full ${t.color} text-cream flex items-center justify-center font-semibold text-base shrink-0`}
                    >
                      {t.initial}
                    </div>
                    <div>
                      <p className="font-medium text-ink text-sm">{t.name}</p>
                      <p className="text-xs text-ink-light">{t.time}</p>
                    </div>
                  </div>
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} size={13} className="fill-[#FBBC05] text-[#FBBC05]" />
                    ))}
                  </div>
                  {/* Comment */}
                  <p className="text-ink-muted text-sm leading-relaxed flex-1">
                    「{t.comment}」
                  </p>
                  <p className="text-xs text-ink-light mt-3 pt-3 border-t border-cream-border">
                    {t.service}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20 lg:py-28 bg-ink text-cream">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <p className="text-terracotta-light text-sm tracking-[0.3em] mb-4 font-medium">
              BOOK NOW
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold mb-6">
              準備好放鬆了嗎？
            </h2>
            <p className="text-cream/70 text-lg leading-relaxed mb-10">
              歡迎透過 LINE 或電話預約，師傅會提前為您安排課程，確保每一次體驗都是最完整的舒壓享受。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://line.me/R/ti/p/@warmjar"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-terracotta text-cream text-lg font-medium px-8 py-4 rounded-full hover:bg-terracotta-light transition-colors shadow-md"
              >
                LINE @warmjar 預約
              </a>
              <a
                href="tel:0979050630"
                className="border-2 border-cream/30 text-cream text-lg font-medium px-8 py-4 rounded-full hover:border-cream hover:bg-cream/10 transition-colors flex items-center justify-center gap-2"
              >
                <Phone size={20} />
                0979-050-630
              </a>
            </div>
            <p className="mt-8 text-cream/40 text-sm">
              週一至週日 10:00–22:00 · 屏東市莊敬街一段104號
            </p>
          </div>
        </section>
        {/* ── 地圖 & 店家資訊 ── */}
        <section className="bg-[#FAF7F2] py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row gap-10 items-start">

              {/* 左：文字資訊 */}
              <div className="lg:w-2/5 space-y-6">
                <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-ink">
                  來訪溫罐子
                </h2>
                <p className="text-ink-muted leading-relaxed">
                  溫罐子養生館位於<strong>屏東市</strong>，提供
                  <strong>屏東按摩</strong>、<strong>屏東舒壓</strong>、溫罐舒壓、筋膜刀、全身油壓等專業服務。
                  歡迎預約，讓每一次造訪都成為真正的放鬆體驗。
                </p>
                <ul className="space-y-3 text-sm text-ink-muted">
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 text-terracotta font-bold">📍</span>
                    <span>屏東縣屏東市莊敬街一段104號</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-terracotta font-bold">📞</span>
                    <a href="tel:0979050630" className="hover:text-terracotta transition-colors">0979-050-630</a>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-terracotta font-bold">🕙</span>
                    <span>週一至週日 10:00 – 22:00</span>
                  </li>
                </ul>
                <a
                  href="https://www.google.com/maps/place/%E6%BA%AB%E7%BD%90%E5%AD%90Warm+jar%E6%BA%AB%E7%BD%90%E6%97%97%E8%89%A6%E5%BA%97%EF%BD%9C%E6%BA%AB%E7%BD%90%E6%8C%89%E6%91%A9%EF%BD%9C%E5%B0%8F%E8%87%89%E8%88%92%E9%A1%8F/@22.6841698,120.4999651,16z/data=!3m1!4b1!4m6!3m5!1s0x346e170252381851:0xcf5f49fd71e32367!8m2!3d22.6841698!4d120.50254!16s%2Fg%2F11vrftbf7k?entry=ttu&g_ep=EgoyMDI2MDYyNC4wIKXMDSoASAFQAw%3D%3D"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-terracotta font-medium hover:underline"
                >
                  在 Google Maps 開啟導航 →
                </a>
              </div>

              {/* 右：地圖 */}
              <div className="lg:w-3/5 w-full rounded-2xl overflow-hidden shadow-md border border-sand/30">
                <iframe
                  title="溫罐子養生館地圖 – 屏東按摩"
                  src="https://maps.google.com/maps?q=22.6841698,120.50254&z=16&output=embed"
                  width="100%"
                  height="360"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
