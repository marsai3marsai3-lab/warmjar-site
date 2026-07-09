import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/admin/auth";
import { isOwnerRole } from "@/lib/admin/permissions";
import { fetchMemberDetail } from "@/lib/admin/memberDetail";
import { fetchMemberTagOptions } from "@/lib/admin/memberData";
import { MemberDetailView } from "@/components/admin/MemberDetailView";

type Params = Promise<{ id: string }>;

export default async function AdminMemberDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const { profile } = await requireAdminUser();
  const supabase = createAdminClient();

  const [detail, tagOptions] = await Promise.all([
    fetchMemberDetail(supabase, id),
    fetchMemberTagOptions(supabase),
  ]);

  if (!detail) notFound();

  return <MemberDetailView detail={detail} tagOptions={tagOptions} isOwner={isOwnerRole(profile.role)} />;
}
