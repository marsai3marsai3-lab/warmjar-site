import { Metadata } from "next";
import Link from "next/link";
import { getCourses, urlFor } from "@/lib/sanity";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Flame } from "lucide-react";
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
  title: "線上課程專區",
  description:
    "溫罐子線上課程，不限次數隨時觀看，費用超值。購買線上課程可折抵線下小班制實體課。油壓、指壓、溫罐、小臉、筋膜刀、拔罐、徒手按摩、伸展八大專業技術。",
};

type CourseCat = {
  name: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  desc: string;
};

const COURSE_CATEGORIES: CourseCat[] = [
  { name: "油壓",    Icon: OilMassagePngIcon,    desc: "全身放鬆油壓技法，深層舒緩肌肉緊繃" },
  { name: "指壓",    Icon: AcupressurePngIcon,   desc: "傳統穴位指壓，疏通經絡改善循環" },
  { name: "溫罐",    Icon: Flame,                desc: "溫罐舒壓核心技術，品牌招牌手法" },
  { name: "小臉",    Icon: FacialMassagePngIcon, desc: "臉部淋巴引流，輪廓緊緻提升技法" },
  { name: "筋膜刀",  Icon: FasciaPngIcon,        desc: "筋膜鬆解工具操作，改善沾黏緊繃" },
  { name: "拔罐",    Icon: CuppingPngIcon,       desc: "傳統拔罐技術，活血化瘀排除廢物" },
  { name: "徒手按摩", Icon: SportsMassagePngIcon, desc: "徒手深層按摩手法，全方位身體護理" },
  { name: "伸展",    Icon: StretchPngIcon,       desc: "輔助伸展放鬆技術，增加身體柔軟度" },
];

