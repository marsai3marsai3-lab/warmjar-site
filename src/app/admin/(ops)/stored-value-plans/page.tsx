import { requireOwnerUser } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchStoredValuePlans } from "@/lib/storedValue/storedValueData";
import { StoredValuePlanSettings } from "@/components/admin/StoredValuePlanSettings";

export default async function StoredValuePlansPage() {
  await requireOwnerUser();
  const supabase = createAdminClient();
  const plans = await fetchStoredValuePlans(supabase);

  return <StoredValuePlanSettings plans={plans} />;
}
