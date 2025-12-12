import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse, type NextRequest } from 'next/server';
import { getTimelineEventsInfinite, getTimelineStats } from '@/db/goals';
import { resolveRequestTimeSettings } from '@/utils/time';
import type { EnvWithD1 } from '@/db/client';

const getEnv = () => getCloudflareContext().env as EnvWithD1;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor') ?? undefined;
  const limit = 20;

  const tzOffsetRaw = Number(url.searchParams.get('tz_offset'));
  const cookieSettings = resolveRequestTimeSettings({
    cookies: request.cookies,
    cookieHeader: request.headers.get('cookie'),
  });
  const offsetMinutes = Number.isFinite(tzOffsetRaw)
    ? Math.round(tzOffsetRaw)
    : cookieSettings.offsetMinutes;

  try {
    const { events, nextCursor } = await getTimelineEventsInfinite(
      getEnv(),
      limit,
      cursor
    );

    let stats = null;
    if (!cursor) {
      // Only fetch stats on initial load
      stats = await getTimelineStats(getEnv(), 90, { offsetMinutes });
    }

    return NextResponse.json({
      success: true,
      data: {
        events,
        nextCursor,
        streak: stats?.streak ?? 0,
        heatmap: stats?.heatmap ?? [],
      },
    });
  } catch (error) {
    console.error('GET /api/timeline error', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch timeline' },
      { status: 500 }
    );
  }
}
