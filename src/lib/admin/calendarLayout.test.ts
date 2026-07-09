import { describe, expect, it } from "vitest";
import { computeBlockPosition, currentTimeOffset, PX_PER_MINUTE } from "./calendarLayout";

describe("computeBlockPosition", () => {
  it("48) 開始時間就是顯示起點時，top 為 0", () => {
    const { top } = computeBlockPosition("10:00", "11:00");
    expect(top).toBe(0);
  });

  it("49) top 與 height 正確反映距離顯示起點的分鐘數與時長", () => {
    const { top, height } = computeBlockPosition("11:30", "12:30");
    expect(top).toBe(90 * PX_PER_MINUTE);
    expect(height).toBe(60 * PX_PER_MINUTE);
  });
});

describe("currentTimeOffset", () => {
  it("50) 在顯示範圍內回傳正確位移", () => {
    const offset = currentTimeOffset(11 * 60); // 11:00
    expect(offset).toBe(60 * PX_PER_MINUTE);
  });

  it("51) 早於顯示起點或晚於顯示終點時回傳 null（不畫現在時間線）", () => {
    expect(currentTimeOffset(9 * 60)).toBeNull();
    expect(currentTimeOffset(23 * 60)).toBeNull();
  });
});
