import { and, desc, eq, inArray } from 'drizzle-orm';
import { getDb, type EnvWithD1 } from './client';
import {
	goalCompletions,
	goals,
	timelineNotes,
	type Goal,
	type GoalCompletion,
	type TimelineNote,
} from '../../drizzle/schema';
import {
	addDaysUtc,
	buildDateKeys,
	DEFAULT_OFFSET_MINUTES,
	normalizeOffset,
	startOfDayUtcMs,
	toDateKey,
} from '@/utils/time';

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

export type TimelineItem = {
	goalId: number;
	title: string;
	target: number;
	count: number;
	icon: string;
	color: string;
};

export type TimelineDay = {
	date: string;
	items: TimelineItem[];
	allGoalsCompleted: boolean;
	events: TimelineEvent[];
};

export type TimelineHeatmapDay = {
	date: string;
	count: number;
};

export type TimelineData = {
	days: TimelineDay[];
	streak: number;
	heatmap: TimelineHeatmapDay[];
};

export type TimelineNoteEvent = {
	type: 'note';
	id: number;
	content: string;
	createdAt: string;
};

export type TimelineGoalEvent = {
	type: 'goals';
	items: TimelineItem[];
	allGoalsCompleted: boolean;
};

export type TimelineEvent = TimelineNoteEvent | TimelineGoalEvent;

type TimeContext = { offsetMinutes?: number };

const resolveTimeContext = (ctx?: TimeContext) => ({
	offsetMinutes: normalizeOffset(ctx?.offsetMinutes ?? DEFAULT_OFFSET_MINUTES),
});

const buildHeatmap = (completions: GoalCompletion[], days: number, target: number, offsetMinutes: number): HeatmapDay[] => {
	const byDate = new Map<string, number>();
	for (const c of completions) {
		byDate.set(c.date, c.count);
	}

	const todayUtcStart = startOfDayUtcMs(Date.now(), offsetMinutes);
	const startUtc = addDaysUtc(todayUtcStart, -(days - 1));

	const heatmap: HeatmapDay[] = [];
	for (let i = 0; i < days; i++) {
		const utcMs = addDaysUtc(startUtc, i);
		const dateKey = toDateKey(utcMs, offsetMinutes);
		heatmap.push({ date: dateKey, count: byDate.get(dateKey) ?? 0, target });
	}

	return heatmap;
};

const computeStreak = (completions: GoalCompletion[], offsetMinutes: number): number => {
	const completionDates = new Map<string, number>();
	for (const completion of completions) {
		completionDates.set(completion.date, completion.count);
	}

	let streak = 0;
	let cursorUtc = startOfDayUtcMs(Date.now(), offsetMinutes);

	// 连续天数：从今天开始向前检查，直到遇到未完成的日期（以用户时区为日界）
	while (true) {
		const key = toDateKey(cursorUtc, offsetMinutes);
		const count = completionDates.get(key) ?? 0;

		if (count > 0) {
			streak += 1;
			cursorUtc = addDaysUtc(cursorUtc, -1);
		} else {
			break;
		}
	}

	return streak;
};

const computeTimelineStreak = (
	goalsList: Goal[],
	byDate: Map<string, Map<number, number>>,
	offsetMinutes: number,
): number => {
	let streak = 0;
	let cursorUtc = startOfDayUtcMs(Date.now(), offsetMinutes);

	while (true) {
		const key = toDateKey(cursorUtc, offsetMinutes);
		const dateMap = byDate.get(key);

		const allCompleted = goalsList.every(
			(goal) => (dateMap?.get(goal.id) ?? 0) >= goal.dailyTargetCount,
		);

		if (!allCompleted) break;

		streak += 1;
		cursorUtc = addDaysUtc(cursorUtc, -1);
	}

	return streak;
};

