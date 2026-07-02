import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Phone, MapPin, Clock, MessageCircle, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "預約方式 | 屏東按摩預約 – LINE・電話 | 溫罐子",
  description:
    "溫罐子屏東按摩預約簡單方便：LINE @warmjar 或撥打 0979-050-630 即可。週一至週日 10:00–22:00 均可預約，位於屏東市莊敬街一段104號。",
  alternates: { canonical: "/booking" },
};

const steps = [
  {
    step: "01",
    title: "選擇服務",
    desc: "先瀏覽我們的服務介紹與價格，決定想要體驗的課程類型與時間長度。",
  },
  {
    step: "02",
    title: "LINE 或電話聯繫",
    desc: "透過 LINE @warmjar 或電話 0979-050-630 告訴我們您想預約的服務與時間。",
  },
  {
    step: "03",
    title: "確認預約",
    desc: "師傅確認時段後，我們會回覆確認訊息，您只需準時到店即可。",
  },
  {
    step: "04",
    title: "到店體驗",
    desc: "建議穿著寬鬆衣物到店，課程前師傅會再次確認力道偏好。課程後享用自製點心湯品。",
  },
];

export default function BookingPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="bg-[#f5ede3] py-20 lg:py-24">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <p className="text-gold text-sm tracking-[0.3em] mb-3 font-medium">
              BOOKING
            </p>
            <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-ink mb-6">
              預約方式
            </h1>
            <p className="text-ink-muted text-lg leading-relaxed">
              預約方式超簡單，LINE 或電話都可以。我們會盡快回覆並為您安排。
            </p>
          </div>
        </section>

        {/* Contact Options */}
        <section className="py-16 bg-cream">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* LINE */}
              <div className="bg-white rounded-2xl border border-cream-border p-8 text-center shadow-sm hover:shadow-md transition-shadow">
                <div className="w-16 h-16 rounded-full bg-[#06C755]/10 text-[#06C755] flex items-center justify-center mx-auto mb-5 text-3xl">
                  💬
                </div>
                <h2 className="font-heading text-2xl font-semibold text-ink mb-2">
                  LINE 預約
                </h2>
                <p className="text-ink-muted mb-1 text-lg font-medium">
                  @warmjar
                </p>
                <p className="text-ink-light text-sm mb-6">
                  點擊下方按鈕直接開啟 LINE 對話，告訴我們想預約的服務與時間。
                </p>
                <a
                  href="https://line.me/R/ti/p/@warmjar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#06C755] text-white font-medium px-7 py-3.5 rounded-full hover:bg-[#05a847] transition-colors w-full justify-center shadow-sm"
                >
                  <MessageCircle size={18} />
                  開啟 LINE 對話
                </a>
              </div>

              {/* Phone */}
              <div className="bg-white rounded-2xl border border-cream-border p-8 text-center shadow-sm hover:shadow-md transition-shadow">
                <div className="w-16 h-16 rounded-full bg-terracotta/10 text-terracotta flex items-center justify-center mx-auto mb-5 text-3xl">
                  📞
                </div>
                <h2 className="font-heading text-2xl font-semibold text-ink mb-2">
                  電話預約
                </h2>
                <p className="text-ink-muted mb-1 text-lg font-medium">
                  0979-050-630
                </p>
                <p className="text-ink-light text-sm mb-6">
                  直接撥打電話，師傅接到後會與您確認時段與課程內容。
                </p>
                <a
                  href="tel:0979050630"
                  className="inline-flex items-center gap-2 bg-terracotta text-cream font-medium px-7 py-3.5 rounded-full hover:bg-terracotta-dark transition-colors w-full justify-center shadow-sm"
                >
                  <Phone size={18} />
                  立即撥打
                </a>
              </div>
            </div>

            {/* Hours */}
            <div className="mt-6 bg-cream-dark rounded-2xl border border-cream-border p-6 flex flex-col sm:flex-row items-center justify-center gap-6 text-center sm:text-left">
              <div className="flex items-center gap-3">
                <Clock size={20} className="text-gold" />
                <div>
                  <p className="font-medium text-ink">營業時間</p>
                  <p className="text-ink-muted text-sm">週一至週日 10:00 – 22:00</p>
                </div>
              </div>
              <div className="hidden sm:block w-px h-10 bg-cream-border" />
              <div className="flex items-center gap-3">
                <MapPin size={20} className="text-gold" />
                <div>
                  <p className="font-medium text-ink">地址</p>
                  <p className="text-ink-muted text-sm">屏東市莊敬街一段104號</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="py-20 lg:py-24 bg-[#f5ede3]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <p className="text-gold text-sm tracking-[0.3em] mb-3 font-medium">
                HOW IT WORKS
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-ink">
                預約流程
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {steps.map((s) => (
                <div
                  key={s.step}
                  className="bg-cream rounded-2xl border border-cream-border p-7 flex gap-5"
                >
                  <div className="shrink-0 w-12 h-12 rounded-full bg-terracotta text-cream flex items-center justify-center font-heading font-semibold text-lg">
                    {s.step}
                  </div>
                  <div>
                    <h3 className="font-heading text-xl font-semibold text-ink mb-2">
                      {s.title}
                    </h3>
                    <p className="text-ink-muted text-sm leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tips */}
        <section className="py-16 bg-cream">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-ink mb-8">
              到店小提醒
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { emoji: "👗", title: "穿著建議", desc: "建議穿著寬鬆、容易更換的衣物，方便師傅進行課程。" },
                { emoji: "⏰", title: "提早到達", desc: "建議預約時間前 5 分鐘到店，讓您有時間放鬆心情。" },
                { emoji: "🍵", title: "課後享受", desc: "課程結束後請稍作休息，享用我們準備的自製點心湯品。" },
              ].map((tip) => (
                <div key={tip.title} className="bg-[#f5ede3] rounded-2xl p-6">
                  <div className="text-3xl mb-3">{tip.emoji}</div>
                  <h3 className="font-medium text-ink mb-2">{tip.title}</h3>
                  <p className="text-ink-muted text-sm leading-relaxed">{tip.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
