import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse, type NextRequest } from 'next/server';
import { createTimelineNote } from '@/db/goals';
import type { EnvWithD1 } from '@/db/client';
import { resolveRequestTimeSettings } from '@/utils/time';
import { requireUserIdFromRequest } from '@/lib/auth/user';

const getEnv = () => getCloudflareContext().env as EnvWithD1;
const MAX_LEN = 280;

/* c8 ignore start */
const parseContent = async (req: NextRequest): Promise<string> => {
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const json = (await req.json().catch(() => null)) as {
      content?: unknown;
    } | null;
    return (json?.content ?? '').toString();
  }

  const form = await req.formData().catch(() => null);
  return (form?.get('content') ?? '').toString();
};
/* c8 ignore end */

export async function POST(req: NextRequest) {
  const wantsJson =
    req.headers.get('accept')?.includes('application/json') ?? true;
  const reply = (body: object, status = 200) =>
    NextResponse.json(body, { status });
  const time = resolveRequestTimeSettings({
    cookies: req.cookies,
    cookieHeader: req.headers.get('cookie'),
  });

  const raw = (await parseContent(req)).trim();

  if (!raw) {
    return reply({ success: false, message: 'Content cannot be empty' }, 400);
  }

  if (raw.length > MAX_LEN) {
    return reply(
      {
        success: false,
        message: `Content must be ${MAX_LEN} characters or less`,
      },
      400
    );
  }

  try {
    const userId = await requireUserIdFromRequest(req);
    const note = await createTimelineNote(getEnv(), userId, raw, undefined, {
      offsetMinutes: time.offsetMinutes,
    });
    return wantsJson
      ? reply({ success: true, data: note })
      : NextResponse.redirect(new URL('/timeline', req.url));
  } catch (error) {
    console.error('POST /api/timeline/notes error', error);
    if (error instanceof Error && error.message === 'unauthorized') {
      return reply({ success: false, message: 'Unauthorized' }, 401);
    }
    return reply(
      { success: false, message: 'Unable to save. Please try again soon.' },
      500
    );
  }
}
