"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function grantEnrollment(userId: string, courseSlug: string) {
  const admin = createAdminClient();

  const { data: course, error: courseErr } = await admin
    .from("courses")
    .select("id")
    .eq("slug", courseSlug)
    .single();

  if (courseErr || !course) {
    throw new Error(`找不到課程：${courseSlug}`);
  }

  const { error } = await admin.from("enrollments").upsert(
    {
      user_id: userId,
      course_id: course.id,
      granted_by: "admin",
      is_active: true,
    },
    { onConflict: "user_id,course_id" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/admin/courses");
}

export async function revokeEnrollment(enrollmentId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("enrollments")
    .update({ is_active: false })
    .eq("id", enrollmentId);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/courses");
}
