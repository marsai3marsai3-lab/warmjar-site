import { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ChevronRight, Flame } from "lucide-react";
import {
  OilMassagePngIcon,
  AcupressurePngIcon,
  FacialMassagePngIcon,
  FasciaPngIcon,
  CuppingPngIcon,
  SportsMassagePngIcon,
  StretchPngIcon,
} from "@/components/ServiceIcons";
import type React from "react";

export const metadata: Metadata = {
  title: "技術課程 | 溫罐子按摩技術培訓",
  description:
    "溫罐子線下技術培訓課程，小班制 1 對 1 或 1 對 2，講師手把手親授。油壓、指壓、溫罐、小臉、筋膜刀、拔罐、徒手按摩、伸展八大專業技術。",
};

type CourseEntry = {
  name: string;
  eng: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  desc: string;
  tags: string[];
  featured?: boolean;
};

const offlineCourses: CourseEntry[] = [
  {
    name: "油壓",
    eng: "Oil Massage",
    Icon: OilMassagePngIcon,
    desc: "系統學習全身油壓手法，掌握力道控制與精油應用技巧，讓客人深度放鬆的核心技術。",
    tags: ["精油應用", "全身手法", "力道控制"],
  },
  {
    name: "指壓",
    eng: "Acupressure",
    Icon: AcupressurePngIcon,
    desc: "傳承傳統穴位指壓手感，學習常用穴道定位與按壓技法，幫助放鬆緊繃、提升日常舒適感。",
    tags: ["穴位定位", "經絡舒通", "傳統手法"],
  },
  {
    name: "溫罐",
    eng: "Warm Cup",
    Icon: Flame,
    desc: "品牌特色溫罐體驗，結合溫熱感受與罐體滑動，深度舒緩肌肉、帶來溫暖舒適感的獨家手法。",
    tags: ["溫熱感受", "品牌特色", "深層舒緩"],
    featured: true,
  },
  {
    name: "小臉",
    eng: "Face Sculpt",
    Icon: FacialMassagePngIcon,
    desc: "臉部輕柔引導與輪廓線條整理手法，幫助放鬆臉部緊繃、呈現清爽明亮感受。深受顧客喜愛的人氣項目。",
    tags: ["臉部引導", "輪廓線條", "臉部護理"],
  },
  {
    name: "筋膜刀",
    eng: "Fascia Tool",
    Icon: FasciaPngIcon,
    desc: "工具輔助筋膜放鬆技術，學習正確施力角度與路徑，幫助舒緩緊繃不適、提升活動舒適度。",
    tags: ["工具操作", "筋膜放鬆", "緊繃舒緩"],
  },
  {
    name: "拔罐",
    eng: "Cupping",
    Icon: CuppingPngIcon,
    desc: "傳統拔罐技術完整訓練，包含走罐、留罐等手法，幫助放鬆身心、感受溫熱循環感。",
    tags: ["走罐留罐", "傳統技法", "放鬆體驗"],
  },
  {
    name: "徒手按摩",
    eng: "Manual Massage",
    Icon: SportsMassagePngIcon,
    desc: "不依賴工具的純手法深層按摩技術，訓練手感敏銳度與施力技巧，全方位身體護理。",
    tags: ["純手法", "深層按摩", "手感訓練"],
  },
  {
    name: "伸展",
    eng: "Stretching",
    Icon: StretchPngIcon,
    desc: "輔助伸展放鬆技術，結合被動與主動伸展手法，增加客人身體柔軟度與舒適度。",
    tags: ["被動伸展", "主動輔助", "柔軟度提升"],
  },
];

const classFeatures = [
  { icon: "👥", title: "超小班制", desc: "1 對 1 或 1 對 2，確保每位學員都獲得充足指導" },
  { icon: "🙌", title: "手把手教學", desc: "講師全程親自示範，手法即時糾正，不走彎路" },
  { icon: "📋", title: "系統化課程", desc: "從理論到實操，有完整的學習脈絡與進度安排" },
  { icon: "💳", title: "線上課程折抵", desc: "已購買對應線上課程者，學費可全額折抵" },
  { icon: "📜", title: "民俗調理", desc: "本技術為民俗調理，非醫療行為" },
];

