import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse, type NextRequest } from 'next/server';
import { recordGoalCompletion } from '@/db/goals';
import type { EnvWithD1 } from '@/db/client';
import { resolveRequestTimeSettings, toDateKey } from '@/utils/time';

const getEnv = () => getCloudflareContext().env as EnvWithD1;

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	const goalId = Number(id);
	const formData = await request.formData();
	const countRaw = Number(formData.get('count') ?? 1);
	const date = (formData.get('date') || '').toString().trim();
	const count =
		Number.isFinite(countRaw) && countRaw > 0 ? Math.floor(countRaw) : 1;
	const time = resolveRequestTimeSettings({
		cookies: request.cookies,
		cookieHeader: request.headers.get('cookie'),
	});
	const targetDate = date || toDateKey(Date.now(), time.offsetMinutes);
	const wantsJson = request.headers.get('accept')?.includes('application/json');

	const redirect = (suffix: string) =>
		NextResponse.redirect(new URL(`/admin/dashboard${suffix}`, request.url));
	const json = (body: object, status = 200) =>
		NextResponse.json(body, { status });

	if (!goalId) {
		return wantsJson
			? json({ ok: false, error: 'missing_goal_id' }, 400)
			: redirect('?error=missing_goal_id');
	}

	try {
		await recordGoalCompletion(getEnv(), goalId, count, targetDate, {
			offsetMinutes: time.offsetMinutes,
		});
		return wantsJson ? json({ ok: true }) : redirect('');
	} catch (error) {
		console.error('POST /api/goals/[id]/completion error', error);
		return wantsJson
			? json({ ok: false, error: 'record_completion_failed' }, 500)
			: redirect('?error=record_completion_failed');
	}
}
