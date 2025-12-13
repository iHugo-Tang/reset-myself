import { CheckCircle2 } from 'lucide-react';
import { TimelineSummaryEvent } from '@/db/goals';
import { GoalRow } from './GoalRow';
import { formatEventTime } from '@/utils/time';

export function GoalsEventCard({
  event,
  timeZone,
}: {
  event: TimelineSummaryEvent;
  timeZone: string;
}) {
  const items = event.items;
  const timeLabel = formatEventTime(event.createdAt, timeZone);
  const badgeClass = event.allGoalsCompleted
    ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/40'
    : 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/40';
  const badgeLabel = event.allGoalsCompleted ? 'All goals met' : 'In progress';

  return (
    <div className="space-y-3 rounded-2xl border border-slate-900/80 bg-[#0f1722] px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-slate-100">
          <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden />
          <span className="text-sm font-semibold">Daily summary</span>
          <span className="text-xs text-slate-500">{timeLabel}</span>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${badgeClass}`}
        >
          {badgeLabel}
        </span>
      </div>
      {!items.length ? (
        <p className="text-sm text-slate-500">No goal records for this day</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <GoalRow key={item.goalId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

