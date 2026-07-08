import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("service_categories")
    .select(
      "id, name, sort_order, services(id, name, description, is_active, sort_order, service_variants(id, name, duration_minutes, face_value_price, is_active, sort_order))"
    )
    .order("sort_order");

  if (error) {
    return NextResponse.json({ error: "無法取得服務列表，請稍後再試" }, { status: 500 });
  }

  const categories = (data ?? [])
    .map((category) => ({
      id: category.id,
      name: category.name,
      services: (category.services ?? [])
        .filter((service) => service.is_active)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((service) => ({
          id: service.id,
          name: service.name,
          description: service.description,
          variants: (service.service_variants ?? [])
            .filter((variant) => variant.is_active)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((variant) => ({
              id: variant.id,
              name: variant.name,
              durationMinutes: variant.duration_minutes,
              price: variant.face_value_price,
            })),
        }))
        .filter((service) => service.variants.length > 0),
    }))
    .filter((category) => category.services.length > 0);

  return NextResponse.json({ categories });
}
