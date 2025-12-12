import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse, type NextRequest } from 'next/server';
import { updateGoalTarget } from '@/db/goals';
import type { EnvWithD1 } from '@/db/client';

const getEnv = () => getCloudflareContext().env as EnvWithD1;

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	const goalId = Number(id);
	const formData = await request.formData();
	const dailyTargetRaw = Number(formData.get('dailyTargetCount') ?? 1);
	const dailyTargetCount =
		Number.isFinite(dailyTargetRaw) && dailyTargetRaw > 0
			? Math.floor(dailyTargetRaw)
			: 1;

	const redirect = (suffix: string) =>
		NextResponse.redirect(new URL(`/admin/dashboard${suffix}`, request.url));

	if (!goalId) {
		return redirect('?error=missing_goal_id');
	}

	try {
		await updateGoalTarget(getEnv(), goalId, dailyTargetCount);
		return redirect('');
	} catch (error) {
		console.error('POST /api/goals/[id]/target error', error);
		return redirect('?error=update_target_failed');
	}
}
