import { describe, expect, it } from "vitest";
import { splitServiceSlots } from "./splitServiceSlots";

describe("splitServiceSlots", () => {
  it("packs a single service starting exactly at the block start", () => {
    const slots = splitServiceSlots([{ serviceVariantId: "a", durationMinutes: 60 }], "10:00");
    expect(slots).toEqual([{ serviceVariantId: "a", startTime: "10:00", endTime: "11:00" }]);
  });

  it("packs multiple services back-to-back in selection order with no gaps", () => {
    const slots = splitServiceSlots(
      [
        { serviceVariantId: "a", durationMinutes: 60 },
        { serviceVariantId: "b", durationMinutes: 30 },
        { serviceVariantId: "c", durationMinutes: 90 },
      ],
      "10:00"
    );
    expect(slots).toEqual([
      { serviceVariantId: "a", startTime: "10:00", endTime: "11:00" },
      { serviceVariantId: "b", startTime: "11:00", endTime: "11:30" },
      { serviceVariantId: "c", startTime: "11:30", endTime: "13:00" },
    ]);
  });

  it("returns an empty array for an empty service list", () => {
    expect(splitServiceSlots([], "10:00")).toEqual([]);
  });
});
