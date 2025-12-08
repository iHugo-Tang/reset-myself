import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextResponse, type NextRequest } from 'next/server';
import { deleteGoal } from '@/db/goals';
import type { EnvWithD1 } from '@/db/client';

const getEnv = () => getCloudflareContext().env as EnvWithD1;

const redirectToDashboard = (request: NextRequest, suffix: string) =>
	NextResponse.redirect(new URL(`/admin/dashboard${suffix}`, request.url));

const handleDelete = async (request: NextRequest, params: Promise<{ id: string }>) => {
	const { id } = await params;
	const goalId = Number(id);

	if (!goalId) {
		return redirectToDashboard(request, '?error=missing_goal_id');
	}

	try {
		await deleteGoal(getEnv(), goalId);
		return redirectToDashboard(request, '');
	} catch (error) {
		console.error('DELETE /api/goals/[id] error', error);
		return redirectToDashboard(request, '?error=delete_goal_failed');
	}
};

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	return handleDelete(request, context.params);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	return handleDelete(request, context.params);
}
