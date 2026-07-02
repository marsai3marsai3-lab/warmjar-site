import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCourses } from "@/lib/sanity";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AdminActions } from "./_components";

export const metadata: Metadata = {
  title: "管理員 — 課程授權",
  robots: { index: false },
};

export default async function AdminCoursesPage() {
  const supabase = await createClient();
  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();

  if (!adminUser) redirect("/login");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (!adminEmails.includes(adminUser.email ?? "")) redirect("/");

  const admin = createAdminClient();

  // 取得所有用戶
  const {
    data: { users },
  } = await admin.auth.admin.listUsers();

  // 取得所有 enrollments
  const { data: enrollments } = await admin
    .from("enrollments")
    .select("id, user_id, is_active, granted_at, courses(slug, title)")
    .order("granted_at", { ascending: false });

  // 取得 Sanity 課程列表（供授權下拉選單用）
  const courses = await getCourses();

  // 以 user_id 建立 enrollment map
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrollmentMap: Record<string, any[]> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (enrollments ?? []).forEach((e: any) => {
    if (!enrollmentMap[e.user_id]) enrollmentMap[e.user_id] = [];
    enrollmentMap[e.user_id].push(e);
  });

  return (
    <>
      <Header />
      <main className="pt-24 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h1 className="font-serif text-3xl text-ink mb-2">課程授權管理</h1>
          <p className="text-ink/40 text-sm mb-10">
            手動授予學員觀看權限。授予後學員即可登入觀看已購買課程。
          </p>

          <div className="space-y-4">
            {users.map((u) => {
              const userEnrollments = enrollmentMap[u.id] ?? [];
              return (
                <div
                  key={u.id}
                  className="bg-white rounded-2xl border border-stone-100 p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="font-medium text-ink text-sm">{u.email}</p>
                      <p className="text-ink/40 text-xs mt-0.5">
                        {u.user_metadata?.full_name ?? "未填姓名"} ·{" "}
                        加入於 {new Date(u.created_at).toLocaleDateString("zh-TW")}
                      </p>
                    </div>
                    <AdminActions
                      userId={u.id}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      courses={courses as any[]}
                    />
                  </div>

                  {userEnrollments.length > 0 ? (
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {userEnrollments.map((e: any) => (
                        <div
                          key={e.id}
                          className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-2.5 text-sm"
                        >
                          <span className="text-ink/70">
                            {e.courses?.title ?? e.courses?.slug ?? "未知課程"}
                          </span>
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                e.is_active
                                  ? "bg-green-100 text-green-700"
                                  : "bg-stone-200 text-stone-400"
                              }`}
                            >
                              {e.is_active ? "有效" : "已停用"}
                            </span>
                            {e.is_active && (
                              <AdminActions
                                enrollmentId={e.id}
                                mode="revoke"
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                courses={[]}
                                userId={u.id}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-ink/30">尚未授予任何課程</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
