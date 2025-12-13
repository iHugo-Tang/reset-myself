import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse, type NextRequest } from 'next/server';
import { deleteGoal, getDashboardData, updateGoal } from '@/db/goals';
import type { EnvWithD1 } from '@/db/client';
import { resolveRequestTimeSettings } from '@/utils/time';
import { requireUserIdFromRequest } from '@/lib/auth/user';

const getEnv = () => getCloudflareContext().env as EnvWithD1;

const redirectToDashboard = (request: NextRequest, suffix: string) =>
  NextResponse.redirect(new URL(`/admin/dashboard${suffix}`, request.url));

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const goalId = Number(id);
  if (!goalId) {
    return NextResponse.json(
      { success: false, message: 'missing_goal_id' },
      { status: 400 }
    );
  }

  try {
    const userId = await requireUserIdFromRequest(request);
    const time = resolveRequestTimeSettings({
      cookies: request.cookies,
      cookieHeader: request.headers.get('cookie'),
    });
    const goals = await getDashboardData(getEnv(), userId, 90, {
      offsetMinutes: time.offsetMinutes,
    });
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) {
      return NextResponse.json(
        { success: false, message: 'goal_not_found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: goal });
  } catch (error) {
    console.error('GET /api/goals/[id] error', error);
    if (error instanceof Error && error.message === 'unauthorized') {
      return NextResponse.json(
        { success: false, message: 'unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, message: 'Failed to fetch goal' },
      { status: 500 }
    );
  }
}

const handleDelete = async (
  request: NextRequest,
  params: Promise<{ id: string }>
) => {
  const { id } = await params;
  const goalId = Number(id);
  const wantsJson =
    request.method === 'DELETE' ||
    request.headers.get('accept')?.includes('application/json') ||
    request.headers.get('content-type') === 'application/json';

  if (!goalId) {
    if (wantsJson) {
      return NextResponse.json(
        { success: false, message: 'missing_goal_id' },
        { status: 400 }
      );
    }
    return redirectToDashboard(request, '?error=missing_goal_id');
  }

  try {
    const userId = await requireUserIdFromRequest(request);
    const time = resolveRequestTimeSettings({
      cookies: request.cookies,
      cookieHeader: request.headers.get('cookie'),
    });
    await deleteGoal(getEnv(), userId, goalId, {
      offsetMinutes: time.offsetMinutes,
    });
    if (wantsJson) {
      return NextResponse.json({ success: true });
    }
    return redirectToDashboard(request, '');
  } catch (error) {
    console.error('DELETE /api/goals/[id] error', error);
    if (error instanceof Error && error.message === 'unauthorized') {
      return wantsJson
        ? NextResponse.json(
            { success: false, message: 'unauthorized' },
            { status: 401 }
          )
        : NextResponse.redirect(new URL('/login', request.url));
    }
    if (wantsJson) {
      return NextResponse.json(
        { success: false, message: 'delete_goal_failed' },
        { status: 500 }
      );
    }
    return redirectToDashboard(request, '?error=delete_goal_failed');
  }
};

const handleUpdate = async (
  request: NextRequest,
  params: Promise<{ id: string }>
) => {
  const { id } = await params;
  const goalId = Number(id);

  if (!goalId) {
    return NextResponse.json(
      { success: false, message: 'missing_goal_id' },
      { status: 400 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // ignore parse errors; will validate below
  }

  const title = typeof body.title === 'string' ? body.title : undefined;
  const description =
    typeof body.description === 'string' ? body.description : undefined;
  const icon = typeof body.icon === 'string' ? body.icon : undefined;
  const color = typeof body.color === 'string' ? body.color : undefined;
  const dailyTargetCount =
    body.dailyTargetCount !== undefined
      ? Number(body.dailyTargetCount)
      : undefined;

  try {
    const userId = await requireUserIdFromRequest(request);
    await updateGoal(getEnv(), userId, goalId, {
      title,
      description,
      dailyTargetCount,
      icon,
      color,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/goals/[id] error', error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'unknown_error';

    const friendly =
      message === 'title_required'
        ? 'Title is required'
        : message === 'daily_target_invalid'
          ? 'Daily target must be a positive integer'
          : message === 'goal_not_found'
            ? 'Goal not found'
            : message === 'unauthorized'
              ? 'Unauthorized'
          : message;

    const status =
      message === 'goal_not_found'
        ? 404
        : message === 'unauthorized'
          ? 401
          : 400;

    return NextResponse.json(
      { success: false, message: friendly },
      { status }
    );
  }
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleDelete(request, context.params);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleDelete(request, context.params);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, context.params);
}