export default async function OnlineCoursesPage() {
  const [courses, supabase] = await Promise.all([
    getCourses(),
    createClient(),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <Header />
      <main className="pt-24">

        {/* ── Hero ── */}
        <section className="relative bg-gradient-to-br from-cream via-cream to-cream-dark overflow-hidden">
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #C17B5C 0%, transparent 60%)" }} />
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block text-xs tracking-[0.2em] text-terracotta uppercase font-medium mb-4">
                Online Learning
              </span>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-ink leading-tight mb-6">
                線上課程<br />
                <span className="text-terracotta">專業技術</span>
                隨時學
              </h1>
              <p className="text-ink/60 text-lg leading-relaxed mb-8 max-w-lg">
                8 門專業按摩技術課程，一次購買
                <strong className="text-ink">無限次數觀看</strong>，
                費用極為超值。購買後還可折抵線下小班實體課學費。
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/courses"
                  className="bg-terracotta text-cream px-8 py-3.5 rounded-full font-medium text-base hover:bg-terracotta-dark transition shadow-sm"
                >
                  瀏覽所有課程
                </Link>
                {user ? (
                  <Link
                    href="/dashboard"
                    className="border border-ink/20 text-ink px-8 py-3.5 rounded-full font-medium text-base hover:bg-cream-dark transition"
                  >
                    進入我的課程
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="border border-ink/20 text-ink px-8 py-3.5 rounded-full font-medium text-base hover:bg-cream-dark transition"
                  >
                    學員登入
                  </Link>
                )}
              </div>
            </div>

            {/* 統計數字 */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { num: "8", unit: "門", label: "專業技術課程" },
                { num: "∞", unit: "", label: "不限次數觀看" },
                { num: "1:2", unit: "", label: "線下小班師生比" },
                { num: "100%", unit: "", label: "折抵線下學費" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white/60 backdrop-blur rounded-2xl p-6 border border-cream-border"
                >
                  <div className="font-serif text-4xl text-terracotta mb-1">
                    {s.num}
                    <span className="text-xl">{s.unit}</span>
                  </div>
                  <div className="text-ink/60 text-sm">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 線上 vs 線下 ── */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl text-ink mb-3">
              線上 × 線下，相輔相成
            </h2>
            <p className="text-ink/50">選擇最適合你的學習方式，或兩者搭配效果加倍</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* 線上課程 */}
            <div className="bg-white rounded-3xl border border-stone-100 p-8 shadow-sm">
              <div className="w-12 h-12 bg-terracotta/10 rounded-2xl flex items-center justify-center mb-5">
                <span className="text-2xl">💻</span>
              </div>
              <h3 className="font-serif text-xl text-ink mb-4">線上課程</h3>
              <ul className="space-y-3 text-sm text-ink/70">
                {[
                  "購買後無限次數觀看，永久有效",
                  "費用超值，學一技之長不費力",
                  "隨時隨地學習，不受時間地點限制",
                  "可重複暫停、倒退反覆練習",
                  "附贈 PDF 講義可下載保存",
                  "購買金額可 100% 折抵線下課費用",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <span className="text-olive mt-0.5 shrink-0">✓</span>
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6 border-t border-stone-100">
                <Link
                  href="/courses"
                  className="text-terracotta text-sm font-medium hover:underline"
                >
                  查看課程與定價 →
                </Link>
              </div>
            </div>

            {/* 線下課程 */}
            <div className="bg-ink rounded-3xl p-8">
              <div className="w-12 h-12 bg-terracotta/20 rounded-2xl flex items-center justify-center mb-5">
                <span className="text-2xl">🏫</span>
              </div>
              <h3 className="font-serif text-xl text-cream mb-4">線下實體課</h3>
              <ul className="space-y-3 text-sm text-cream/70">
                {[
                  "小班制 1 對 1 或 1 對 2 教學",
                  "講師親自示範，手把手指導",
                  "即時糾正手法，確保學習成效",
                  "實際接觸人體，累積實戰經驗",
                  "學員互動交流，快速建立技能",
                  "已購線上課程者，學費全額折抵",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <span className="text-gold mt-0.5 shrink-0">✓</span>
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6 border-t border-white/10">
                <Link
                  href="/courses"
                  className="text-gold text-sm font-medium hover:underline"
                >
                  了解線下課程 →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 課程分類 ── */}
        <section className="bg-cream-dark py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="font-serif text-3xl sm:text-4xl text-ink mb-3">
                8 大專業技術課程
              </h2>
              <p className="text-ink/50">從基礎到進階，每門課程由資深講師親自錄製</p>
            </div>

            {/* 若 Sanity 有課程資料就顯示真實卡片，否則顯示預告卡片 */}
            {courses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {courses.map((course: any) => {
                  const slug = course.slug?.current ?? course.slug;
                  return (
                    <Link
                      key={course._id}
                      href={`/courses/${slug}`}
                      className="bg-white rounded-2xl overflow-hidden border border-stone-100 hover:shadow-md transition group"
                    >
                      <div className="relative aspect-video bg-stone-100">
                        {course.thumbnail ? (
                          <Image
                            src={urlFor(course.thumbnail).width(320).height(180).url()}
                            alt={course.title}
                            fill
                            className="object-cover group-hover:scale-105 transition duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-3xl">
                            🎬
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-ink text-sm mb-1">{course.title}</h3>
                        {course.tagline && (
                          <p className="text-ink/50 text-xs line-clamp-2">{course.tagline}</p>
                        )}
                        <p className="text-terracotta font-semibold text-sm mt-3">
                          NT${course.price?.toLocaleString()}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {COURSE_CATEGORIES.map((cat) => (
                  <div
                    key={cat.name}
                    className="bg-white rounded-2xl p-6 border border-stone-100 text-center hover:shadow-md hover:-translate-y-0.5 transition group"
                  >
                    <div className="flex justify-center mb-4 text-gold group-hover:text-terracotta transition-colors duration-300">
                      <cat.Icon className="w-16 h-16" strokeWidth={1.0} />
                    </div>
                    <h3 className="font-serif text-lg text-ink mb-2">{cat.name}</h3>
                    <p className="text-ink/50 text-xs leading-relaxed">{cat.desc}</p>
                    <div className="mt-4">
                      <span className="text-xs text-terracotta/60 bg-terracotta/5 px-3 py-1 rounded-full">
                        即將上線
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-center mt-10">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 bg-terracotta text-cream px-8 py-3.5 rounded-full font-medium hover:bg-terracotta-dark transition shadow-sm"
              >
                查看所有課程與定價
              </Link>
            </div>
          </div>
        </section>

        {/* ── 學習流程 ── */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-20">
          <h2 className="font-serif text-3xl text-ink text-center mb-12">
            如何開始學習
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {[
              { step: "01", title: "選擇課程", desc: "瀏覽 8 門課程，選擇你想學的技術" },
              { step: "02", title: "聯繫購買", desc: "透過 LINE 聯絡我們完成付款" },
              { step: "03", title: "建立帳號", desc: "開通帳號後立即無限次觀看" },
              { step: "04", title: "進修升級", desc: "線上學熟後，費用折抵報名線下小班" },
            ].map((s, i) => (
              <div key={s.step} className="relative text-center">
                {i < 3 && (
                  <div className="hidden sm:block absolute top-8 left-[60%] w-[80%] h-px bg-cream-border" />
                )}
                <div className="w-16 h-16 rounded-full bg-terracotta/10 border-2 border-terracotta/20 flex items-center justify-center mx-auto mb-4">
                  <span className="font-serif text-terracotta text-xl font-bold">{s.step}</span>
                </div>
                <h3 className="font-medium text-ink mb-2">{s.title}</h3>
                <p className="text-ink/50 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-ink py-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="font-serif text-3xl sm:text-4xl text-cream mb-4">
              準備好開始了嗎？
            </h2>
            <p className="text-cream/60 mb-8 leading-relaxed">
              購買線上課程，隨時學習專業技術。<br />
              學成後費用 100% 折抵線下小班課，讓你的學習投資價值最大化。
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/courses"
                className="bg-terracotta text-cream px-8 py-3.5 rounded-full font-medium hover:bg-terracotta-dark transition"
              >
                立即選購課程
              </Link>
              <a
                href="https://line.me/R/ti/p/@warmjar"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-cream/30 text-cream px-8 py-3.5 rounded-full font-medium hover:bg-white/10 transition"
              >
                LINE 洽詢
              </a>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
