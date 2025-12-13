'use client';

import { useEffect, useRef, useState } from 'react';
import { TimelineHeatmapDay } from '@/db/goals';
import {
  addDaysUtc,
  startOfDayUtcMs,
  toDateKey,
  weekDayIndex,
} from '@/utils/time';

const heatmapColors = ['#0b1017', '#123040', '#15516f', '#1c77a0', '#2bb4d9'];
const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const normalizeHeatmap = (
  heatmap: TimelineHeatmapDay[] | undefined,
  offsetMinutes: number,
  days: number
) => {
  const byDate = new Map<string, number>();
  for (const entry of heatmap ?? []) {
    byDate.set(entry.date, entry.count);
  }

  // Use the last day of the current week as the end, backfill `days` days to show a full week
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

export function HeatmapCard({
  heatmap,
}: {
  heatmap: TimelineHeatmapDay[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [numWeeks, setNumWeeks] = useState(15);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.offsetWidth;
      // p-5 = 20px padding left/right. Total 40px.
      // Available width for content = width - 40.
      const contentWidth = width - 40;
      
      // Col width = 14px + 4px gap = 18px
      // Formula: 18n - 4 <= contentWidth => n <= (contentWidth + 4) / 18
      const cols = Math.floor((contentWidth + 4) / 18);
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
  const todayKey = toDateKey(Date.now(), 0);
  const maxCount = data.reduce((max, entry) => Math.max(max, entry.count), 0);

  if (!(heatmap?.length ?? 0)) {
    return (
      <div
        ref={containerRef}
        className="rounded-3xl border border-slate-900/70 bg-linear-to-br from-[#0d1520] via-[#0f1b2a] to-[#0c121a] p-5 shadow-[0_18px_80px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-100">
            Heatmap for the last {numWeeks} weeks
          </p>
          <span className="text-xs text-slate-500">No data yet</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Log check-ins to see them here.
        </p>
      </div>
    );
  }

  const cells = data.map((entry) => {
    const d = new Date(`${entry.date}T00:00:00Z`);
    return { ...entry, weekday: d.getUTCDay(), dateObj: d };
  });

  const offset = cells[0]?.weekday ?? 0;
  const padded: ((typeof cells)[number] | null)[] = [
    ...Array(offset).fill(null),
    ...cells,
  ];
  const remainder = padded.length % 7;
  if (remainder !== 0) {
    padded.push(...Array(7 - remainder).fill(null));
  }

  const columns: ((typeof cells)[number] | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    columns.push(padded.slice(i, i + 7));
  }

  const getLevel = (count: number) => {
    if (count <= 0 || maxCount <= 0) return 0;
    const ratio = count / maxCount;
    if (ratio >= 0.8) return 4;
    if (ratio >= 0.6) return 3;
    if (ratio >= 0.3) return 2;
    return 1;
  };

  const formatTooltip = (cell: (typeof cells)[number]) => {
    const weekLabel = weekday[cell.weekday];
    return `${cell.date} · ${weekLabel}\nCompletions: ${cell.count}`;
  };

  return (
    <div
      ref={containerRef}
      className="rounded-3xl border border-slate-900/70 bg-linear-to-br from-[#0d1520] via-[#0f1b2a] to-[#0c121a] p-5 shadow-[0_18px_80px_rgba(0,0,0,0.45)]"
    >
      <div className="flex flex-col gap-2 leading-tight">
        <span className="text-sm font-semibold text-slate-100">
          Heatmap for the last {numWeeks} weeks
        </span>
        <span className="text-xs text-slate-500">
          Color shows completions for the day
        </span>
      </div>

      <div className="mt-4 overflow-visible pb-1">
        <div className="flex gap-1 overflow-visible">
          {columns.map((col, colIdx) => (
            <div
              key={`col-${colIdx}`}
              className="flex flex-col gap-1 overflow-visible"
            >
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

                if (cell.date > todayKey) {
                  return (
                    <div
                      key={cell.date}
                      className="h-[14px] w-[14px] rounded-[4px] bg-transparent"
                      aria-hidden
                    />
                  );
                }

                const level = getLevel(cell.count);
                const color = heatmapColors[level];
                const borderColor = level === 0 ? '#1f2933' : '#265c74';

                return (
                  <div
                    key={cell.date}
                    className="group relative overflow-visible"
                  >
                    <div
                      className="h-[14px] w-[14px] rounded-[4px] ring-1 ring-transparent transition"
                      style={{
                        backgroundColor: color,
                        boxShadow: `0 0 0 1px ${borderColor}`,
                      }}
                      role="presentation"
                    />
                    <div className="pointer-events-none absolute top-0 left-1/2 z-30 hidden -translate-x-1/2 -translate-y-[110%] rounded-md bg-slate-950 px-2 py-1 text-xs whitespace-pre text-slate-100 shadow-lg ring-1 ring-slate-800 group-hover:block">
                      {formatTooltip(cell)}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
