import type { Metadata } from "next";
import type React from "react";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ChevronRight, Clock, Banknote, Flame } from "lucide-react";
import {
  OilMassagePngIcon,
  AcupressurePngIcon,
  BreastMassagePngIcon,
  FacialMassagePngIcon,
  FasciaPngIcon,
  SportsMassagePngIcon,
  CuppingPngIcon,
  StretchPngIcon,
} from "@/components/ServiceIcons";

export const metadata: Metadata = {
  title: "服務介紹 | 屏東舒壓按摩・溫罐舒壓・筋膜刀・油壓",
  description:
    "溫罐子提供屏東在地多元舒壓服務：溫罐舒壓按摩、筋膜刀、全身油壓、美胸按摩、指壓、運動按摩、小臉按摩。每項服務皆由專業師傅量身調整，安心舒適有保障。",
  alternates: { canonical: "/services" },
};

const services: {
  id: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  image?: string;
  name: string;
  tagline: string;
  desc: string;
  features: string[];
  duration: string;
  suitable: string;
  note: string;
}[] = [
  {
    id: "oil-massage",
    Icon: OilMassagePngIcon,
    name: "全身油壓",
    tagline: "天然精油 × 專業手技",
    desc: "使用天然植物精油，以專業油壓手技全面舒緩全身肌肉。在香氛的環境中，讓身體每一寸肌肉都得到充分的放鬆與滋養，是最完整的全身舒壓體驗。",
    features: ["天然植物精油", "全身放鬆", "深層舒緩", "香氛療癒"],
    duration: "60 / 90 / 120 分鐘",
    suitable: "全身疲勞、壓力大、需要完整放鬆者",
    note: "本服務為民俗調理，非醫療行為",
  },
  {
    id: "acupressure",
    Icon: AcupressurePngIcon,
    name: "指壓放鬆",
    tagline: "傳統手法 · 精準舒壓",
    desc: "以傳統指壓手法，針對人體各穴位與肌肉群施加適當壓力，舒緩全身疲勞與緊繃感。適合喜歡傳統手法、不習慣使用精油的客人。",
    features: ["傳統指壓技法", "全身穴位舒緩", "力道可調", "不使用精油"],
    duration: "60 / 90 分鐘",
    suitable: "各年齡層、偏好傳統手法者",
    note: "本服務為民俗調理，非醫療行為",
  },
  {
    id: "breast",
    Icon: BreastMassagePngIcon,
    name: "美胸按摩",
    tagline: "專業女性保養課程",
    desc: "針對胸部進行專業舒壓按摩，促進胸部循環，放鬆周圍肌群。課程由女性師傅進行，全程保持隱私保護，讓您在安心舒適的環境中享受專屬保養體驗。",
    features: ["女性師傅服務", "隱私保護", "胸部循環舒壓", "放鬆周圍肌群"],
    duration: "60 分鐘",
    suitable: "女性客人、胸部緊繃不適者",
    note: "本服務為民俗調理，非醫療行為",
  },
  {
    id: "face",
    Icon: FacialMassagePngIcon,
    name: "小臉按摩",
    tagline: "輕盈臉部・煥然一新",
    desc: "針對臉部淋巴與肌肉群進行專業舒壓按摩，放鬆長時間緊繃的表情肌與下顎肌群，讓臉部感受輕盈舒適。是辦公族與長時間用眼者的最佳保養選擇。",
    features: ["臉部淋巴舒壓", "表情肌放鬆", "下顎緊繃舒緩", "輕盈舒適感"],
    duration: "30 / 60 分鐘",
    suitable: "辦公族、長時間用眼者、臉部緊繃者",
    note: "本服務為民俗調理，非醫療行為",
  },
  {
    id: "warm-jar",
    Icon: Flame,
    image: "/溫罐.jpg",
    name: "溫罐舒壓按摩",
    tagline: "屏東獨特溫熱舒壓體驗",
    desc: "以特製溫熱罐具輕柔地在背部、肩頸等部位滑動，利用溫熱感放鬆深層肌肉緊繃。適合長時間久坐、肩頸僵硬或需要深度放鬆的客人。",
    features: ["溫熱肌肉放鬆", "全背舒緩", "深層緊繃紓解", "搭配精油滋潤"],
    duration: "60 / 90 分鐘",
    suitable: "久坐族、肩頸緊繃、需要深度放鬆者",
    note: "本服務為民俗調理，非醫療行為",
  },
  {
    id: "fascia",
    Icon: FasciaPngIcon,
    image: "/筋膜刀.jpg",
    name: "筋膜刀舒緩",
    tagline: "現代工具 × 傳統手法",
    desc: "運用專業筋膜刀工具，針對筋膜緊繃、肌肉黏連的部位進行舒緩，有效改善肌肉僵硬感。師傅會先確認您的敏感度，以舒適不過度的力道進行調理。",
    features: ["筋膜緊繃舒緩", "肌肉黏連改善", "力道可調整", "可搭配按摩進行"],
    duration: "30 / 60 分鐘",
    suitable: "運動後恢復、筋膜緊繃、久站久坐族",
    note: "本服務為民俗調理，非醫療行為",
  },
  {
    id: "sports",
    Icon: SportsMassagePngIcon,
    name: "運動按摩",
    tagline: "運動後最佳恢復選擇",
    desc: "針對運動後的肌肉疲勞與緊繃設計的專業舒壓課程，結合伸展與按摩技法，幫助肌肉在運動後快速恢復至放鬆狀態，讓下一次的運動更有活力。",
    features: ["運動後肌肉舒緩", "結合伸展手法", "減輕酸痛感", "促進恢復"],
    duration: "60 / 90 分鐘",
    suitable: "運動愛好者、運動後肌肉疲勞者",
    note: "本服務為民俗調理，非醫療行為",
  },
  {
    id: "cupping",
    Icon: CuppingPngIcon,
    image: "/拔罐.jpg",
    name: "拔罐舒壓",
    tagline: "傳統拔罐・深層舒壓",
    desc: "運用傳統拔罐技法，透過負壓原理吸附於背部肌肉，促進局部血液循環，舒緩深層肌肉緊繃與疲勞感，是傳統民俗調理的經典項目。",
    features: ["負壓深層舒壓", "促進血液循環", "傳統民俗手法", "背部肌肉放鬆"],
    duration: "30 / 60 分鐘",
    suitable: "背部緊繃、肌肉疲勞、偏好傳統調理者",
    note: "本服務為民俗調理，非醫療行為",
  },
  {
    id: "stretch",
    Icon: StretchPngIcon,
    name: "伸展舒緩",
    tagline: "全身柔軟・動作靈活",
    desc: "由師傅協助進行全身各部位的伸展動作，針對長期緊繃的肌群與關節進行舒緩，改善身體活動度，特別適合久坐或運動後需要放鬆的族群。",
    features: ["全身伸展調理", "關節活動改善", "師傅協助伸展", "可搭配按摩"],
    duration: "30 / 60 分鐘",
    suitable: "久坐族、運動後、身體活動度不足者",
    note: "本服務為民俗調理，非醫療行為",
  },
];

