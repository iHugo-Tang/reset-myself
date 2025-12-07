import { and, desc, eq, inArray } from 'drizzle-orm';
import { getDb, type EnvWithD1 } from './client';
import { goalCompletions, goals, type Goal, type GoalCompletion } from '../../drizzle/schema';

export type HeatmapDay = {
	date: string;
	count: number;
	target: number;
};

export type GoalWithStats = Goal & {
	streak: number;
	totalCompletedDays: number;
	heatmap: HeatmapDay[];
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10); // YYYY-MM-DD UTC

const buildHeatmap = (completions: GoalCompletion[], days: number, target: number): HeatmapDay[] => {
	const byDate = new Map<string, number>();
	for (const c of completions) {
		byDate.set(c.date, c.count);
	}

	const today = new Date();
	const start = new Date();
	start.setUTCDate(today.getUTCDate() - (days - 1));

	const heatmap: HeatmapDay[] = [];
	for (let i = 0; i < days; i++) {
		const d = new Date(start);
		d.setUTCDate(start.getUTCDate() + i);
		const dateKey = formatDate(d);
		heatmap.push({ date: dateKey, count: byDate.get(dateKey) ?? 0, target });
	}

	return heatmap;
};

const computeStreak = (completions: GoalCompletion[]): number => {
	const completionDates = new Map<string, number>();
	for (const completion of completions) {
		completionDates.set(completion.date, completion.count);
	}

	let streak = 0;
	const cursor = new Date();

	// 连续天数：从今天开始向前检查，直到遇到未完成的日期
	while (true) {
		const key = formatDate(cursor);
		const count = completionDates.get(key) ?? 0;

		if (count > 0) {
			streak += 1;
			cursor.setUTCDate(cursor.getUTCDate() - 1);
		} else {
			break;
		}
	}

	return streak;
};

export const getDashboardData = async (env: EnvWithD1, days = 90): Promise<GoalWithStats[]> => {
	const db = getDb(env);
	const goalRows = await db.select().from(goals).orderBy(desc(goals.createdAt));

	if (!goalRows.length) return [];

	const goalIds = goalRows.map((g) => g.id);
	const allCompletions = await db
		.select()
		.from(goalCompletions)
		.where(inArray(goalCompletions.goalId, goalIds))
		.orderBy(goalCompletions.date);

	const byGoal = new Map<number, GoalCompletion[]>();
	for (const completion of allCompletions) {
		const current = byGoal.get(completion.goalId) ?? [];
		current.push(completion);
		byGoal.set(completion.goalId, current);
	}

	return goalRows.map((goal) => {
		const completions = byGoal.get(goal.id) ?? [];
		return {
			...goal,
			streak: computeStreak(completions),
			totalCompletedDays: completions.filter((c) => c.count > 0).length,
			heatmap: buildHeatmap(completions, days, goal.dailyTargetCount),
		};
	});
};

export const createGoal = async (
	env: EnvWithD1,
	payload: { title: string; description?: string; dailyTargetCount: number },
) => {
	const db = getDb(env);
	const [inserted] = await db
		.insert(goals)
		.values({
			title: payload.title,
			description: payload.description ?? '',
			dailyTargetCount: payload.dailyTargetCount,
		})
		.returning();

	return inserted;
};

export const updateGoalTarget = async (env: EnvWithD1, goalId: number, dailyTargetCount: number) => {
	const db = getDb(env);
	await db
		.update(goals)
		.set({
			dailyTargetCount,
			updatedAt: new Date().toISOString(),
		})
		.where(eq(goals.id, goalId));
};

export const recordGoalCompletion = async (
	env: EnvWithD1,
	goalId: number,
	count: number,
	date: string = formatDate(new Date()),
) => {
	const db = getDb(env);
	const [existing] = await db
		.select()
		.from(goalCompletions)
		.where(and(eq(goalCompletions.goalId, goalId), eq(goalCompletions.date, date)))
		.limit(1);

	if (existing) {
		await db
			.update(goalCompletions)
			.set({ count: existing.count + count })
			.where(and(eq(goalCompletions.goalId, goalId), eq(goalCompletions.date, date)));
	} else {
		await db.insert(goalCompletions).values({
			goalId,
			date,
			count,
		});
	}
};
