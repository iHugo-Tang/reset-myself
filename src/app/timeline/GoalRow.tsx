import { TimelineItem } from '@/db/goals';
import {
  DEFAULT_COLOR,
  DEFAULT_ICON,
  ICON_MAP,
} from '@/app/admin/dashboard/iconOptions';

export function GoalRow({ item }: { item: TimelineItem }) {
  const ratio = item.count / Math.max(1, item.target);
  const isCompleted = ratio >= 1;
  const completionPercent = Math.min(100, Math.round(Math.min(1, ratio) * 100));
  const Icon = ICON_MAP[item.icon] ?? ICON_MAP[DEFAULT_ICON];
  const color = item.color || DEFAULT_COLOR;
  const rowClass = isCompleted
    ? 'group relative flex gap-3 rounded-2xl border border-emerald-800/60 bg-[#0f1a16] px-4 py-3 shadow-[0_12px_50px_rgba(16,185,129,0.12)] transition hover:border-emerald-600/70 hover:bg-[#122019]'
    : 'group relative flex gap-3 rounded-2xl border border-transparent bg-[#15202b] px-4 py-3 transition hover:border-slate-800 hover:bg-[#1c2733] active:bg-[#1e2d3c]';

  return (
    <div className={rowClass}>
      <div
        className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-[#0b1017] text-sm font-semibold text-slate-100"
        style={{
          backgroundColor: `${color}22`,
          color,
          borderColor: `${color}55`,
        }}
      >
        {Icon ? (
          <Icon className="h-4 w-4" />
        ) : (
          (item.title.trim()[0] ?? '?').toUpperCase()
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-base font-semibold text-slate-50">
            {item.title}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <span className="text-base font-semibold text-slate-100">
            {item.count} / {item.target} times
          </span>
          <span
            className={
              isCompleted ? 'font-semibold text-emerald-300' : 'text-slate-400'
            }
          >
            {completionPercent}% complete
          </span>
        </div>
        <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full transition-[width] duration-500 ${
              isCompleted ? 'bg-emerald-400' : 'bg-sky-400/80'
            }`}
            style={{ width: `${completionPercent}%` }}
          />
          {isCompleted && (
            <span
              className="absolute inset-0 rounded-full border border-emerald-500/40"
              aria-hidden
            />
          )}
        </div>
      </div>
    </div>
  );
}

