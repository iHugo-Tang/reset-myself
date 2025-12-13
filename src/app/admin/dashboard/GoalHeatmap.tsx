'use client';

import { useEffect, useRef, useState } from 'react';
import { HeatmapDay } from '@/db/goals';
import {
  addDaysUtc,
  startOfDayUtcMs,
  toDateKey,
  weekDayIndex,
} from '@/utils/time';

const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const normalizeHeatmap = (
  heatmap: HeatmapDay[] | undefined,
  offsetMinutes: number,
  days: number
) => {
  const byDate = new Map<string, HeatmapDay>();
  for (const entry of heatmap ?? []) {
    byDate.set(entry.date, entry);
  }

  // Use the last day of the current week as the end, backfill `days` days to show a full week
  const todayUtcStart = startOfDayUtcMs(Date.now(), offsetMinutes);
  const todayKey = toDateKey(todayUtcStart, offsetMinutes);
  const weekdayIdx = weekDayIndex(todayKey); // 0 = Sunday
  const endOfWeekUtc = addDaysUtc(todayUtcStart, 6 - weekdayIdx);
  const startUtc = addDaysUtc(endOfWeekUtc, -(days - 1));

  const filled: (HeatmapDay & { isFuture?: boolean })[] = [];
  for (let i = 0; i < days; i++) {
    const cursorUtc = addDaysUtc(startUtc, i);
    const dateKey = toDateKey(cursorUtc, offsetMinutes);
    const existing = byDate.get(dateKey);
    filled.push({
      date: dateKey,
      count: existing?.count ?? 0,
      target: existing?.target ?? 1, // Default to 1 to avoid div by zero if missing
      isFuture: dateKey > todayKey,
    });
  }
  return filled;
};

export function GoalHeatmap({ heatmap }: { heatmap: HeatmapDay[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numWeeks, setNumWeeks] = useState(13); // Default to ~90 days

  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.offsetWidth;
      // Available width for content.
      // GoalCard has p-5, so this component is inside that padding.
      // We assume full width of parent.

      // Col width = 14px + 4px gap = 18px
      // Formula: 18n - 4 <= width => n <= (width + 4) / 18
      const cols = Math.floor((width + 4) / 18);
      setNumWeeks(Math.max(1, cols));
    };

    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);

    // Initial check
    updateWidth();

    return () => observer.disconnect();
  }, []);

  const daysToShow = numWeeks * 7;
  const data = normalizeHeatmap(heatmap, 0, daysToShow);

  const cells = data.map((entry) => {
    const d = new Date(`${entry.date}T00:00:00Z`);
    return { ...entry, weekday: d.getUTCDay() };
  });

  // Align to start of week (Sunday)
  // normalizeHeatmap returns data ending on Saturday of current week (or future).
  // The first element should be a Sunday if daysToShow is multiple of 7.
  // But let's verify offset logic from HeatmapCard.
  const offset = cells[0]?.weekday ?? 0;
  // If offset is not 0 (Sunday), prepend nulls?
  // normalizeHeatmap logic:
  // endOfWeekUtc is Saturday.
  // startUtc = endOfWeekUtc - (days - 1).
  // If days is multiple of 7 (e.g. 70), then startUtc is (Saturday - 69 days).
  // 69 days = 9 weeks + 6 days.
  // Saturday (6) - 6 = Sunday (0).
  // So if days is multiple of 7, it starts on Sunday.
  // However, let's keep the safety padding logic just in case.
  const padded: ((typeof cells)[number] | null)[] = [
    ...Array(offset).fill(null),
    ...cells,
  ];

  const columns: ((typeof cells)[number] | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    columns.push(padded.slice(i, i + 7));
  }

  const getColorClass = (day: HeatmapDay) => {
    if (day.count === 0) return 'bg-slate-200';
    const ratio = day.count / Math.max(1, day.target);
    if (ratio < 1) return 'bg-emerald-300'; // Partial
    if (ratio < 1.5) return 'bg-emerald-500'; // Met target
    return 'bg-emerald-700'; // Exceeded
  };

  const formatTooltip = (cell: (typeof cells)[number]) => {
    const weekLabel = weekday[cell.weekday];
    return `${cell.date} · ${weekLabel}\nCompleted: ${cell.count} / Target: ${cell.target}`;
  };

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <div className="flex gap-1 overflow-visible">
        {columns.map((col, colIdx) => (
          <div key={`col-${colIdx}`} className="flex flex-col gap-1">
            {col.map((cell, rowIdx) => {
              if (!cell) {
                return (
                  <div
                    key={`empty-${colIdx}-${rowIdx}`}
                    className="h-[14px] w-[14px] rounded-[4px] bg-transparent"
                    aria-hidden
                  />
                );
              }

              if (cell.isFuture) {
                return (
                  <div
                    key={cell.date}
                    className="h-[14px] w-[14px] rounded-[4px] bg-transparent" // or maybe faint outline?
                    aria-hidden
                  />
                );
              }

              const colorClass = getColorClass(cell);

              return (
                <div key={cell.date} className="group relative">
                  <div
                    className={`h-[14px] w-[14px] rounded-[4px] transition-colors ${colorClass}`}
                    role="presentation"
                  />
                  <div className="pointer-events-none absolute top-0 left-1/2 z-30 hidden -translate-x-1/2 -translate-y-[110%] rounded-md bg-slate-900 px-2 py-1 text-xs whitespace-pre text-slate-50 shadow-lg ring-1 ring-slate-800 group-hover:block">
                    {formatTooltip(cell)}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
