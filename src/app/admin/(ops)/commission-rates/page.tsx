import { requireOwnerUser } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchServiceCommissionDefaults,
  fetchStaffCommissionDefaults,
  fetchStaffServiceOverrides,
} from "@/lib/checkout/commissionRateData";
import { fetchStaffOptions } from "@/lib/admin/calendarData";
import { CommissionRateSettings } from "@/components/admin/CommissionRateSettings";

type SearchParams = Promise<{ staffId?: string }>;

export default async function CommissionRatesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireOwnerUser();
  const params = await searchParams;
  const supabase = createAdminClient();

  const [services, staffDefaults, staffOptions] = await Promise.all([
    fetchServiceCommissionDefaults(supabase),
    fetchStaffCommissionDefaults(supabase),
    fetchStaffOptions(supabase),
  ]);

  const selectedStaffId = params.staffId ?? staffOptions[0]?.id ?? null;
  const overrides = selectedStaffId ? await fetchStaffServiceOverrides(supabase, selectedStaffId) : [];

  return (
    <CommissionRateSettings
      services={services}
      staffDefaults={staffDefaults}
      staffOptions={staffOptions}
      selectedStaffId={selectedStaffId}
      overrides={overrides}
    />
  );
}
