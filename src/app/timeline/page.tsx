import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import CheckinPanel from '@/app/timeline/CheckinPanel';
import TimelineComposer from '@/app/timeline/TimelineComposer';
import { StreakBadge } from '@/app/timeline/StreakBadge';
import { HeatmapCard } from '@/app/timeline/HeatmapCard';
import TimelineFeed from '@/app/timeline/TimelineFeed';

import {
  getTimelineEventsInfinite,
  getTimelineStats,
  getTodayStatus,
  type TimelineDay,
} from '@/db/goals';
import type { EnvWithD1 } from '@/db/client';
import { resolveRequestTimeSettings, toDateKey } from '@/utils/time';
import { requireUserIdFromServer } from '@/lib/auth/user';

export const dynamic = 'force-dynamic';

const getEnv = () => getCloudflareContext().env as EnvWithD1;

export const metadata: Metadata = {
  title: 'Timeline | Reset Myself',
  description: 'Reset Myself goal check-in timeline',
};

export default async function TimelinePage() {
  const userId = await requireUserIdFromServer();
  const headerList = await headers();
  const cookieStore = await cookies();
  const timeSettings = resolveRequestTimeSettings({
    cookies: cookieStore,
    cookieHeader: headerList.get('cookie'),
  });
  const offsetMinutes = timeSettings.offsetMinutes ?? 0;

  const env = getEnv();

  const [eventsData, stats, todayItems] = await Promise.all([
    getTimelineEventsInfinite(env, userId, 20),
    getTimelineStats(env, userId, 370, { offsetMinutes }),
    getTodayStatus(env, userId, { offsetMinutes }),
  ]);

  const todayKey = toDateKey(Date.now(), offsetMinutes);

  const todayDay: TimelineDay = {
    date: todayKey,
    items: todayItems,
    allGoalsCompleted:
      todayItems.length > 0 && todayItems.every((i) => i.count >= i.target),
    events: [],
  };

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 lg:gap-8 lg:px-8">
        <header className="flex items-center justify-between rounded-3xl border border-slate-900/70 bg-linear-to-r from-[#0c121a] via-[#0f1724] to-[#0c121a] p-4 shadow-[0_18px_80px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1017] shadow-inner ring-1 ring-slate-900/70">
              <Image
                src="/logo.png"
                alt="Reset Myself logo"
                width={56}
                height={56}
                className="h-full w-full object-cover"
                priority
              />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-slate-100">
                RESET MYSELF
              </p>
              <p className="text-sm text-slate-500">
                Stay on rhythm, focus on today
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="rounded-2xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-sm font-semibold text-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.35)] transition hover:border-slate-700 hover:bg-slate-900"
            >
              Admin
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3 lg:items-start lg:gap-8">
          <div className="space-y-4 lg:order-2 lg:col-span-1">
            <StreakBadge streak={stats.streak} />
            <HeatmapCard heatmap={stats.heatmap} offsetMinutes={offsetMinutes} />
            {todayItems.length > 0 ? (
              <CheckinPanel day={todayDay} today={todayKey} />
            ) : null}
          </div>

          <div className="space-y-6 lg:order-1 lg:col-span-2">
            <TimelineComposer />
            <TimelineFeed
              initialEvents={eventsData.events}
              initialNextCursor={eventsData.nextCursor}
              timeZone={timeSettings.timeZone}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
