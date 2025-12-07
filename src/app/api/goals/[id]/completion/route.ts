import { NextResponse, type NextRequest } from 'next/server';
import { recordGoalCompletion } from '@/db/goals';
import type { EnvWithD1 } from '@/db/client';

const getEnv = () => process.env as unknown as EnvWithD1;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const goalId = Number(id);
	const formData = await request.formData();
	const countRaw = Number(formData.get('count') ?? 1);
	const date = (formData.get('date') || '').toString().trim();
	const count = Number.isFinite(countRaw) && countRaw > 0 ? Math.floor(countRaw) : 1;
	const targetDate = date || new Date().toISOString().slice(0, 10);

	const redirect = (suffix: string) => NextResponse.redirect(new URL(`/admin/dashboard${suffix}`, request.url));

	if (!goalId) {
		return redirect('?error=missing_goal_id');
	}

	try {
		await recordGoalCompletion(getEnv(), goalId, count, targetDate);
		return redirect('');
	} catch (error) {
		console.error('POST /api/goals/[id]/completion error', error);
		return redirect('?error=record_completion_failed');
	}
}
