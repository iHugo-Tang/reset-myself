import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse, type NextRequest } from 'next/server';
import { createGoal, getDashboardData } from '@/db/goals';
import type { EnvWithD1 } from '@/db/client';
import { resolveRequestTimeSettings } from '@/utils/time';

const getEnv = () => getCloudflareContext().env as EnvWithD1;

export async function GET(req: NextRequest) {
	try {
		const time = resolveRequestTimeSettings({ cookies: req.cookies, cookieHeader: req.headers.get('cookie') });
		const data = await getDashboardData(getEnv(), 90, { offsetMinutes: time.offsetMinutes });
		return NextResponse.json({ success: true, data });
	} catch (error) {
		console.error('GET /api/goals error', error);
		return NextResponse.json({ success: false, message: '获取目标失败' }, { status: 500 });
	}
}

export async function POST(req: NextRequest) {
	const formData = await req.formData();
	const title = (formData.get('title') || '').toString().trim();
	const description = (formData.get('description') || '').toString().trim();
	const dailyTargetRaw = Number(formData.get('dailyTargetCount') ?? 1);
	const dailyTargetCount = Number.isFinite(dailyTargetRaw) && dailyTargetRaw > 0 ? Math.floor(dailyTargetRaw) : 1;
	const icon = (formData.get('icon') || '').toString().trim();
	const color = (formData.get('color') || '').toString().trim();

	const redirect = (suffix: string) => NextResponse.redirect(new URL(`/admin/dashboard${suffix}`, req.url));

	if (!title) {
		return redirect('?error=title_required');
	}

	try {
		await createGoal(getEnv(), {
			title,
			description,
			dailyTargetCount,
			icon: icon || undefined,
			color: color || undefined,
		});
		return redirect('');
	} catch (error) {
		console.error('POST /api/goals error', error);
		return redirect('?error=create_failed');
	}
}
