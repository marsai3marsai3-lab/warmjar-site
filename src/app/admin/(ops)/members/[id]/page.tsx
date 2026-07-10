import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/admin/auth";
import { isOwnerRole } from "@/lib/admin/permissions";
import { fetchMemberDetail } from "@/lib/admin/memberDetail";
import { fetchMemberTagOptions } from "@/lib/admin/memberData";
import { fetchStaffOptions } from "@/lib/admin/calendarData";
import {
  fetchStoredValueAccount,
  fetchStoredValuePlans,
  fetchStoredValueTransactions,
} from "@/lib/storedValue/storedValueData";
import { fetchMessageTemplates, fetchManualSendCountToday } from "@/lib/line/messageTemplatesData";
import { taipeiTodayISO } from "@/lib/admin/dateUtils";
import { MemberDetailView } from "@/components/admin/MemberDetailView";

type Params = Promise<{ id: string }>;

export default async function AdminMemberDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const { profile } = await requireAdminUser();
  const supabase = createAdminClient();

  const [
    detail,
    tagOptions,
    storedValueAccount,
    storedValueTransactions,
    activePlans,
    staffOptions,
    messageTemplates,
    sentTodayCount,
  ] = await Promise.all([
    fetchMemberDetail(supabase, id),
    fetchMemberTagOptions(supabase),
    fetchStoredValueAccount(supabase, id),
    fetchStoredValueTransactions(supabase, id),
    fetchStoredValuePlans(supabase, true),
    fetchStaffOptions(supabase),
    fetchMessageTemplates(supabase, true),
    fetchManualSendCountToday(supabase, id, taipeiTodayISO()),
  ]);

  if (!detail) notFound();

  return (
    <MemberDetailView
      detail={detail}
      tagOptions={tagOptions}
      isOwner={isOwnerRole(profile.role)}
      storedValueAccount={storedValueAccount}
      storedValueTransactions={storedValueTransactions}
      activePlans={activePlans}
      staffOptions={staffOptions}
      messageTemplates={messageTemplates.map((t) => ({ key: t.key, name: t.name }))}
      sentTodayCount={sentTodayCount}
    />
  );
}
