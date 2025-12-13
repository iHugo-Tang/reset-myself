import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse, type NextRequest } from 'next/server';
import { recordGoalCompletion } from '@/db/goals';
import type { EnvWithD1 } from '@/db/client';
import { resolveRequestTimeSettings, toDateKey } from '@/utils/time';
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

  let countRaw = 1;
  let dateRaw = '';

  if (isJson) {
    const json = (await request.json()) as {
      count?: number | string;
      date?: string;
    };
    countRaw = Number(json.count ?? 1);
    dateRaw = (json.date || '').toString();
  } else {
    const formData = await request.formData();
    countRaw = Number(formData.get('count') ?? 1);
    dateRaw = (formData.get('date') || '').toString();
  }

  const wantsJson =
    request.headers.get('accept')?.includes('application/json') || isJson;
  const count =
    Number.isFinite(countRaw) && countRaw > 0 ? Math.floor(countRaw) : 1;
  const date = dateRaw.trim();
  const time = resolveRequestTimeSettings({
    cookies: request.cookies,
    cookieHeader: request.headers.get('cookie'),
  });
  const redirect = (suffix: string) =>
    NextResponse.redirect(new URL(`/admin/dashboard${suffix}`, request.url));
  const jsonResponse = (body: object, status = 200) =>
    NextResponse.json(body, { status });
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return wantsJson
      ? jsonResponse({ ok: false, error: 'invalid_date' }, 400)
      : redirect('?error=invalid_date');
  }
  const targetDate = date || toDateKey(Date.now(), time.offsetMinutes);

  if (!goalId) {
    return wantsJson
      ? jsonResponse({ ok: false, error: 'missing_goal_id' }, 400)
      : redirect('?error=missing_goal_id');
  }

  try {
    const userId = await requireUserIdFromRequest(request);
    await recordGoalCompletion(getEnv(), userId, goalId, count, targetDate, {
      offsetMinutes: time.offsetMinutes,
    });
    return wantsJson ? jsonResponse({ ok: true }) : redirect('');
  } catch (error) {
    console.error('POST /api/goals/[id]/completion error', error);
    if (error instanceof Error && error.message === 'unauthorized') {
      return wantsJson
        ? jsonResponse({ ok: false, error: 'unauthorized' }, 401)
        : NextResponse.redirect(new URL('/login', request.url));
    }
    return wantsJson
      ? jsonResponse({ ok: false, error: 'record_completion_failed' }, 500)
      : redirect('?error=record_completion_failed');
  }
}
