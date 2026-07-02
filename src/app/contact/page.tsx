import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Phone, MapPin, Clock, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "聯絡我們 | 屏東按摩 溫罐子地址・電話・地圖",
  description:
    "溫罐子養生館地址：屏東市莊敬街一段104號。電話：0979-050-630。營業時間：週一至週日 10:00–22:00。LINE：@warmjar。歡迎來電或到店詢問。",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="bg-[#f5ede3] py-20 lg:py-24">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <p className="text-gold text-sm tracking-[0.3em] mb-3 font-medium">
              CONTACT
            </p>
            <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-ink mb-6">
              聯絡我們
            </h1>
            <p className="text-ink-muted text-lg leading-relaxed">
              歡迎來電、傳 LINE 或直接到店！我們在屏東市中心等您。
            </p>
          </div>
        </section>

        {/* Contact Info */}
        <section className="py-20 lg:py-24 bg-cream">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Info cards */}
              <div className="space-y-5">
                <h2 className="font-heading text-2xl font-semibold text-ink mb-6">
                  聯絡資訊
                </h2>

                <div className="bg-white rounded-2xl border border-cream-border p-6 flex items-start gap-4 shadow-sm">
                  <div className="w-11 h-11 rounded-xl bg-terracotta/10 text-terracotta flex items-center justify-center shrink-0">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-ink mb-1">地址</p>
                    <address className="not-italic text-ink-muted leading-relaxed">
                      屏東市莊敬街一段104號
                    </address>
                    <a
                      href="https://www.google.com/maps/place/%E6%BA%AB%E7%BD%90%E5%AD%90Warm+jar%E6%BA%AB%E7%BD%90%E6%97%97%E8%89%A6%E5%BA%97%EF%BD%9C%E6%BA%AB%E7%BD%90%E6%8C%89%E6%91%A9%EF%BD%9C%E5%B0%8F%E8%87%89%E8%88%92%E9%A1%8F/@22.6841698,120.50254,17z/data=!3m1!4b1!4m6!3m5!1s0x346e170252381851:0xcf5f49fd71e32367!8m2!3d22.6841698!4d120.50254!16s%2Fg%2F11vrftbf7k?entry=ttu&g_ep=EgoyMDI2MDYyOS4wIKXMDSoASAFQAw%3D%3D"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-terracotta text-sm hover:underline mt-1 inline-block"
                    >
                      在 Google 地圖中開啟 →
                    </a>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-cream-border p-6 flex items-center gap-4 shadow-sm">
                  <div className="w-11 h-11 rounded-xl bg-terracotta/10 text-terracotta flex items-center justify-center shrink-0">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-ink mb-1">電話</p>
                    <a
                      href="tel:0979050630"
                      className="text-ink-muted hover:text-terracotta transition-colors text-lg"
                    >
                      0979-050-630
                    </a>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-cream-border p-6 flex items-center gap-4 shadow-sm">
                  <div className="w-11 h-11 rounded-xl bg-[#06C755]/10 text-[#06C755] flex items-center justify-center shrink-0">
                    <MessageCircle size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-ink mb-1">LINE 官方帳號</p>
                    <a
                      href="https://line.me/R/ti/p/@warmjar"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink-muted hover:text-[#06C755] transition-colors"
                    >
                      @warmjar
                    </a>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-cream-border p-6 flex items-start gap-4 shadow-sm">
                  <div className="w-11 h-11 rounded-xl bg-gold/10 text-gold flex items-center justify-center shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-ink mb-2">營業時間</p>
                    <table className="text-ink-muted text-sm">
                      <tbody>
                        <tr>
                          <td className="pr-4 py-0.5">週一 – 週日</td>
                          <td>10:00 – 22:00</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="text-xs text-ink-light mt-2">
                      ※ 如遇國定假日，營業時間請以 LINE 公告為準
                    </p>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex gap-3">
                  <a
                    href="https://line.me/R/ti/p/@warmjar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-[#06C755] text-white font-medium py-3.5 rounded-full hover:bg-[#05a847] transition-colors shadow-sm"
                  >
                    LINE 預約
                  </a>
                  <a
                    href="tel:0979050630"
                    className="flex-1 text-center bg-terracotta text-cream font-medium py-3.5 rounded-full hover:bg-terracotta-dark transition-colors shadow-sm"
                  >
                    來電預約
                  </a>
                </div>
              </div>

              {/* Google Maps embed */}
              <div>
                <h2 className="font-heading text-2xl font-semibold text-ink mb-6">
                  我們的位置
                </h2>
                <div className="rounded-2xl overflow-hidden border border-cream-border shadow-sm aspect-[4/3] lg:aspect-auto lg:h-full min-h-[300px]">
                  <iframe
                    title="溫罐子養生館位置"
                    src="https://www.google.com/maps?q=%E6%BA%AB%E7%BD%90%E5%AD%90Warm+jar,22.6841698,120.50254&hl=zh-TW&z=17&output=embed"
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: "350px" }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <p className="text-xs text-ink-light mt-3 text-center">
                  屏東市莊敬街一段104號
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Note */}
        <section className="py-12 bg-[#f5ede3]">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <p className="text-ink-muted text-sm leading-relaxed">
              本服務為民俗調理，非醫療行為。如有身體不適，請先諮詢醫師。
              <br />
              溫罐子養生館保留調整營業時間之權利，最新資訊請以 LINE 官方帳號公告為準。
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
