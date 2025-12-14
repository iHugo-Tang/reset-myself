import { TimelineHeatmapDay } from '@/db/goals';
import {
  addDaysUtc,
  startOfDayUtcMs,
  toDateKey,
  weekDayIndex,
} from '@/utils/time';

export const normalizeHeatmap = (
  heatmap: TimelineHeatmapDay[] | undefined,
  offsetMinutes: number,
  days: number
) => {
  const byDate = new Map<string, number>();
  for (const entry of heatmap ?? []) {
    byDate.set(entry.date, entry.count);
  }

  const todayUtcStart = startOfDayUtcMs(Date.now(), offsetMinutes);
  const todayKey = toDateKey(todayUtcStart, offsetMinutes);
  const weekdayIdx = weekDayIndex(todayKey); // 0 = Sunday
  const endOfWeekUtc = addDaysUtc(todayUtcStart, 6 - weekdayIdx);
  const startUtc = addDaysUtc(endOfWeekUtc, -(days - 1));

  const filled: TimelineHeatmapDay[] = [];
  for (let i = 0; i < days; i++) {
    const cursorUtc = addDaysUtc(startUtc, i);
    const dateKey = toDateKey(cursorUtc, offsetMinutes);
    filled.push({ date: dateKey, count: byDate.get(dateKey) ?? 0 });
  }
  return filled;
};

export type NormalizeHeatmap = typeof normalizeHeatmap;
