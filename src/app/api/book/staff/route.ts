import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canStaffPerformAllServices, type ServiceSelection } from "@/lib/booking/availability";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const serviceVariantIds = (url.searchParams.get("serviceVariantIds") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (serviceVariantIds.length === 0) {
    return NextResponse.json({ error: "缺少服務項目" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const variantsRes = await supabase
    .from("service_variants")
    .select("id, service_id")
    .in("id", serviceVariantIds);
  if (variantsRes.error) {
    return NextResponse.json({ error: "無法取得師傅列表，請稍後再試" }, { status: 500 });
  }

  const services: ServiceSelection[] = [
    ...new Set((variantsRes.data ?? []).map((v) => v.service_id)),
  ].map((serviceId) => ({ id: serviceId, durationMinutes: 0 }));

  const [staffRes, skillsRes] = await Promise.all([
    supabase.from("staff").select("id, name").eq("status", "active"),
    supabase.from("staff_service_skills").select("staff_id, service_id, can_perform"),
  ]);
  if (staffRes.error || skillsRes.error) {
    return NextResponse.json({ error: "無法取得師傅列表，請稍後再試" }, { status: 500 });
  }

  const staffServiceSkills = (skillsRes.data ?? []).map((s) => ({
    staffId: s.staff_id,
    serviceId: s.service_id,
    canPerform: s.can_perform,
  }));

  const staff = (staffRes.data ?? []).filter((s) =>
    canStaffPerformAllServices(s.id, services, staffServiceSkills)
  );

  return NextResponse.json({ staff });
}
