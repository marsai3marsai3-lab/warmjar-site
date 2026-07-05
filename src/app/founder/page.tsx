import type { Metadata } from "next";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Heart, Zap, Users, Star, Target, ChevronRight } from "lucide-react";
import { PersonJsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "創辦人理念 | 萍萍老師的故事與使命",
  description:
    "認識溫罐子創辦人萍萍老師——從第一次接觸溫罐的感動，到在屏東創立Spa館的心路歷程。了解她的理念、願景與對每位客人的承諾。",
  alternates: { canonical: "/founder" },
};

const philosophies = [
  {
    icon: <Heart className="w-7 h-7" />,
    title: "真實的溫度",
    desc: "按摩不是流程，是對話。每次服務前我們深入了解你的身體狀況，課程為你量身設計，而非制式化的 SOP。",
  },
  {
    icon: <Zap className="w-7 h-7" />,
    title: "持續的精進",
    desc: "技術是需要不斷學習的。我們定期進修、交流新手法，確保帶給你的，永遠是當下最好的照顧方式。",
  },
  {
    icon: <Users className="w-7 h-7" />,
    title: "傳承的價值",
    desc: "從養生到教學，希望將這份技術與溫度傳遞下去，讓更多人也能用雙手給予他人真正的舒壓與療癒。",
  },
];

const missions = [
  { icon: <Star className="w-5 h-5 shrink-0" />, text: "以真實的手法，給予每位客人最適合的舒壓體驗" },
  { icon: <Heart className="w-5 h-5 shrink-0" />, text: "用心準備課程後的點心，讓照顧延伸到最後一刻" },
  { icon: <Zap className="w-5 h-5 shrink-0" />, text: "持續精進技術，不讓服務品質停在原地" },
  { icon: <Users className="w-5 h-5 shrink-0" />, text: "培育更多有溫度的技術人才，讓療癒不斷傳承" },
  { icon: <Target className="w-5 h-5 shrink-0" />, text: "讓每個走出溫罐子的人，都帶著真正的放鬆離開" },
];

