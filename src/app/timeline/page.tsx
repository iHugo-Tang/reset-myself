import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';

import CheckinPanel from '@/app/timeline/CheckinPanel';
import TimelineComposer from '@/app/timeline/TimelineComposer';
import { StreakBadge } from '@/app/timeline/StreakBadge';
import { HeatmapCard } from '@/app/timeline/HeatmapCard';
import { DayCard } from '@/app/timeline/DayCard';

import type { TimelineData } from '@/db/goals';
import { resolveRequestTimeSettings, toDateKey } from '@/utils/time';

export const dynamic = 'force-dynamic';

const getBaseUrl = async () => {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const protocol =
    host?.includes('localhost') || host?.includes('127.0.0.1')
      ? 'http'
      : (h.get('x-forwarded-proto') ?? 'https');
  return host ? `${protocol}://${host}` : '';
};

const fetchTimelineData = async (
  offsetMinutes: number
): Promise<TimelineData> => {
  try {
    const baseUrl = await getBaseUrl();
    const headerList = await headers();
    const cookieHeader = headerList.get('cookie') ?? '';
    const res = await fetch(
      `${baseUrl}/api/timeline?tz_offset=${offsetMinutes}`,
      {
        cache: 'no-store',
        headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      }
    );
    if (!res.ok) return { days: [], streak: 0, heatmap: [] };
    const json = (await res.json()) as { data?: TimelineData };
    return json.data ?? { days: [], streak: 0, heatmap: [] };
  } catch (error) {
    console.error('fetchTimelineData error', error);
    return { days: [], streak: 0, heatmap: [] };
  }
};

export const metadata: Metadata = {
  title: 'Timeline | Reset Myself',
  description: 'Reset Myself goal check-in timeline',
};

export default async function TimelinePage() {
  const headerList = await headers();
  const cookieStore = await cookies();
  const timeSettings = resolveRequestTimeSettings({
    cookies: cookieStore,
    cookieHeader: headerList.get('cookie'),
  });
  const timeline = await fetchTimelineData(timeSettings.offsetMinutes);
  const today = toDateKey(Date.now(), timeSettings.offsetMinutes);
  const todayData = timeline.days.find((day) => day.date === today);

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
              Dashboard
            </Link>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3 lg:items-start lg:gap-8">
          <div className="space-y-4 lg:order-2 lg:col-span-1">
            <StreakBadge streak={timeline.streak} />
            <HeatmapCard
              heatmap={timeline.heatmap}
              offsetMinutes={timeSettings.offsetMinutes}
            />
            {todayData ? <CheckinPanel day={todayData} today={today} /> : null}
          </div>

          <div className="space-y-6 lg:order-1 lg:col-span-2">
            <TimelineComposer />
            {timeline.days.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-800 bg-[#0b1017] p-8 text-center text-slate-500">
                No data yet; create a goal and start checking in.
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-slate-900/70 bg-[#0b1017] shadow-[0_18px_80px_rgba(0,0,0,0.45)]">
                <div className="divide-y divide-slate-900/70">
                  {timeline.days.map((day, idx) => (
                    <DayCard
                      key={day.date}
                      day={day}
                      today={today}
                      isFirst={idx === 0}
                      timeZone={timeSettings.timeZone}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
