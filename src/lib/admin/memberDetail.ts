import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { evaluateDepositPolicy, type DepositPolicyResult } from "@/lib/booking/depositPolicy";
import { fetchCustomerDepositHistory } from "@/lib/booking/depositHistory";
import type { TagOption } from "./memberData";

export type MemberProfile = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  birthday: string | null;
  source: string | null;
  internalNote: string | null;
  status: string;
  rating: number | null;
  tags: TagOption[];
  lineBound: boolean;
};

export type MemberAppointmentRow = {
  id: string;
  serviceVariantId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  checkedInAt: string | null;
  source: string;
  serviceName: string;
  staffName: string;
};

export type MemberDepositRow = {
  id: string;
  status: string;
  amount: number;
  anchorAppointmentId: string;
  paidAt: string | null;
  waivedByAt: string | null;
  refundedAt: string | null;
  note: string | null;
};

export type MemberNote = {
  id: string;
  note: string;
  photoUrls: string[];
  createdAt: string;
  authorName: string | null;
};

export type MemberDetail = {
  profile: MemberProfile;
  appointments: MemberAppointmentRow[];
  deposits: MemberDepositRow[];
  noShowCount: number;
  currentDepositPolicy: DepositPolicyResult;
  notes: MemberNote[];
};

export async function fetchMemberDetail(
  supabase: SupabaseClient<Database>,
  customerId: string
): Promise<MemberDetail | null> {
  const customerRes = await supabase
    .from("customers")
    .select("id, name, phone, email, gender, birthday, source, internal_note, status, rating, profile_id, profiles ( line_user_id )")
    .eq("id", customerId)
    .maybeSingle();
  if (customerRes.error) throw customerRes.error;
  if (!customerRes.data) return null;

  const [tagsRes, appointmentsRes, notesRes, depositHistory] = await Promise.all([
    supabase.from("customer_tags").select("tags ( id, name, color )").eq("customer_id", customerId),
    supabase
      .from("appointments")
      .select(
        `id, appointment_date, start_time, end_time, status, checked_in_at, source, service_variant_id,
         service_variants ( name ), staff ( name )`
      )
      .eq("customer_id", customerId)
      .order("appointment_date", { ascending: false })
      .order("start_time", { ascending: false }),
    supabase
      .from("member_notes")
      .select("id, note, photo_urls, created_at, profiles ( display_name )")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    fetchCustomerDepositHistory(supabase, customerId),
  ]);

  if (tagsRes.error) throw tagsRes.error;
  if (appointmentsRes.error) throw appointmentsRes.error;
  if (notesRes.error) throw notesRes.error;

  // deposit_records 沒有 customer_id 欄位（綁在 appointment 上），用這個
  // 客人的 appointment id 集合去反查涵蓋到的訂金紀錄。
  const appointmentIds = (appointmentsRes.data ?? []).map((a) => a.id);
  const depositsRes =
    appointmentIds.length > 0
      ? await supabase
          .from("deposit_records")
          .select("id, status, amount, covered_appointment_ids, paid_at, waived_by_at, refunded_at, note")
          .overlaps("covered_appointment_ids", appointmentIds)
      : { data: [], error: null };
  if (depositsRes.error) throw depositsRes.error;

  const tags: TagOption[] = (tagsRes.data ?? []).flatMap((r) => (r.tags ? [r.tags] : []));

  const appointments: MemberAppointmentRow[] = (appointmentsRes.data ?? []).map((a) => ({
    id: a.id,
    serviceVariantId: a.service_variant_id,
    date: a.appointment_date,
    startTime: a.start_time.slice(0, 5),
    endTime: a.end_time.slice(0, 5),
    status: a.status,
    checkedInAt: a.checked_in_at,
    source: a.source,
    serviceName: a.service_variants?.name ?? "",
    staffName: a.staff?.name ?? "未指定",
  }));

  const noShowCount = appointments.filter((a) => a.status === "no_show").length;

  const deposits: MemberDepositRow[] = (depositsRes.data ?? []).map((d) => ({
    id: d.id,
    status: d.status,
    amount: d.amount,
    anchorAppointmentId: d.covered_appointment_ids[0] ?? "",
    paidAt: d.paid_at,
    waivedByAt: d.waived_by_at,
    refundedAt: d.refunded_at,
    note: d.note,
  }));

  const notes: MemberNote[] = (notesRes.data ?? []).map((n) => ({
    id: n.id,
    note: n.note,
    photoUrls: n.photo_urls,
    createdAt: n.created_at,
    authorName: n.profiles?.display_name ?? null,
  }));

  const currentDepositPolicy = evaluateDepositPolicy({ customerHistory: depositHistory, totalFaceValue: 0 });

  return {
    profile: {
      id: customerRes.data.id,
      name: customerRes.data.name,
      phone: customerRes.data.phone,
      email: customerRes.data.email,
      gender: customerRes.data.gender,
      birthday: customerRes.data.birthday,
      source: customerRes.data.source,
      internalNote: customerRes.data.internal_note,
      status: customerRes.data.status,
      rating: customerRes.data.rating,
      tags,
      lineBound: !!customerRes.data.profiles?.line_user_id,
    },
    appointments,
    deposits,
    noShowCount,
    currentDepositPolicy,
    notes,
  };
}
