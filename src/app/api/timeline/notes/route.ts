import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse, type NextRequest } from 'next/server';
import { createTimelineNote } from '@/db/goals';
import type { EnvWithD1 } from '@/db/client';

const getEnv = () => getCloudflareContext().env as EnvWithD1;
const MAX_LEN = 280;

const parseContent = async (req: NextRequest): Promise<string> => {
	const contentType = req.headers.get('content-type') || '';

	if (contentType.includes('application/json')) {
		const json = (await req.json().catch(() => null)) as { content?: unknown } | null;
		return (json?.content ?? '').toString();
	}

	const form = await req.formData().catch(() => null);
	return (form?.get('content') ?? '').toString();
};

export async function POST(req: NextRequest) {
	const wantsJson = req.headers.get('accept')?.includes('application/json') ?? true;
	const reply = (body: object, status = 200) => NextResponse.json(body, { status });

	const raw = (await parseContent(req)).trim();

	if (!raw) {
		return reply({ success: false, message: '内容不能为空' }, 400);
	}

	if (raw.length > MAX_LEN) {
		return reply({ success: false, message: `内容长度不能超过 ${MAX_LEN} 字` }, 400);
	}

	try {
		const note = await createTimelineNote(getEnv(), raw);
		return wantsJson
			? reply({ success: true, data: note })
			: NextResponse.redirect(new URL('/timeline', req.url));
	} catch (error) {
		console.error('POST /api/timeline/notes error', error);
		return reply({ success: false, message: '保存失败，请稍后重试' }, 500);
	}
}