export default function CoursesPage() {
  return (
    <>
      <Header />
      <main className="pt-20">

        {/* Hero */}
        <section className="bg-[#f5ede3] py-20 lg:py-24">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <p className="text-gold text-sm tracking-[0.3em] mb-3 font-medium uppercase">
              Professional Training
            </p>
            <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-ink mb-5">
              技術課程
            </h1>
            <p className="text-ink-muted text-lg leading-relaxed mb-8">
              專為想學習按摩技術的學員設計，超小班制教學讓你真正學到技術，不只是走過場。
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href="https://line.me/R/ti/p/@warmjar"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-terracotta text-cream font-medium px-7 py-3.5 rounded-full hover:bg-terracotta-dark transition shadow-sm"
              >
                LINE 洽詢報名
              </a>
              <Link
                href="/online-courses"
                className="border border-ink/20 text-ink font-medium px-7 py-3.5 rounded-full hover:bg-cream-dark transition flex items-center gap-2"
              >
                了解線上課程 <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* 小班制特色 */}
        <section className="py-14 bg-cream border-b border-cream-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {classFeatures.map((f) => (
                <div key={f.title} className="text-center p-4">
                  <div className="text-3xl mb-3">{f.icon}</div>
                  <h3 className="font-medium text-ink text-sm mb-1.5">{f.title}</h3>
                  <p className="text-ink/50 text-xs leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 課程列表 */}
        <section className="py-20 bg-cream">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-ink mb-3">
                8 大技術項目
              </h2>
              <p className="text-ink-muted">每門課程皆可單獨學習，也可依需求組合搭配</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {offlineCourses.map((course) => (
                <div
                  key={course.name}
                  className={`relative bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition group ${
                    course.featured
                      ? "border-terracotta/30 ring-1 ring-terracotta/20"
                      : "border-cream-border"
                  }`}
                >
                  {course.featured && (
                    <span className="absolute -top-2.5 left-5 bg-terracotta text-cream text-xs font-medium px-3 py-0.5 rounded-full">
                      品牌招牌
                    </span>
                  )}
                  {/* 圖示 — 與首頁相同樣式 */}
                  <div className="text-gold group-hover:text-terracotta transition-colors duration-300 mb-4">
                    <course.Icon className="w-20 h-20" strokeWidth={1.0} />
                  </div>
                  <div className="mb-3">
                    <h3 className="font-heading text-xl font-semibold text-ink">
                      {course.name}
                    </h3>
                    <p className="text-ink/30 text-xs tracking-widest">{course.eng}</p>
                  </div>
                  <p className="text-ink/60 text-sm leading-relaxed mb-4">
                    {course.desc}
                  </p>
                  <div className="flex flex-nowrap gap-1">
                    {course.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] text-olive bg-olive/10 px-1.5 py-0.5 rounded-full whitespace-nowrap"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 線上 → 線下折抵說明 */}
        <section className="bg-ink py-14">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <div className="text-3xl mb-4">💡</div>
            <h2 className="font-heading text-2xl text-cream mb-3">
              先上線上課程再來線下，學費可折抵
            </h2>
            <p className="text-cream/60 leading-relaxed mb-6">
              建議先購買線上課程打好基礎，來線下小班實體課時學習效率更高。
              線上課程購買金額可 100% 折抵對應的線下課學費。
            </p>
            <Link
              href="/online-courses"
              className="inline-flex items-center gap-2 bg-terracotta text-cream px-7 py-3.5 rounded-full font-medium hover:bg-terracotta-dark transition"
            >
              了解線上課程 <ChevronRight size={16} />
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-[#f5ede3]">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-ink mb-4">
              想了解課程詳情或報名？
            </h2>
            <p className="text-ink-muted mb-8">
              課程費用、時間安排、師生比等細節，歡迎透過 LINE 詢問。
            </p>
            <a
              href="https://line.me/R/ti/p/@warmjar"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-terracotta text-cream font-medium px-8 py-3.5 rounded-full hover:bg-terracotta-dark transition shadow-sm"
            >
              LINE @warmjar 洽詢
            </a>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
