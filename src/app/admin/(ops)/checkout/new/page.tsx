import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchAppointmentForCheckout,
  fetchSameDayCheckoutCandidates,
  type CheckoutCandidateAppointment,
} from "@/lib/checkout/checkoutData";
import { fetchCheckoutDetail } from "@/lib/checkout/checkoutData";
import { CheckoutComposer, type ComposerItem } from "@/components/admin/CheckoutComposer";

type SearchParams = Promise<{ appointmentId?: string; reopenFrom?: string }>;

export default async function NewCheckoutPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = createAdminClient();

  let initialCustomer: { id: string; name: string; phone: string | null } | null = null;
  let initialItems: ComposerItem[] = [];
  let sameDayCandidates: CheckoutCandidateAppointment[] = [];

  if (params.appointmentId) {
    const entry = await fetchAppointmentForCheckout(supabase, params.appointmentId);
    if (entry) {
      initialCustomer = { id: entry.customerId, name: entry.customerName, phone: entry.customerPhone };
      initialItems = [
        {
          key: entry.appointment.id,
          appointmentId: entry.appointment.id,
          serviceVariantId: entry.appointment.serviceVariantId,
          serviceName: entry.appointment.serviceName,
          faceValuePerUnit: entry.appointment.faceValue,
          quantity: 1,
          staffId: entry.appointment.staffId ?? "",
          staffName: entry.appointment.staffName,
          itemDiscount: null,
        },
      ];
      sameDayCandidates = await fetchSameDayCheckoutCandidates(
        supabase,
        entry.customerId,
        entry.appointment.date,
        entry.appointment.id
      );
    }
  } else if (params.reopenFrom) {
    const old = await fetchCheckoutDetail(supabase, params.reopenFrom);
    if (old) {
      initialCustomer = { id: old.customerId, name: old.customerName, phone: null };
      initialItems = old.items
        .filter((i) => i.serviceVariantId && i.staffId)
        .map((i) => ({
          key: i.id,
          appointmentId: null,
          serviceVariantId: i.serviceVariantId as string,
          serviceName: i.serviceName,
          faceValuePerUnit: Math.round(i.faceValue / i.quantity),
          quantity: i.quantity,
          staffId: i.staffId as string,
          staffName: i.staffName,
          itemDiscount: null,
        }));
    }
  }

  return (
    <CheckoutComposer
      initialCustomer={initialCustomer}
      initialItems={initialItems}
      sameDayCandidates={sameDayCandidates}
      reopenedFromCheckoutId={params.reopenFrom ?? null}
    />
  );
}
