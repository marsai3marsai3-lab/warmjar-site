import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Heart, Leaf, Users, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "關於我們 | 屏東養生館 溫罐子理念與故事",
  description:
    "溫罐子養生館創立於屏東，我們相信每個人都值得一個真正放鬆的空間。了解我們的服務理念、溫馨環境，以及對每位客人用心款待的承諾。",
  alternates: { canonical: "/about" },
};

const values = [
  {
    icon: <Heart className="w-7 h-7" />,
    title: "用心款待",
    desc: "從預約到離開，每一個環節都以客人的舒適為優先，用心對待每一位來訪的朋友。",
  },
  {
    icon: <Leaf className="w-7 h-7" />,
    title: "自然舒壓",
    desc: "採用天然素材，結合傳統民俗調理技法，在不過度干預的方式下，讓身體自然放鬆。",
  },
  {
    icon: <Users className="w-7 h-7" />,
    title: "專業服務",
    desc: "師傅均受過專業培訓，課程前會充分溝通需求與敏感度，確保每次體驗都安心舒適。",
  },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="bg-[#f5ede3] py-20 lg:py-28">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <p className="text-gold text-sm tracking-[0.3em] mb-3 font-medium">
              ABOUT US
            </p>
            <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-ink mb-6">
              關於溫罐子
            </h1>
            <p className="text-ink-muted text-lg leading-relaxed">
              我們是一間位於屏東市的按摩養生館，相信每個人都需要一個真正放鬆的空間——
              不只是身體，也是心靈。
            </p>
          </div>
        </section>

        {/* Story */}
        <section className="py-20 lg:py-28 bg-cream">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div>
                <p className="text-gold text-sm tracking-[0.3em] mb-3 font-medium">
                  OUR STORY
                </p>
                <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-ink mb-6">
                  溫罐子的故事
                </h2>
                <div className="space-y-5 text-ink-muted text-lg leading-relaxed">
                  <p>
                    溫罐子的誕生，來自於一個很簡單的初衷：希望在繁忙的生活中，
                    能有一個地方讓人真正地放慢腳步、好好照顧自己。
                  </p>
                  <p>
                    我們選在屏東市中心，為在地客人提供溫罐舒壓、筋膜刀、油壓等
                    多元舒壓服務。每一套課程都是師傅依照客人當下的身體狀況量身調整，
                    不是制式化的流程，而是真正有溫度的服務。
                  </p>
                  <p>
                    讓我們最驕傲的，是做完課程後端上的一杯自製湯品或點心。
                    那不只是招待，而是我們想對每位客人說：「謝謝你來，好好休息。」
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-terracotta/20 to-cream-dark flex items-center justify-center">
                  <div className="text-center p-6">
                    <div className="text-5xl mb-3">🏠</div>
                    <p className="font-heading text-ink font-medium">溫馨空間</p>
                  </div>
                </div>
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-olive/20 to-cream-dark flex items-center justify-center mt-8">
                  <div className="text-center p-6">
                    <div className="text-5xl mb-3">✨</div>
                    <p className="font-heading text-ink font-medium">專業師傅</p>
                  </div>
                </div>
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-gold/20 to-cream-dark flex items-center justify-center">
                  <div className="text-center p-6">
                    <div className="text-5xl mb-3">🍵</div>
                    <p className="font-heading text-ink font-medium">自製點心</p>
                  </div>
                </div>
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-terracotta/15 to-olive/15 flex items-center justify-center mt-8">
                  <div className="text-center p-6">
                    <div className="text-5xl mb-3">💆</div>
                    <p className="font-heading text-ink font-medium">身心舒壓</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-20 lg:py-28 bg-[#f5ede3]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-gold text-sm tracking-[0.3em] mb-3 font-medium">
                OUR VALUES
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-ink">
                我們的服務理念
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {values.map((v) => (
                <div
                  key={v.title}
                  className="bg-cream rounded-2xl p-8 border border-cream-border shadow-sm"
                >
                  <div className="w-12 h-12 rounded-xl bg-terracotta/10 text-terracotta flex items-center justify-center mb-5">
                    {v.icon}
                  </div>
                  <h3 className="font-heading text-xl font-semibold text-ink mb-3">
                    {v.title}
                  </h3>
                  <p className="text-ink-muted leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Environment */}
        <section className="py-20 lg:py-28 bg-cream">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-gold text-sm tracking-[0.3em] mb-3 font-medium">
              SPACE
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-ink mb-6">
              溫馨舒適的空間
            </h2>
            <p className="text-ink-muted text-lg leading-relaxed mb-10">
              我們的空間以米白、陶土色系為主調，搭配自然植物點綴，
              打造一個讓人一踏入就感到放鬆的環境。私密隔間、柔和燈光、
              恰到好處的音樂，讓您從進門的那一刻起就開始放鬆。
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
              {[
                { emoji: "🛏", label: "私密隔間" },
                { emoji: "🕯", label: "柔和燈光" },
                { emoji: "🎵", label: "舒壓音樂" },
                { emoji: "🌿", label: "自然植物" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-[#f5ede3] rounded-2xl py-6 flex flex-col items-center gap-2"
                >
                  <span className="text-3xl">{item.emoji}</span>
                  <span className="text-sm text-ink-muted font-medium">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 bg-terracotta text-cream font-medium px-8 py-4 rounded-full hover:bg-terracotta-dark transition-colors shadow-md text-lg"
            >
              預約體驗 <ChevronRight size={20} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
