import { PlusCircle, Trash2 } from 'lucide-react';
import { TimelineGoalLifecycleEvent } from '@/db/goals';
import { formatEventTime } from '@/utils/time';

export function GoalLifecycleCard({
  event,
  timeZone,
}: {
  event: TimelineGoalLifecycleEvent;
  timeZone: string;
}) {
  const timeLabel = formatEventTime(event.createdAt, timeZone);
  const isCreated = event.type === 'goal_created';
  const Icon = isCreated ? PlusCircle : Trash2;
  const badgeClass = isCreated
    ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/40'
    : 'bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/40';
  const label = isCreated ? 'Goal created' : 'Goal deleted';

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-900/80 bg-[#101722] px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-slate-200 ring-1 ring-slate-800">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-semibold text-slate-50">{event.title}</p>
          <span className="text-xs text-slate-500">{timeLabel}</span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${badgeClass}`}
          >
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

