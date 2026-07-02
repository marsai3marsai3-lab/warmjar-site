import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCoursesByIds, urlFor } from "@/lib/sanity";
import { createClient } from "@/lib/supabase/server";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "我的課程",
  robots: { index: false },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: enrollments } = await supabase
    .from("enrollments")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .select("granted_at, courses(sanity_id, slug, title)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("granted_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sanityIds = (enrollments ?? []).map((e: any) => e.courses?.sanity_id).filter(Boolean);
  const sanityData = await getCoursesByIds(sanityIds);

  // 以 sanity_id 建立 map 方便查詢
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sanityMap: Record<string, any> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sanityData.forEach((c: any) => { sanityMap[c._id] = c; });

  return (
    <>
      <Header />
      <main className="pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="mb-10">
            <h1 className="font-serif text-3xl sm:text-4xl text-ink mb-2">
              我的課程
            </h1>
            <p className="text-ink/50 text-sm">歡迎回來，{user.email}</p>
          </div>

          {enrollments?.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-stone-200 rounded-2xl">
              <p className="text-ink/40 mb-4">您目前尚未購買任何課程。</p>
              <Link
                href="/courses"
                className="text-primary text-sm font-medium hover:underline"
              >
                前往課程列表
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(enrollments ?? []).map((enrollment: any) => {
                const sanityId = enrollment.courses?.sanity_id;
                const course = sanityMap[sanityId];
                const dbSlug = enrollment.courses?.slug;
                const slug = course?.slug?.current ?? course?.slug ?? dbSlug;
                const firstLessonSlug = course?.firstLesson?.slug;

                return (
                  <article
                    key={sanityId}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 flex flex-col"
                  >
                    {course?.thumbnail && (
                      <div className="relative aspect-video bg-stone-100">
                        <Image
                          src={urlFor(course.thumbnail).width(480).height(270).url()}
                          alt={course.title ?? enrollment.courses?.title ?? "課程"}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-5 flex flex-col flex-1">
                      <h2 className="font-serif text-lg text-ink mb-1">
                        {course?.title ?? enrollment.courses?.title ?? "課程"}
                      </h2>
                      {course?.tagline && (
                        <p className="text-ink/50 text-sm mb-3 line-clamp-2">
                          {course.tagline}
                        </p>
                      )}
                      <div className="text-xs text-ink/30 mb-4">
                        {course?.lessonCount ?? 0} 個單元 ·{" "}
                        已購買於{" "}
                        {new Date(enrollment.granted_at).toLocaleDateString("zh-TW")}
                      </div>
                      <div className="mt-auto">
                        {slug && firstLessonSlug ? (
                          <Link
                            href={`/courses/${slug}/${firstLessonSlug}`}
                            className="w-full block text-center bg-primary text-white text-sm font-medium py-2.5 rounded-full hover:bg-primary/90 transition"
                          >
                            繼續觀看
                          </Link>
                        ) : slug ? (
                          <Link
                            href={`/courses/${slug}`}
                            className="w-full block text-center bg-primary text-white text-sm font-medium py-2.5 rounded-full hover:bg-primary/90 transition"
                          >
                            進入課程
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
