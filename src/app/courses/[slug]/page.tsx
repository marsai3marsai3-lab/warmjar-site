import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { getCourse, urlFor } from "@/lib/sanity";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ access?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) return { title: "課程不存在" };
  return {
    title: course.title,
    description: course.tagline ?? `溫罐子線上課程：${course.title}`,
  };
}

export default async function CourseDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { access } = await searchParams;

  const [course, supabase] = await Promise.all([getCourse(slug), createClient()]);
  if (!course) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isEnrolled = false;
  if (user) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("id, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();
    isEnrolled = !!enrollment;
  }

  const courseSlug = course.slug?.current ?? course.slug;

  return (
    <>
      <Header />
      <main className="pt-24 pb-20">
        {/* Access denied banner */}
        {access === "denied" && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 mb-6">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-5 py-3 text-sm">
              此單元需要購買課程後才能觀看。
            </div>
          </div>
        )}

        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Course header */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 mb-12">
            {/* Left: info */}
            <div className="lg:col-span-3">
              <Link
                href="/courses"
                className="text-sm text-ink/40 hover:text-primary transition mb-4 inline-block"
              >
                ← 返回課程列表
              </Link>
              <h1 className="font-serif text-3xl sm:text-4xl text-ink mb-3">
                {course.title}
              </h1>
              {course.tagline && (
                <p className="text-ink/60 text-lg mb-6">{course.tagline}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-ink/50 mb-8">
                <span>{course.lessons?.length ?? 0} 個單元</span>
                <span className="text-2xl font-semibold text-ink">
                  NT${course.price?.toLocaleString() ?? "—"}
                </span>
              </div>

              {!isEnrolled && (
                <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100">
                  <p className="text-ink/70 text-sm mb-4">
                    購買後可立即無限次觀看所有單元，不限時間。
                  </p>
                  <div className="flex gap-3 flex-wrap">
                    {user ? (
                      <a
                        href="https://line.me/R/ti/p/@warmjar"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-primary text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-primary/90 transition"
                      >
                        聯絡購買課程
                      </a>
                    ) : (
                      <>
                        <a
                          href="https://line.me/R/ti/p/@warmjar"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-primary text-white text-sm font-medium px-6 py-3 rounded-full hover:bg-primary/90 transition"
                        >
                          聯絡購買課程
                        </a>
                        <Link
                          href="/register"
                          className="border border-ink/20 text-ink/70 text-sm font-medium px-6 py-3 rounded-full hover:bg-stone-100 transition"
                        >
                          建立帳號
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right: thumbnail */}
            {course.thumbnail && (
              <div className="lg:col-span-2">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-stone-100">
                  <Image
                    src={urlFor(course.thumbnail).width(600).height(338).url()}
                    alt={course.title}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Lesson list */}
          <section>
            <h2 className="font-serif text-2xl text-ink mb-6">課程單元</h2>
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {course.lessons?.map((lesson: any, idx: number) => {
                const canWatch = isEnrolled || lesson.is_preview;
                return (
                  <div
                    key={lesson.slug ?? idx}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition ${
                      canWatch
                        ? "border-stone-200 bg-white hover:border-primary/30 hover:bg-stone-50"
                        : "border-stone-100 bg-stone-50 opacity-70"
                    }`}
                  >
                    <span className="text-ink/30 text-sm font-mono w-6 shrink-0 text-center">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-ink font-medium text-sm truncate">
                        {lesson.title}
                      </p>
                      {lesson.duration && (
                        <p className="text-ink/40 text-xs mt-0.5">{lesson.duration}</p>
                      )}
                    </div>
                    {lesson.is_preview && (
                      <span className="text-xs text-olive bg-olive/10 px-2 py-0.5 rounded-full shrink-0">
                        免費預覽
                      </span>
                    )}
                    {canWatch ? (
                      <Link
                        href={`/courses/${courseSlug}/${lesson.slug}`}
                        className="text-primary text-sm font-medium shrink-0 hover:underline"
                      >
                        觀看
                      </Link>
                    ) : (
                      <Lock size={16} className="text-ink/30 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
