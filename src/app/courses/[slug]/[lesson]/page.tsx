import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, FileDown, Lock, PlayCircle } from "lucide-react";
import { getLessonVideo } from "@/lib/sanity";
import { createClient } from "@/lib/supabase/server";
import { VideoPlayer } from "@/components/courses/VideoPlayer";
import { VideoProtection } from "@/components/courses/VideoProtection";

type Props = {
  params: Promise<{ slug: string; lesson: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lesson: lessonSlug } = await params;
  const data = await getLessonVideo(slug, lessonSlug);
  if (!data?.lesson) return { title: "課程單元" };
  return {
    title: `${data.lesson.title} — ${data.title}`,
    robots: { index: false },
  };
}

export default async function LessonPage({ params }: Props) {
  const { slug, lesson: lessonSlug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/courses/${slug}/${lessonSlug}`);

  const data = await getLessonVideo(slug, lessonSlug);
  if (!data || !data.lesson) notFound();

  const { lesson, allLessons } = data;

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  const isEnrolled = !!enrollment;
  const isPreview = lesson.is_preview;

  if (!isEnrolled && !isPreview) redirect(`/courses/${slug}?access=denied`);

  const videoId: string = lesson.video_id;
  const videoProvider: "youtube" | "vimeo" = lesson.video_provider ?? "youtube";

  const currentIdx = allLessons.findIndex(
    (l: { slug: string }) => l.slug === lessonSlug
  );
  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const nextLesson =
    currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

  return (
    <div className="min-h-screen bg-[#1C1714] flex flex-col">
      <VideoProtection />

      {/* ── 頂部導覽 ── */}
      <header className="bg-[#1C1714] border-b border-white/10 px-4 sm:px-6 h-14 flex items-center justify-between shrink-0 z-40">
        <Link
          href={`/courses/${slug}`}
          className="flex items-center gap-2 text-cream/60 hover:text-cream text-sm transition"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">{data.title}</span>
          <span className="sm:hidden">返回</span>
        </Link>

        <div className="flex items-center gap-1">
          <span className="text-cream/30 text-xs hidden sm:inline">
            {currentIdx + 1} / {allLessons.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {prevLesson && (
            <Link
              href={`/courses/${slug}/${prevLesson.slug}`}
              className="text-cream/50 hover:text-cream transition p-1.5 rounded-lg hover:bg-white/10"
              title="上一單元"
            >
              <ChevronLeft size={18} />
            </Link>
          )}
          {nextLesson && (
            <Link
              href={`/courses/${slug}/${nextLesson.slug}`}
              className="flex items-center gap-1.5 bg-terracotta text-cream text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-terracotta-dark transition"
            >
              下一單元
              <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </header>

      {/* ── 主要內容：左影片 + 右目錄 ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* 左側：影片 + 資訊 */}
        <div className="flex-1 overflow-y-auto">
          {/* 影片區 */}
          <div className="bg-black">
            <div className="max-w-5xl mx-auto">
              <VideoPlayer
                videoId={videoId}
                videoProvider={videoProvider}
                title={lesson.title}
              />
            </div>
          </div>

          {/* 影片下方資訊 */}
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
            {/* 標籤 */}
            <div className="flex items-center gap-2 mb-3">
              {isPreview && !isEnrolled && (
                <span className="text-xs text-olive bg-olive/20 px-2.5 py-1 rounded-full">
                  免費預覽
                </span>
              )}
              {lesson.duration && (
                <span className="text-xs text-cream/30 flex items-center gap-1">
                  ⏱ {lesson.duration}
                </span>
              )}
              <span className="text-xs text-cream/20">
                第 {currentIdx + 1} 單元
              </span>
            </div>

            {/* 標題 */}
            <h1 className="font-serif text-xl sm:text-2xl text-cream mb-3">
              {lesson.title}
            </h1>

            {lesson.description && (
              <p className="text-cream/50 text-sm leading-relaxed mb-6">
                {lesson.description}
              </p>
            )}

            {/* PDF 下載 */}
            {isEnrolled && lesson.pdf_url && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-terracotta/20 rounded-lg flex items-center justify-center shrink-0">
                    <FileDown size={16} className="text-terracotta" />
                  </div>
                  <div>
                    <p className="text-cream text-sm font-medium">課程講義</p>
                    <p className="text-cream/40 text-xs">PDF 檔案</p>
                  </div>
                </div>
                <a
                  href={lesson.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="text-terracotta text-sm font-medium hover:underline shrink-0"
                >
                  下載講義
                </a>
              </div>
            )}

            {/* 上一／下一 */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              {prevLesson ? (
                <Link
                  href={`/courses/${slug}/${prevLesson.slug}`}
                  className="flex items-center gap-2 text-sm text-cream/50 hover:text-cream transition"
                >
                  <ChevronLeft size={14} />
                  <span className="hidden sm:inline">上一單元：</span>
                  <span className="truncate max-w-[120px] sm:max-w-none">{prevLesson.title}</span>
                </Link>
              ) : <div />}
              {nextLesson ? (
                <Link
                  href={`/courses/${slug}/${nextLesson.slug}`}
                  className="flex items-center gap-2 text-sm text-cream/50 hover:text-cream transition"
                >
                  <span className="truncate max-w-[120px] sm:max-w-none">{nextLesson.title}</span>
                  <span className="hidden sm:inline">：下一單元</span>
                  <ChevronRight size={14} />
                </Link>
              ) : (
                <Link
                  href={`/courses/${slug}`}
                  className="text-sm text-cream/50 hover:text-cream transition"
                >
                  返回課程目錄
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* 右側：課程目錄面板 */}
        <aside className="hidden lg:flex flex-col w-80 xl:w-96 border-l border-white/10 bg-[#161210] overflow-hidden shrink-0">
          <div className="px-4 py-4 border-b border-white/10 shrink-0">
            <h2 className="text-cream/80 text-sm font-medium">
              課程目錄
            </h2>
            <p className="text-cream/30 text-xs mt-0.5">
              共 {allLessons.length} 個單元
            </p>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {allLessons.map(
              (
                l: { slug: string; title: string; is_preview: boolean },
                idx: number
              ) => {
                const isCurrent = l.slug === lessonSlug;
                const canAccess = isEnrolled || l.is_preview;

                return (
                  <div key={l.slug}>
                    {canAccess ? (
                      <Link
                        href={`/courses/${slug}/${l.slug}`}
                        className={`flex items-center gap-3 px-4 py-3 text-sm transition group ${
                          isCurrent
                            ? "bg-terracotta/15 border-l-2 border-terracotta"
                            : "hover:bg-white/5 border-l-2 border-transparent"
                        }`}
                      >
                        <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                          isCurrent ? "bg-terracotta" : "bg-white/10 group-hover:bg-white/20"
                        }`}>
                          {isCurrent ? (
                            <PlayCircle size={14} className="text-cream" />
                          ) : (
                            <span className="text-xs font-mono text-cream/50">
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`truncate ${isCurrent ? "text-cream font-medium" : "text-cream/60"}`}>
                            {l.title}
                          </p>
                          {l.is_preview && !isEnrolled && (
                            <span className="text-xs text-olive/70">免費預覽</span>
                          )}
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 text-sm border-l-2 border-transparent">
                        <div className="shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
                          <Lock size={11} className="text-cream/20" />
                        </div>
                        <p className="text-cream/20 truncate flex-1">{l.title}</p>
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>

          {/* 底部：返回課程 */}
          <div className="px-4 py-3 border-t border-white/10 shrink-0">
            <Link
              href={`/courses/${slug}`}
              className="text-xs text-cream/30 hover:text-cream/60 transition"
            >
              ← 返回課程總覽
            </Link>
          </div>
        </aside>
      </div>

      {/* 手機版底部目錄按鈕（收合式） */}
      <div className="lg:hidden border-t border-white/10 bg-[#161210] px-4 py-3">
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer text-sm text-cream/60 list-none">
            <span>課程目錄（{currentIdx + 1} / {allLessons.length}）</span>
            <ChevronRight size={16} className="group-open:rotate-90 transition-transform" />
          </summary>
          <div className="mt-3 space-y-1 max-h-60 overflow-y-auto">
            {allLessons.map(
              (l: { slug: string; title: string; is_preview: boolean }, idx: number) => {
                const isCurrent = l.slug === lessonSlug;
                const canAccess = isEnrolled || l.is_preview;
                return canAccess ? (
                  <Link
                    key={l.slug}
                    href={`/courses/${slug}/${l.slug}`}
                    className={`flex items-center gap-2 py-2 px-3 rounded-lg text-sm ${
                      isCurrent ? "bg-terracotta/20 text-cream" : "text-cream/50"
                    }`}
                  >
                    <span className="text-xs font-mono w-5 shrink-0 text-center opacity-50">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    {l.title}
                  </Link>
                ) : (
                  <div key={l.slug} className="flex items-center gap-2 py-2 px-3 text-sm text-cream/20">
                    <Lock size={11} className="shrink-0" />
                    {l.title}
                  </div>
                );
              }
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