export default function FounderPage() {
  return (
    <>
      <PersonJsonLd />
      <Header />
      <main className="pt-20">

        {/* ── Hero ── */}
        <section className="bg-[#f5ede3] py-20 lg:py-28">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

              {/* 照片 */}
              <div className="shrink-0">
                <div className="relative w-52 h-52 lg:w-64 lg:h-64 rounded-full overflow-hidden border-4 border-[#C17B5C]/30">
                  <Image
                    src="/形象照.png"
                    alt="萍萍老師"
                    fill
                    className="object-cover"
                    sizes="256px"
                  />
                </div>
              </div>

              {/* 文字 */}
              <div>
                <p className="text-gold text-sm tracking-[0.3em] mb-3 font-medium">FOUNDER</p>
                <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-ink mb-2">
                  萍萍老師
                </h1>
                <p className="text-terracotta font-medium text-lg mb-6 tracking-wide">
                  溫罐子創辦人 · 技術總監
                </p>
                <p className="font-serif text-xl text-ink-muted leading-relaxed italic border-l-4 border-terracotta/40 pl-5">
                  「用雙手傳遞溫度，<br className="hidden sm:block" />
                  用故事連結每一個來到這裡的人。」
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 個人故事 ── */}
        <section className="py-20 lg:py-28 bg-cream">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div>
                <p className="text-gold text-sm tracking-[0.3em] mb-3 font-medium">MY STORY</p>
                <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-ink mb-8">
                  溫罐子誕生的故事
                </h2>
                <div className="space-y-5 text-ink-muted text-lg leading-relaxed">
                  <p>
                    溫罐子的誕生，不是一個計畫，而是一個感受。
                  </p>
                  <p>
                    在接觸溫罐的第一天，我就被這份療癒的溫度深深打動——
                    不只是身體的放鬆，更是一種被好好照顧的感覺。
                  </p>
                  <p>
                    那個時候我想：如果每個人都能體驗這樣的溫度，那該有多好。
                  </p>
                  <p>
                    於是我開始學習，不停地練習、精進，
                    最終決定在屏東這片土地上，為更多人創造這樣的空間。
                  </p>
                  <p className="font-medium text-ink">
                    溫罐子不只是一間Spa館。<br />
                    它是我對每個來訪者的承諾：<span className="text-terracotta">你值得被好好照顧。</span>
                  </p>
                </div>
              </div>

              {/* 右側數字亮點 */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { num: "屏東", label: "在地深耕", sub: "莊敬街Spa館" },
                  { num: "按摩", label: "核心技術", sub: "專業認證師資" },
                  { num: "1:2", label: "小班教學", sub: "技術培訓師生比" },
                  { num: "❤️", label: "每次課後", sub: "自製點心暖心招待" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="bg-[#f5ede3] rounded-2xl p-6 border border-[#e0d5c5] text-center"
                  >
                    <div className="font-serif text-3xl text-terracotta mb-1">{s.num}</div>
                    <div className="font-medium text-ink text-sm mb-1">{s.label}</div>
                    <div className="text-ink-light text-xs">{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 理念 Philosophy ── */}
        <section className="py-20 lg:py-28 bg-[#f5ede3]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-gold text-sm tracking-[0.3em] mb-3 font-medium">PHILOSOPHY</p>
              <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-ink">
                我的三個核心理念
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {philosophies.map((p, i) => (
                <div
                  key={p.title}
                  className="bg-white rounded-3xl p-8 border border-[#e0d5c5] shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-2xl bg-terracotta/10 flex items-center justify-center text-terracotta mb-5">
                    {p.icon}
                  </div>
                  <div className="text-xs text-terracotta/60 font-medium tracking-widest mb-2">
                    0{i + 1}
                  </div>
                  <h3 className="font-heading text-xl font-semibold text-ink mb-3">{p.title}</h3>
                  <p className="text-ink-muted text-sm leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 願景 Vision ── */}
        <section className="py-20 lg:py-28 bg-ink">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-gold text-sm tracking-[0.3em] mb-6 font-medium">VISION</p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-cream leading-snug mb-8">
              「讓溫罐成為<br />
              每個人生活中的<br className="sm:hidden" />
              <span className="text-terracotta">日常療癒</span>」
            </h2>
            <p className="text-cream/60 text-lg leading-relaxed">
              我相信，舒壓不應該是偶爾的奢侈，<br className="hidden sm:block" />
              而是每個人都能取用的自我照顧方式。
            </p>
            <p className="text-cream/60 text-lg leading-relaxed mt-4">
              溫罐子的目標，是成為屏東最溫暖的身心照顧空間，<br className="hidden sm:block" />
              也透過技術培訓讓這份溫度持續向外擴散。
            </p>
          </div>
        </section>

        {/* ── 使命 Mission ── */}
        <section className="py-20 lg:py-28 bg-cream">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <p className="text-gold text-sm tracking-[0.3em] mb-3 font-medium">MISSION</p>
              <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-ink">
                每天對自己的承諾
              </h2>
            </div>
            <div className="space-y-4">
              {missions.map((m, i) => (
                <div
                  key={i}
                  className="flex items-start gap-5 bg-white rounded-2xl px-6 py-5 border border-cream-border shadow-sm"
                >
                  <div className="w-10 h-10 rounded-full bg-terracotta/10 flex items-center justify-center text-terracotta shrink-0">
                    {m.icon}
                  </div>
                  <p className="text-ink-muted text-base leading-relaxed pt-2">{m.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="py-20 bg-[#f5ede3]">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-ink mb-4">
              來感受這份溫度
            </h2>
            <p className="text-ink-muted text-lg mb-8 leading-relaxed">
              無論你是想好好放鬆，還是想學一門有溫度的技術，<br className="hidden sm:block" />
              溫罐子隨時歡迎你。
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://line.me/R/ti/p/@warmjar"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-terracotta text-cream px-8 py-4 rounded-full font-medium text-base hover:bg-[#A6634A] transition shadow-sm"
              >
                LINE 立即預約
              </a>
              <Link
                href="/courses"
                className="inline-flex items-center justify-center gap-2 border-2 border-ink/20 text-ink px-8 py-4 rounded-full font-medium text-base hover:border-terracotta hover:text-terracotta transition"
              >
                了解技術培訓
                <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
