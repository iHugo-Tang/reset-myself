'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import type { GoalWithStats } from '@/db/goals';
import { GoalActionsMenu } from './GoalActionsMenu';
import { GoalHeatmap } from './GoalHeatmap';
import { DEFAULT_COLOR, DEFAULT_ICON, ICON_MAP } from './iconOptions';

export function GoalCard({ goal, today }: { goal: GoalWithStats; today: string }) {
  const completionRate = goal.heatmap.filter((day) => day.count > 0).length;
  const Icon = ICON_MAP[goal.icon] ?? ICON_MAP[DEFAULT_ICON];
  const color = goal.color || DEFAULT_COLOR;

  const router = useRouter();
  const [isPendingLog, startTransitionLog] = useTransition();
  const [isPendingTarget, startTransitionTarget] = useTransition();

  async function onLogCompletion(formData: FormData) {
    const count = formData.get('count');
    const date = formData.get('date');

    startTransitionLog(async () => {
      await fetch(`/api/goals/${goal.id}/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: Number(count), date }),
      });
      router.refresh();
    });
  }

  async function onUpdateTarget(formData: FormData) {
    const dailyTargetCount = formData.get('dailyTargetCount');

    startTransitionTarget(async () => {
      await fetch(`/api/goals/${goal.id}/target`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyTargetCount: Number(dailyTargetCount) }),
      });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-2xl ring-2 ring-slate-100"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {Icon ? <Icon className="h-5 w-5" /> : null}
          </span>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900">
                {goal.title}
              </h3>
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold shadow-sm"
                style={{ backgroundColor: `${color}22`, color }}
              >
                Daily target: {goal.dailyTargetCount} times
              </span>
            </div>
            <p className="text-sm text-slate-600">
              {goal.description || 'No description'}
            </p>
          </div>
        </div>
        <GoalActionsMenu goal={goal} />
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm text-slate-700 md:grid-cols-3">
        <Stat label="Streak" value={`${goal.streak} days`} />
        <Stat
          label="Completed days"
          value={`${goal.totalCompletedDays} days`}
        />
        <Stat
          label="Past 90 days"
          value={`${completionRate}/${goal.heatmap.length}`}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Heatmap</span>
        </div>
        <GoalHeatmap heatmap={goal.heatmap} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <form
          action={onLogCompletion}
          className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">
              Completions today
            </label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                type="number"
                name="count"
                min={1}
                defaultValue={1}
                className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-emerald-200 outline-none focus:ring-2"
              />
              <button
                type="submit"
                disabled={isPendingLog}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold whitespace-nowrap text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-70 flex items-center gap-2"
              >
                {isPendingLog && <Loader2 className="h-4 w-4 animate-spin" />}
                Log
              </button>
            </div>
            <input
              type="date"
              name="date"
              defaultValue={today}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-emerald-200 outline-none focus:ring-2"
            />
          </div>
        </form>

        <form
          action={onUpdateTarget}
          className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">
              Update daily target count
            </label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                type="number"
                name="dailyTargetCount"
                min={1}
                defaultValue={goal.dailyTargetCount}
                className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-emerald-200 outline-none focus:ring-2"
              />
              <button
                type="submit"
                disabled={isPendingTarget}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold whitespace-nowrap text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-70 flex items-center gap-2"
              >
                {isPendingTarget && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