const buildTimelineHeatmap = (
	byDate: Map<string, Map<number, number>>,
	days: number,
	offsetMinutes: number,
): TimelineHeatmapDay[] => {
	const todayUtcStart = startOfDayUtcMs(Date.now(), offsetMinutes);
	const startUtc = addDaysUtc(todayUtcStart, -(days - 1));

	const heatmap: TimelineHeatmapDay[] = [];
	for (let i = 0; i < days; i++) {
		const utcMs = addDaysUtc(startUtc, i);
		const dateKey = toDateKey(utcMs, offsetMinutes);
		const dateMap = byDate.get(dateKey);
		const totalCount = dateMap ? Array.from(dateMap.values()).reduce((sum, val) => sum + val, 0) : 0;
		heatmap.push({ date: dateKey, count: totalCount });
	}

	return heatmap;
};

export const getTimelineData = async (
	env: EnvWithD1,
	days = 91,
	ctx?: TimeContext,
): Promise<TimelineData> => {
	const { offsetMinutes } = resolveTimeContext(ctx);
	const db = getDb(env);
	const goalRows = await db.select().from(goals).orderBy(desc(goals.createdAt));
	const goalIds = goalRows.map((g) => g.id);

	const todayKey = toDateKey(startOfDayUtcMs(Date.now(), offsetMinutes), offsetMinutes);

	const completions = goalIds.length
		? await db
				.select()
				.from(goalCompletions)
				.where(inArray(goalCompletions.goalId, goalIds))
				.orderBy(goalCompletions.date)
		: [];

	const byDate = new Map<string, Map<number, number>>();
	for (const completion of completions) {
		const dateMap = byDate.get(completion.date) ?? new Map<number, number>();
		dateMap.set(completion.goalId, (dateMap.get(completion.goalId) ?? 0) + completion.count);
		byDate.set(completion.date, dateMap);
	}

	const dates: string[] = buildDateKeys(days, offsetMinutes, startOfDayUtcMs(Date.now(), offsetMinutes));

	const notes =
		(await db
			.select()
			.from(timelineNotes)
			.where(inArray(timelineNotes.date, dates))
			.orderBy(desc(timelineNotes.createdAt))) ?? [];

	const notesByDate = new Map<string, TimelineNote[]>();
	for (const note of notes) {
		const list = notesByDate.get(note.date) ?? [];
		list.push(note);
		notesByDate.set(note.date, list);
	}

	const parseTs = (value: string, fallback: string) => {
		const parsed = Date.parse(value);
		return Number.isNaN(parsed) ? Date.parse(fallback) : parsed;
	};

	const daysData = dates
		.map((date) => {
			const dateMap = byDate.get(date) ?? new Map<number, number>();
			const items = goalRows
				.map((goal) => ({
					goalId: goal.id,
					title: goal.title,
					target: goal.dailyTargetCount,
					count: dateMap.get(goal.id) ?? 0,
					icon: goal.icon,
					color: goal.color,
				}))
				.filter((item) => date === todayKey || item.count > 0);

			const dateNotes = notesByDate.get(date) ?? [];
			const allGoalsCompleted =
				goalRows.length > 0 &&
				goalRows.every((goal) => (dateMap.get(goal.id) ?? 0) >= goal.dailyTargetCount);

			const noteEvents: TimelineNoteEvent[] = dateNotes.map((note) => ({
				type: 'note',
				id: note.id,
				content: note.content,
				createdAt: note.createdAt,
			}));

			const events: TimelineEvent[] = [...noteEvents];
			if (items.length > 0 || date === todayKey) {
				events.push({
					type: 'goals',
					items,
					allGoalsCompleted,
				});
			}

			const sortedEvents = events
				.map((event) => {
					const ts =
						event.type === 'note'
							? parseTs(event.createdAt, `${date}T00:00:00Z`)
							: Date.parse(`${date}T00:00:00Z`);
					return { event, ts };
				})
				.sort((a, b) => b.ts - a.ts)
				.map((item) => item.event);

			return {
				date,
				items,
				allGoalsCompleted,
				events: sortedEvents,
			};
		})
		.filter((day) => day.date === todayKey || day.items.length > 0 || day.events.some((e) => e.type === 'note'));

	const streak = goalRows.length ? computeTimelineStreak(goalRows, byDate, offsetMinutes) : 0;
	const heatmap = buildTimelineHeatmap(byDate, days, offsetMinutes);

	return { days: daysData, streak, heatmap };
};

