import { TimelineCheckinEvent } from '@/db/goals';
import { formatEventTime } from '@/utils/time';
import {
  DEFAULT_COLOR,
  DEFAULT_ICON,
  ICON_MAP,
} from '@/app/admin/dashboard/iconOptions';

export function CheckinEventCard({
  event,
  timeZone,
}: {
  event: TimelineCheckinEvent;
  timeZone: string;
}) {
  const timeLabel = formatEventTime(event.createdAt, timeZone);
  const completionPercent = Math.min(
    100,
    Math.round(Math.min(1, event.newCount / Math.max(1, event.target)) * 100)
  );
  const Icon = ICON_MAP[event.icon] ?? ICON_MAP[DEFAULT_ICON];
  const color = event.color || DEFAULT_COLOR;
  const isCompleted = event.newCount >= event.target;
  const deltaLabel = event.delta >= 0 ? `+${event.delta}` : `${event.delta}`;

  return (
    <div className="rounded-2xl border border-slate-900/80 bg-[#111a24] px-4 py-3">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 text-sm font-semibold text-slate-100 flex-shrink-0"
          style={{
            backgroundColor: `${color}22`,
            color,
            borderColor: `${color}55`,
          }}
        >
          {Icon ? (
            <Icon className="h-4 w-4" />
          ) : (
            (event.goalTitle.trim()[0] ?? '?')
          )}
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-base font-semibold text-slate-50 truncate">
              {event.goalTitle}
            </p>
            <span className="text-xs text-slate-500 whitespace-nowrap">{timeLabel}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
            <span className="text-emerald-200">{deltaLabel}</span>
            <span className="text-slate-500">
              New total: {event.newCount}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-400">
        <span className="text-base font-semibold text-slate-100">
          {event.newCount} / {event.target} times
        </span>
        <span
          className={
            isCompleted ? 'font-semibold text-emerald-300' : 'text-slate-400'
          }
        >
          {completionPercent}% complete
        </span>
      </div>
      <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full transition-[width] duration-500 ${
            isCompleted ? 'bg-emerald-400' : 'bg-sky-400/80'
          }`}
          style={{ width: `${completionPercent}%` }}
        />
      </div>
    </div>
  );
}

