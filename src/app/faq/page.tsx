import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FaqPageJsonLd } from "@/components/JsonLd";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "常見問題 FAQ | 屏東按摩諮詢 – 溫罐子",
  description:
    "溫罐子常見問題解答：溫罐和刮痧的差別、課程會不會痛、多久做一次合適、第一次來要注意什麼、屏東按摩如何預約等常見疑問一次解答。",
  alternates: { canonical: "/faq" },
};

const faqs = [
  {
    question: "為什麼溫罐子是屏東按摩推薦的首選？",
    answer:
      "溫罐子深耕屏東在地，每位師傅都經過專業訓練，課程前會先了解您的身體狀況與力道偏好，量身調整而非制式化流程。除了招牌溫罐舒壓，也提供全身油壓、筋膜刀、肩頸按摩等多元服務，課程結束後還會準備自製點心與湯品款待。Google 評價 5.0 顆星，是許多屏東在地客人持續回訪推薦的按摩館。",
  },
  {
    question: "溫罐和刮痧有什麼不同？",
    answer:
      "溫罐使用有溫度的罐具在皮膚上滑動，讓肌肉在溫熱中放鬆；刮痧則以刮板在皮膚上刮動。兩者都是傳統民俗調理方式，各有其舒緩效果。溫罐因為有溫熱感，對喜歡暖感體驗的客人特別合適。",
  },
  {
    question: "做完會不會痛？",
    answer:
      "我們的課程強調舒適放鬆，師傅會在課程前確認您的力道偏好，並依您的敏感度隨時調整。結束後可能有輕微皮膚泛紅，屬正常現象，通常數日內自然消退。如果過程中有任何不適，請隨時告知師傅調整。",
  },
  {
    question: "多久做一次比較好？",
    answer:
      "一般建議兩週左右一次，視個人生活壓力與身體狀況彈性調整。壓力較大或常久坐的朋友可以縮短間隔；身體狀況較好時則可以每月一次作為保養頻率。",
  },
  {
    question: "第一次來需要準備什麼？",
    answer:
      "建議穿著寬鬆、方便更換的衣物前來。如果有特定身體部位不舒服或特別需要加強的地方，到店後告訴師傅即可，師傅會根據您的需求量身調整。若方便，建議提前以 LINE 或電話預約，以確保有空檔安排。",
  },
  {
    question: "有提供什麼服務？",
    answer:
      "我們提供溫罐舒壓按摩、筋膜刀舒緩、全身油壓、美胸按摩、指壓放鬆、運動按摩、小臉按摩等多元舒壓服務。每位客人課程結束後均可享用我們精心準備的自製點心與湯品。",
  },
  {
    question: "美胸按摩是由誰服務？",
    answer:
      "美胸舒壓按摩課程全程由女性師傅服務，並以隱私為優先考量設計私密隔間環境，讓您在完全安心的情況下享受課程。",
  },
  {
    question: "如何預約？",
    answer:
      "最方便的方式是透過 LINE @warmjar 傳訊預約，告訴我們想要的服務、時間，師傅確認後會回覆您。也可以直接撥打電話 0979-050-630 預約。營業時間為週一至週日 10:00–22:00。",
  },
  {
    question: "在哪裡？停車方便嗎？",
    answer:
      "我們位於屏東市莊敬街一段104號，交通便利。附近有停車空間可供利用，若有停車相關問題歡迎來電詢問。",
  },
  {
    question: "可以臨時預約嗎？",
    answer:
      "視當天師傅的時段安排，有時可以接受當日預約。建議在來之前先透過 LINE 或電話確認是否有空檔，以免白跑一趟。",
  },
  {
    question: "自製點心是什麼？",
    answer:
      "我們每日準備不同的自製點心與湯品，隨季節與食材有所變化。通常包括暖胃湯品與手作小點，讓您在課程結束後身心都得到溫暖的照顧。這是我們對每一位客人最真誠的心意。",
  },
];

export default function FaqPage() {
  return (
    <>
      <FaqPageJsonLd faqs={faqs} />
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="bg-[#f5ede3] py-20 lg:py-24">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <p className="text-gold text-sm tracking-[0.3em] mb-3 font-medium">
              FAQ
            </p>
            <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-ink mb-6">
              常見問題
            </h1>
            <p className="text-ink-muted text-lg leading-relaxed">
              有任何疑問都可以在這裡找到答案。如果還有其他問題，
              歡迎透過 LINE 或電話直接詢問我們。
            </p>
          </div>
        </section>

        {/* FAQ list */}
        <section className="py-20 lg:py-28 bg-cream">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {faqs.map((faq, i) => (
                <details
                  key={i}
                  className="group bg-white rounded-2xl border border-cream-border overflow-hidden shadow-sm"
                >
                  <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none hover:bg-cream-dark/30 transition-colors">
                    <h2 className="font-heading text-lg font-medium text-ink">
                      {faq.question}
                    </h2>
                    <ChevronRight
                      size={20}
                      className="text-terracotta shrink-0 transition-transform duration-200 group-open:rotate-90"
                    />
                  </summary>
                  <div className="px-6 pb-6 pt-2 border-t border-cream-border">
                    <p className="text-ink-muted leading-relaxed">{faq.answer}</p>
                  </div>
                </details>
              ))}
            </div>

            <div className="mt-14 max-w-2xl mx-auto bg-gradient-to-br from-terracotta/10 via-cream-dark to-olive/10 rounded-3xl p-8 shadow-sm text-center">
              <p className="font-heading text-xl font-semibold text-ink mb-3">
                還有其他問題嗎？
              </p>
              <p className="text-ink-muted mb-6">
                歡迎透過 LINE 或電話直接詢問，我們很樂意為您解答。
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="https://line.me/R/ti/p/@warmjar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-terracotta text-cream font-medium px-6 py-3 rounded-full hover:bg-terracotta-dark transition-colors shadow-sm"
                >
                  LINE @warmjar 詢問
                </a>
                <a
                  href="tel:0979050630"
                  className="border-2 border-ink/20 text-ink font-medium px-6 py-3 rounded-full hover:border-terracotta hover:text-terracotta transition-colors"
                >
                  來電 0979-050-630
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
