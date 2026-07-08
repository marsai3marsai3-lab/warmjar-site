import { toMinutes, toTimeString, type TimeString } from "./availability";

export type ServiceDuration = {
  serviceVariantId: string;
  durationMinutes: number;
};

export type ServiceSlot = {
  serviceVariantId: string;
  startTime: TimeString;
  endTime: TimeString;
};

/**
 * Packs the customer's selected services back-to-back (in selection order,
 * same staff, no gaps) starting at blockStartTime. calculateAvailability()
 * already validated the combined block fits in an open window; this just
 * decides which sub-range within that block belongs to which service so we
 * can write one appointments row per service (schema requires one
 * service_variant_id per appointment).
 */
export function splitServiceSlots(
  services: ServiceDuration[],
  blockStartTime: TimeString
): ServiceSlot[] {
  let cursor = toMinutes(blockStartTime);
  const slots: ServiceSlot[] = [];

  for (const service of services) {
    const start = cursor;
    const end = cursor + service.durationMinutes;
    slots.push({
      serviceVariantId: service.serviceVariantId,
      startTime: toTimeString(start),
      endTime: toTimeString(end),
    });
    cursor = end;
  }

  return slots;
}
