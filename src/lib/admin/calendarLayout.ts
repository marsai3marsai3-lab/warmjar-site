export const DISPLAY_START_TIME = "10:00";
export const DISPLAY_END_TIME = "22:00";
export const PX_PER_MINUTE = 1.6;

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function totalGridHeight(): number {
  return (timeToMinutes(DISPLAY_END_TIME) - timeToMinutes(DISPLAY_START_TIME)) * PX_PER_MINUTE;
}

export function computeBlockPosition(startTime: string, endTime: string): { top: number; height: number } {
  const displayStart = timeToMinutes(DISPLAY_START_TIME);
  const top = (timeToMinutes(startTime) - displayStart) * PX_PER_MINUTE;
  const height = (timeToMinutes(endTime) - timeToMinutes(startTime)) * PX_PER_MINUTE;
  return { top, height };
}

export function currentTimeOffset(nowMinutes: number): number | null {
  const displayStart = timeToMinutes(DISPLAY_START_TIME);
  const displayEnd = timeToMinutes(DISPLAY_END_TIME);
  if (nowMinutes < displayStart || nowMinutes > displayEnd) return null;
  return (nowMinutes - displayStart) * PX_PER_MINUTE;
}
