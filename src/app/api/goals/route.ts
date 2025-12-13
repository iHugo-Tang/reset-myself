import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse, type NextRequest } from 'next/server';
import { createGoal, getDashboardData } from '@/db/goals';
import type { EnvWithD1 } from '@/db/client';
import { resolveRequestTimeSettings } from '@/utils/time';

const getEnv = () => getCloudflareContext().env as EnvWithD1;

export async function GET(req: NextRequest) {
  try {
    const time = resolveRequestTimeSettings({
      cookies: req.cookies,
      cookieHeader: req.headers.get('cookie'),
    });
    const data = await getDashboardData(getEnv(), 90, {
      offsetMinutes: time.offsetMinutes,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/goals error', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let title = '';
  let description = '';
  let dailyTargetRaw = 1;
  let icon = '';
  let color = '';

  if (isJson) {
    const json = (await req.json()) as {
      title?: string;
      description?: string;
      dailyTargetCount?: number | string;
      icon?: string;
      color?: string;
    };
    title = (json.title || '').trim();
    description = (json.description || '').trim();
    dailyTargetRaw = Number(json.dailyTargetCount ?? 1);
    icon = (json.icon || '').trim();
    color = (json.color || '').trim();
  } else {
    const formData = await req.formData();
    title = (formData.get('title') || '').toString().trim();
    description = (formData.get('description') || '').toString().trim();
    dailyTargetRaw = Number(formData.get('dailyTargetCount') ?? 1);
    icon = (formData.get('icon') || '').toString().trim();
    color = (formData.get('color') || '').toString().trim();
  }

  const dailyTargetCount =
    Number.isFinite(dailyTargetRaw) && dailyTargetRaw > 0
      ? Math.floor(dailyTargetRaw)
      : 1;

  const time = resolveRequestTimeSettings({
    cookies: req.cookies,
    cookieHeader: req.headers.get('cookie'),
  });

  const redirect = (suffix: string) =>
    NextResponse.redirect(new URL(`/admin/dashboard${suffix}`, req.url));

  if (!title) {
    return isJson
      ? NextResponse.json(
          { success: false, error: 'title_required' },
          { status: 400 }
        )
      : redirect('?error=title_required');
  }

  try {
    await createGoal(
      getEnv(),
      {
        title,
        description,
        dailyTargetCount,
        icon: icon || undefined,
        color: color || undefined,
      },
      { offsetMinutes: time.offsetMinutes }
    );
    return isJson ? NextResponse.json({ success: true }) : redirect('');
  } catch (error) {
    console.error('POST /api/goals error', error);
    return isJson
      ? NextResponse.json(
          { success: false, error: 'create_failed' },
          { status: 500 }
        )
      : redirect('?error=create_failed');
  }
}
