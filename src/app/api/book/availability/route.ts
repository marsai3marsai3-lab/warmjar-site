import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateAvailability } from "@/lib/booking/availability";
import { fetchAvailabilityInput } from "@/lib/booking/availabilityData";
import { availabilityRequestSchema } from "@/lib/booking/schemas";
import { BOOKING_BUFFER_MINUTES, SLOT_INTERVAL_MINUTES } from "@/lib/booking/constants";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = availabilityRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const result = await fetchAvailabilityInput(supabase, {
    serviceVariantIds: parsed.data.serviceVariantIds,
    staffId: parsed.data.staffId,
    dateRange: parsed.data.dateRange,
    bufferMinutes: BOOKING_BUFFER_MINUTES,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const slots = calculateAvailability({
    ...result.input,
    slotIntervalMinutes: SLOT_INTERVAL_MINUTES,
  });

  const slotsByDate = new Map<string, typeof slots>();
  for (const slot of slots) {
    const list = slotsByDate.get(slot.date) ?? [];
    list.push(slot);
    slotsByDate.set(slot.date, list);
  }

  return NextResponse.json({
    totalDurationMinutes: result.totalDurationMinutes,
    staffOptions: result.staffOptions,
    days: [...slotsByDate.entries()].map(([date, daySlots]) => ({
      date,
      slots: daySlots.map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
        availableStaffIds: s.availableStaffIds,
      })),
    })),
  });
}
