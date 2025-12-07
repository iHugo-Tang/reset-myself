'use server';

import { revalidatePath } from 'next/cache';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { createGoal, recordGoalCompletion, updateGoalTarget } from '@/db/goals';
import type { EnvWithD1 } from '@/db/client';

const getEnv = () => getRequestContext().env as unknown as EnvWithD1;

export const createGoalAction = async (formData: FormData): Promise<void> => {
	const title = (formData.get('title') || '').toString().trim();
	const description = (formData.get('description') || '').toString().trim();
	const dailyTargetRaw = Number(formData.get('dailyTargetCount') ?? 1);

	if (!title) {
		return;
	}

	const dailyTargetCount = Number.isFinite(dailyTargetRaw) && dailyTargetRaw > 0 ? Math.floor(dailyTargetRaw) : 1;

	try {
		await createGoal(getEnv(), { title, description, dailyTargetCount });
		revalidatePath('/admin/dashboard');
	} catch (error) {
		console.error('createGoalAction error', error);
	}
};

export const updateGoalTargetAction = async (formData: FormData): Promise<void> => {
	const goalId = Number(formData.get('goalId'));
	const dailyTargetRaw = Number(formData.get('dailyTargetCount') ?? 1);
	const dailyTargetCount = Number.isFinite(dailyTargetRaw) && dailyTargetRaw > 0 ? Math.floor(dailyTargetRaw) : 1;

	if (!goalId) return;

	try {
		await updateGoalTarget(getEnv(), goalId, dailyTargetCount);
		revalidatePath('/admin/dashboard');
	} catch (error) {
		console.error('updateGoalTargetAction error', error);
	}
};

export const recordCompletionAction = async (formData: FormData): Promise<void> => {
	const goalId = Number(formData.get('goalId'));
	const countRaw = Number(formData.get('count') ?? 1);
	const date = (formData.get('date') || '').toString().trim();

	if (!goalId) return;

	const count = Number.isFinite(countRaw) && countRaw > 0 ? Math.floor(countRaw) : 1;
	const targetDate = date || new Date().toISOString().slice(0, 10);

	try {
		await recordGoalCompletion(getEnv(), goalId, count, targetDate);
		revalidatePath('/admin/dashboard');
	} catch (error) {
		console.error('recordCompletionAction error', error);
	}
};
