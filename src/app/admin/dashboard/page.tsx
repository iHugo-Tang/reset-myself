import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import type { GoalWithStats, HeatmapDay } from '@/db/goals';
import { GoalActionsMenu } from './GoalActionsMenu';
import {
  COLOR_OPTIONS,
  DEFAULT_COLOR,
  DEFAULT_ICON,
  ICON_MAP,
  ICON_OPTIONS,
} from './iconOptions';
import { resolveRequestTimeSettings, toDateKey } from '@/utils/time';

export const dynamic = 'force-dynamic';

const getBaseUrl = async () => {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const protocol =
    h.get('x-forwarded-proto') ??
    (host?.includes('localhost') || host?.includes('127.0.0.1')
      ? 'http'
      : 'https');
  return host ? `${protocol}://${host}` : '';
};

const fetchDashboardData = async (
  offsetMinutes: number,
  cookieHeader: string
): Promise<GoalWithStats[]> => {
  try {
    const baseUrl = await getBaseUrl();
    const res = await fetch(`${baseUrl}/api/goals?tz_offset=${offsetMinutes}`, {
      cache: 'no-store',
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: GoalWithStats[] };
    return json.data ?? [];
  } catch (error) {
    console.error('fetchDashboardData error', error);
    return [];
  }
};

export const metadata: Metadata = {
  title: 'Admin | Reset Goals',
  description: 'Goal management dashboard',
};

export default async function AdminDashboardPage() {
  const headerList = await headers();
  const cookieHeader = headerList.get('cookie') ?? '';
  const cookieStore = await cookies();
  const timeSettings = resolveRequestTimeSettings({
    cookies: cookieStore,
    cookieHeader,
  });
  const goals = await fetchDashboardData(
    timeSettings.offsetMinutes,
    cookieHeader
  );
  const today = toDateKey(Date.now(), timeSettings.offsetMinutes);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-sm tracking-[0.2em] text-slate-500 uppercase">
            Admin
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Goal dashboard
          </h1>
          <p className="text-sm text-slate-600">
            View goals, streaks, and heatmaps, plus create or update daily
            targets here.
          </p>
        </header>

        <CreateGoalForm />

        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Goal list</h2>
            <span className="text-sm text-slate-500">
              Heatmap for the last 90 days
            </span>
          </div>

          {goals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              No goals yet; create one to get started.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} today={today} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function CreateGoalForm() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Create a goal</h2>
      <p className="mt-1 text-sm text-slate-600">
        Add the name, description, and daily target count.
      </p>
      <form
        action="/api/goals"
        method="post"
        className="mt-4 grid gap-4 md:grid-cols-2"
      >
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Goal name</span>
          <input
            required
            name="title"
            placeholder="e.g., Daily reading"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-emerald-200 outline-none focus:ring-2"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">
            Daily target count
          </span>
          <input
            type="number"
            min={1}
            name="dailyTargetCount"
            defaultValue={1}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-emerald-200 outline-none focus:ring-2"
          />
        </label>

        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">
            Description (optional)
          </span>
          <textarea
            name="description"
            placeholder="Add notes or context"
            className="min-h-[96px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-emerald-200 outline-none focus:ring-2"
          />
        </label>

        <div className="grid gap-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">
            Choose an icon
          </span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ICON_OPTIONS.map((opt) => {
              const Icon = opt.Icon;
              return (
                <label key={opt.value} className="group relative block">
                  <input
                    type="radio"
                    name="icon"
                    value={opt.value}
                    defaultChecked={opt.value === DEFAULT_ICON}
                    className="peer sr-only"
                  />
                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition peer-checked:border-emerald-500 peer-checked:ring-1 peer-checked:ring-emerald-200 hover:border-emerald-300">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>{opt.label}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">
            Choose a color
          </span>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((color) => (
              <label key={color} className="relative inline-flex">
                <input
                  type="radio"
                  name="color"
                  value={color}
                  defaultChecked={color === DEFAULT_COLOR}
                  className="peer sr-only"
                />
                <span
                  className="h-10 w-10 rounded-full border-2 border-transparent shadow-inner transition peer-focus:outline-2 peer-focus:outline-offset-2 peer-focus:outline-emerald-300"
                  style={{ backgroundColor: color }}
                />
                <span className="absolute inset-0 hidden rounded-full border-2 border-white ring-2 ring-emerald-500 peer-checked:block" />
              </label>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Create goal
          </button>
        </div>
      </form>
    </section>
  );
}

function GoalCard({ goal, today }: { goal: GoalWithStats; today: string }) {
  const completionRate = goal.heatmap.filter((day) => day.count > 0).length;
  const Icon = ICON_MAP[goal.icon] ?? ICON_MAP[DEFAULT_ICON];
  const color = goal.color || DEFAULT_COLOR;

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
          <span>Darker means closer to or above the daily target</span>
        </div>
        <Heatmap heatmap={goal.heatmap} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <form
          action={`/api/goals/${goal.id}/completion`}
          method="post"
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
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold whitespace-nowrap text-white shadow-sm transition hover:bg-emerald-700"
              >
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
          action={`/api/goals/${goal.id}/target`}
          method="post"
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
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold whitespace-nowrap text-white shadow-sm transition hover:bg-slate-800"
              >
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

function Heatmap({ heatmap }: { heatmap: HeatmapDay[] }) {
  const columns = Math.ceil(heatmap.length / 7);

  return (
    <div
      className="grid gap-1"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {heatmap.map((day) => {
        const color = getColor(day);
        return (
          <div
            key={day.date}
            className={`h-3 w-3 rounded-[4px] ${color}`}
            title={`${day.date} | Completed ${day.count} / Target ${day.target}`}
          />
        );
      })}
    </div>
  );
}

const getColor = (day: HeatmapDay) => {
  if (day.count === 0) return 'bg-slate-200';
  const ratio = day.count / Math.max(1, day.target);
  if (ratio < 1) return 'bg-emerald-200';
  if (ratio < 1.5) return 'bg-emerald-400';
  return 'bg-emerald-600';
};