export default function ServicesPage() {
  return (
    <>
      <Header />
      <main className="pt-20">
        {/* Hero */}
        <section className="bg-[#f5ede3] py-20 lg:py-28">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <p className="text-gold text-sm tracking-[0.3em] mb-3 font-medium">
              SERVICES
            </p>
            <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-ink mb-6">
              服務介紹
            </h1>
            <p className="text-ink-muted text-lg leading-relaxed">
              屏東在地的專業舒壓服務，每一個課程都由師傅量身調整力道與方式，
              讓您的每次體驗都是最適合自己的放鬆。
            </p>
          </div>
        </section>

        {/* Services list */}
        <section className="py-20 lg:py-28 bg-cream">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            {services.map((s, i) => (
              <div
                key={s.id}
                id={s.id}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
                  i % 2 === 1 ? "lg:grid-flow-dense" : ""
                }`}
              >
                <div className={i % 2 === 1 ? "lg:col-start-2" : ""}>
                  <div className="inline-flex items-center gap-2 bg-terracotta/10 text-terracotta text-sm font-medium px-3 py-1.5 rounded-full mb-5">
                    {s.tagline}
                  </div>
                  <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-ink mb-4">
                    {s.name}
                  </h2>
                  <p className="text-ink-muted text-lg leading-relaxed mb-6">
                    {s.desc}
                  </p>
                  <ul className="grid grid-cols-2 gap-2 mb-6">
                    {s.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-center gap-2 text-sm text-ink-muted"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-olive shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-4 text-sm mb-6">
                    <span className="flex items-center gap-1.5 text-ink-muted">
                      <Clock size={15} className="text-gold" />
                      {s.duration}
                    </span>
                    <span className="flex items-center gap-1.5 text-ink-muted">
                      <Banknote size={15} className="text-gold" />
                      詳見
                      <Link href="/pricing" className="text-terracotta underline underline-offset-2">
                        價格頁
                      </Link>
                    </span>
                  </div>
                  <p className="text-xs text-ink-light border-l-2 border-cream-border pl-3 mb-6">
                    適合族群：{s.suitable}
                  </p>
                  <a
                    href="https://line.me/R/ti/p/@warmjar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-terracotta text-cream font-medium px-6 py-3 rounded-full hover:bg-terracotta-dark transition-colors shadow-sm"
                  >
                    LINE 預約此服務 <ChevronRight size={18} />
                  </a>
                </div>
                <div className={i % 2 === 1 ? "lg:col-start-1 lg:row-start-1" : ""}>
                  {s.image ? (
                    <div className="aspect-square rounded-3xl overflow-hidden relative shadow-sm border border-cream-border">
                      <Image
                        src={s.image}
                        alt={s.name}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 50vw, 100vw"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square rounded-3xl bg-gradient-to-br from-terracotta/15 via-cream-dark to-olive/10 flex flex-col items-center justify-center gap-6 shadow-sm border border-cream-border">
                      <div className="text-[#B8963E]">
                        <s.Icon className="w-24 h-24" strokeWidth={1.0} />
                      </div>
                      <div className="text-center">
                        <p className="font-heading text-2xl text-ink font-semibold">
                          {s.name}
                        </p>
                        <p className="text-xs text-ink-light mt-2">{s.note}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-[#f5ede3]">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-ink mb-4">
              不確定要選哪個服務？
            </h2>
            <p className="text-ink-muted mb-8">
              歡迎透過 LINE 或電話告訴我們您的需求，師傅會為您推薦最合適的課程。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://line.me/R/ti/p/@warmjar"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-terracotta text-cream font-medium px-7 py-3.5 rounded-full hover:bg-terracotta-dark transition-colors shadow-sm"
              >
                LINE 詢問推薦課程
              </a>
              <Link
                href="/pricing"
                className="border-2 border-ink/20 text-ink font-medium px-7 py-3.5 rounded-full hover:border-terracotta hover:text-terracotta transition-colors flex items-center justify-center gap-2"
              >
                查看價格 <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
