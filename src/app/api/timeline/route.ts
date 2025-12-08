import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse, type NextRequest } from 'next/server';
import { getTimelineData } from '@/db/goals';
import type { EnvWithD1 } from '@/db/client';

const getEnv = () => getCloudflareContext().env as EnvWithD1;

export async function GET(request: NextRequest) {
	const url = new URL(request.url);
	const daysRaw = Number(url.searchParams.get('days'));
	const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.floor(daysRaw) : 30;

	try {
		const data = await getTimelineData(getEnv(), days);
		return NextResponse.json({ success: true, data });
	} catch (error) {
		console.error('GET /api/timeline error', error);
		return NextResponse.json({ success: false, message: '获取时间线失败' }, { status: 500 });
	}
}
