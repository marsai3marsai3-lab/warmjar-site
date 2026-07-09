import { createAdminClient } from "@/lib/supabase/admin";
import { fetchMemberTagOptions } from "@/lib/admin/memberData";
import { MemberListView } from "@/components/admin/MemberListView";

export default async function AdminMembersPage() {
  const supabase = createAdminClient();
  const tagOptions = await fetchMemberTagOptions(supabase);

  return <MemberListView tagOptions={tagOptions} />;
}
