import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse, type NextRequest } from 'next/server';
import { getTimelineEventsInfinite, getTimelineStats } from '@/db/goals';
import type { EnvWithD1 } from '@/db/client';
import { resolveRequestTimeSettings } from '@/utils/time';
import { requireUserIdFromRequest } from '@/lib/auth/user';

const getEnv = () => getCloudflareContext().env as EnvWithD1;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const cursor = url.searchParams.get('cursor') ?? undefined;
  const limit = 20;

  try {
    const userId = await requireUserIdFromRequest(request);
    const { events, nextCursor } = await getTimelineEventsInfinite(
      getEnv(),
      userId,
      limit,
      cursor
    );

    let stats = null;
    if (!cursor) {
      // Only fetch stats on initial load
      const time = resolveRequestTimeSettings({
        cookies: request.cookies,
        cookieHeader: request.headers.get('cookie'),
      });
      stats = await getTimelineStats(getEnv(), userId, 90, {
        offsetMinutes: time.offsetMinutes,
      });
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
    if (error instanceof Error && error.message === 'unauthorized') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, message: 'Failed to fetch timeline' },
      { status: 500 }
    );
  }
}
