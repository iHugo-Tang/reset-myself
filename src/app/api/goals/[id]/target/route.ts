import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse, type NextRequest } from 'next/server';
import { updateGoalTarget } from '@/db/goals';
import type { EnvWithD1 } from '@/db/client';
import { requireUserIdFromRequest } from '@/lib/auth/user';

const getEnv = () => getCloudflareContext().env as EnvWithD1;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const goalId = Number(id);
  const contentType = request.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let dailyTargetRaw = 1;

  if (isJson) {
    const json = (await request.json()) as {
      dailyTargetCount?: number | string;
    };
    dailyTargetRaw = Number(json.dailyTargetCount ?? 1);
  } else {
    const formData = await request.formData();
    dailyTargetRaw = Number(formData.get('dailyTargetCount') ?? 1);
  }

  const dailyTargetCount =
    Number.isFinite(dailyTargetRaw) && dailyTargetRaw > 0
      ? Math.floor(dailyTargetRaw)
      : 1;

  const redirect = (suffix: string) =>
    NextResponse.redirect(new URL(`/admin/dashboard${suffix}`, request.url));
  const jsonResponse = (body: object, status = 200) =>
    NextResponse.json(body, { status });

  if (!goalId) {
    return isJson
      ? jsonResponse({ ok: false, error: 'missing_goal_id' }, 400)
      : redirect('?error=missing_goal_id');
  }

  try {
    const userId = await requireUserIdFromRequest(request);
    await updateGoalTarget(getEnv(), userId, goalId, dailyTargetCount);
    return isJson ? jsonResponse({ ok: true }) : redirect('');
  } catch (error) {
    console.error('POST /api/goals/[id]/target error', error);
    if (error instanceof Error && error.message === 'unauthorized') {
      return isJson
        ? jsonResponse({ ok: false, error: 'unauthorized' }, 401)
        : NextResponse.redirect(new URL('/login', request.url));
    }
    if (error instanceof Error && error.message === 'goal_not_found') {
      return isJson
        ? jsonResponse({ ok: false, error: 'goal_not_found' }, 404)
        : redirect('?error=goal_not_found');
    }
    return isJson
      ? jsonResponse({ ok: false, error: 'update_target_failed' }, 500)
      : redirect('?error=update_target_failed');
  }
}