export const getDashboardData = async (
	env: EnvWithD1,
	days = 90,
	ctx?: TimeContext,
): Promise<GoalWithStats[]> => {
	const { offsetMinutes } = resolveTimeContext(ctx);
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
			streak: computeStreak(completions, offsetMinutes),
			totalCompletedDays: completions.filter((c) => c.count > 0).length,
			heatmap: buildHeatmap(completions, days, goal.dailyTargetCount, offsetMinutes),
		};
	});
};

export const createGoal = async (
	env: EnvWithD1,
	payload: { title: string; description?: string; dailyTargetCount: number; icon?: string; color?: string },
) => {
	const db = getDb(env);
	const [inserted] = await db
		.insert(goals)
		.values({
			title: payload.title,
			description: payload.description ?? '',
			dailyTargetCount: payload.dailyTargetCount,
			icon: payload.icon?.trim() || 'Target',
			color: payload.color?.trim() || '#10b981',
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

export const updateGoal = async (
	env: EnvWithD1,
	goalId: number,
	payload: {
		title?: string;
		description?: string;
		dailyTargetCount?: number;
		icon?: string;
		color?: string;
	},
) => {
	const db = getDb(env);

	const updates: Partial<typeof goals.$inferInsert> = {
		updatedAt: new Date().toISOString(),
	};

	if (payload.title !== undefined) {
		const title = payload.title.trim();
		if (!title) throw new Error('title_required');
		updates.title = title;
	}

	if (payload.description !== undefined) {
		updates.description = payload.description.trim();
	}

	if (payload.dailyTargetCount !== undefined) {
		const parsed = Number(payload.dailyTargetCount);
		if (!Number.isFinite(parsed) || parsed <= 0) throw new Error('daily_target_invalid');
		updates.dailyTargetCount = Math.floor(parsed);
	}

	if (payload.icon !== undefined) {
		updates.icon = payload.icon.trim() || 'Target';
	}

	if (payload.color !== undefined) {
		updates.color = payload.color.trim() || '#10b981';
	}

	await db.update(goals).set(updates).where(eq(goals.id, goalId));
};

export const recordGoalCompletion = async (
	env: EnvWithD1,
	goalId: number,
	count: number,
	date?: string,
	ctx?: TimeContext,
) => {
	const { offsetMinutes } = resolveTimeContext(ctx);
	const db = getDb(env);
	const targetDate = (date?.trim?.() ?? '') || toDateKey(Date.now(), offsetMinutes);
	const [existing] = await db
		.select()
		.from(goalCompletions)
		.where(and(eq(goalCompletions.goalId, goalId), eq(goalCompletions.date, targetDate)))
		.limit(1);

	if (existing) {
		await db
			.update(goalCompletions)
			.set({ count: existing.count + count })
			.where(and(eq(goalCompletions.goalId, goalId), eq(goalCompletions.date, targetDate)));
	} else {
		await db.insert(goalCompletions).values({
			goalId,
			date: targetDate,
			count,
		});
	}
};

export const createTimelineNote = async (env: EnvWithD1, content: string, date?: string, ctx?: TimeContext) => {
	const { offsetMinutes } = resolveTimeContext(ctx);
	const db = getDb(env);
	const trimmed = content.trim();
	if (!trimmed) throw new Error('content_required');

	const targetDate = date?.trim() || toDateKey(Date.now(), offsetMinutes);
	const [inserted] = await db
		.insert(timelineNotes)
		.values({
			content: trimmed,
			date: targetDate,
		})
		.returning();

	return inserted;
};

export const deleteTimelineNote = async (env: EnvWithD1, noteId: number) => {
	const db = getDb(env);
	if (!noteId) throw new Error('note_id_required');
	await db.delete(timelineNotes).where(eq(timelineNotes.id, noteId));
};

export const deleteGoal = async (env: EnvWithD1, goalId: number) => {
	const db = getDb(env);
	await db.delete(goals).where(eq(goals.id, goalId));
};
