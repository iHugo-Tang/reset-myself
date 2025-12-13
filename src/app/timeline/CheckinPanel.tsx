'use client';

import { CompleteButton } from './CompleteButton';
import type { TimelineDay, TimelineItem } from '@/db/goals';

type Props = {
  day: TimelineDay;
  today: string;
};

const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatDateLabel = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return `${date} · ${weekday[d.getUTCDay()]}`;
};

const isGoalCompleted = (item: TimelineItem) => item.count >= item.target;

export function CheckinPanel({ day, today }: Props) {
  const total = day.items.length;
  const finished = day.items.filter(isGoalCompleted).length;
  const [dateLabel, weekdayLabel] = formatDateLabel(day.date).split(' · ');

  return (
    <section className="panel-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold tracking-[0.2em] text-slate-500/80 uppercase">
            Today&apos;s Check-in
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-col leading-tight">
              <h2 className="text-lg font-semibold text-slate-50">
                {dateLabel} · {weekdayLabel}
              </h2>
            </div>
          </div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-800 bg-[#0f1722] text-sm font-semibold text-slate-200">
          {finished}/{total}
        </div>
      </div>

      <div className="mt-4 grid gap-2.5">
        {day.items.map((item) => {
          const completed = isGoalCompleted(item);
          const completionPercent = Math.min(
            100,
            Math.round(Math.min(1, item.count / Math.max(1, item.target)) * 100)
          );

          return (
            <div
              key={item.goalId}
              className="flex items-center gap-3 rounded-2xl border border-slate-900/80 bg-[#111a24] px-4 py-3"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-base font-semibold text-slate-50">
                    {item.title}
                  </p>

                  <CompleteButton
                    goalId={item.goalId}
                    date={today}
                    isCompleted={completed}
                    variant="compact"
                    labels={{
                      idle: 'Check in',
                      loading: 'Working...',
                      completed: 'Done',
                    }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                  <span className="font-semibold text-slate-100">
                    {item.count} / {item.target} times
                  </span>
                  <span
                    className={
                      completed
                        ? 'font-semibold text-emerald-300'
                        : 'text-slate-400'
                    }
                  >
                    {completionPercent}% complete
                  </span>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full transition-[width] duration-500 ${completed ? 'bg-emerald-400' : 'bg-sky-400/80'
                      }`}
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default CheckinPanel;
