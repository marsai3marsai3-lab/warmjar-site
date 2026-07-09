import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminUser } from "@/lib/admin/auth";
import { isOwnerRole } from "@/lib/admin/permissions";
import { fetchCheckoutDetail } from "@/lib/checkout/checkoutData";
import { CheckoutDetailView } from "@/components/admin/CheckoutDetailView";

type Params = Promise<{ id: string }>;

export default async function CheckoutDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const { profile } = await requireAdminUser();
  const supabase = createAdminClient();

  const detail = await fetchCheckoutDetail(supabase, id);
  if (!detail) notFound();

  return <CheckoutDetailView detail={detail} isOwner={isOwnerRole(profile.role)} />;
}
