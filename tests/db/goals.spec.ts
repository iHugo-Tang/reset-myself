import { and, desc, eq } from 'drizzle-orm';
import { describe, expect, it, vi } from 'vitest';

import {
	backfillDailySummaries,
	createGoal,
	createTimelineNote,
	deleteGoal,
	deleteTimelineNote,
	getDashboardData,
	getTimelineData,
	recordGoalCompletion,
	updateGoal,
	updateGoalTarget,
} from '@/db/goals';
import type { EnvWithD1 } from '@/db/client';
import { toDateKey } from '@/utils/time';
import { dailySummaries, goalCompletions, goals, timelineEvents, timelineNotes } from '../../drizzle/schema';
import { createTestEnv } from '../helpers/testDb';

describe('db/goals', () => {
	let env: EnvWithD1;
	let dispose: () => void;
	let originalDateNow: typeof Date.now;

	const setup = async () => {
		const created = await createTestEnv();
		env = created.env;
		dispose = created.dispose;
		originalDateNow = Date.now;
		Date.now = () => new Date('2024-02-11T12:00:00Z').getTime();
		return created.db;
	};

	const teardown = () => {
		if (originalDateNow) {
			Date.now = originalDateNow;
		}
		dispose?.();
	};

	it('creates goals with defaults and logs lifecycle event', async () => {
		const db = await setup();
		const goal = await createGoal(env, { title: 'Read', dailyTargetCount: 2 });
		expect(goal.icon).toBe('Target');
		expect(goal.color).toBe('#10b981');

		const events = await db.select().from(timelineEvents).orderBy(desc(timelineEvents.id));
		expect(events).toHaveLength(1);
		expect(events[0].type).toBe('goal_created');
		expect(events[0].payload).toMatchObject({ title: 'Read' });
		teardown();
	});

	it('updates goals, enforces validation, and trims values', async () => {
		const db = await setup();
		const goal = await createGoal(env, { title: ' Lift ', dailyTargetCount: 1 });

		await expect(updateGoal(env, goal.id, { title: '' })).rejects.toThrow('title_required');
		await expect(updateGoal(env, goal.id, { dailyTargetCount: 0 })).rejects.toThrow('daily_target_invalid');

		await updateGoal(env, goal.id, {
			title: '  New Title  ',
			description: ' spaced  ',
			icon: '  ',
			color: '',
			dailyTargetCount: 3,
		});

		const [updated] = await db.select().from(goals).where(eq(goals.id, goal.id));
		expect(updated.title).toBe('New Title');
		expect(updated.description).toBe('spaced');
		expect(updated.dailyTargetCount).toBe(3);
		expect(updated.icon).toBe('Target');
		expect(updated.color).toBe('#10b981');
		teardown();
	});

	it('updates goal target independently', async () => {
		const db = await setup();
		const goal = await createGoal(env, { title: 'Write', dailyTargetCount: 1 });
		await updateGoalTarget(env, goal.id, 5);

		const [updated] = await db.select().from(goals).where(eq(goals.id, goal.id));
		expect(updated.dailyTargetCount).toBe(5);
		teardown();
	});

	it('records goal completions, aggregates counts, and logs timeline events', async () => {
		const db = await setup();
		const goal = await createGoal(env, { title: 'Run', dailyTargetCount: 2 });

		const today = toDateKey(Date.now(), 0);
		await recordGoalCompletion(env, goal.id, 2, today);
		await recordGoalCompletion(env, goal.id, 1, today);

		const [completion] = await db
			.select()
			.from(goalCompletions)
			.where(and(eq(goalCompletions.goalId, goal.id), eq(goalCompletions.date, today)));
		expect(completion.count).toBe(3);

		const checkins = await db
			.select()
			.from(timelineEvents)
			.where(eq(timelineEvents.type, 'checkin'))
			.orderBy(timelineEvents.id);
		expect(checkins.at(-1)?.payload).toMatchObject({
			delta: 1,
			newCount: 3,
			target: 2,
		});

		await expect(recordGoalCompletion(env, 999, 1)).rejects.toThrow('goal_not_found');
		teardown();
	});

	it('creates timeline notes, validates input, and deletes with cascade', async () => {
		const db = await setup();
		await expect(createTimelineNote(env, '   ')).rejects.toThrow('content_required');

		const note = await createTimelineNote(env, 'Hello world', '2024-02-10');
		const notes = await db.select().from(timelineNotes);
		expect(notes).toHaveLength(1);

		const events = await db.select().from(timelineEvents).where(eq(timelineEvents.type, 'note'));
		expect(events).toHaveLength(1);
		expect(events[0].payload).toMatchObject({ content: 'Hello world' });

		await expect(deleteTimelineNote(env, 0)).rejects.toThrow('note_id_required');
		await deleteTimelineNote(env, note.id);
		const remainingNotes = await db.select().from(timelineNotes);
		expect(remainingNotes).toHaveLength(0);
		const remainingEvents = await db.select().from(timelineEvents).where(eq(timelineEvents.type, 'note'));
		expect(remainingEvents).toHaveLength(0);
		teardown();
	});

	it('deletes goals and logs goal_deleted events when present', async () => {
		const db = await setup();
		const goal = await createGoal(env, { title: 'Swim', dailyTargetCount: 1, icon: 'Fish', color: '#000000' });
		await deleteGoal(env, goal.id);

		const events = await db.select().from(timelineEvents).where(eq(timelineEvents.type, 'goal_deleted'));
		expect(events).toHaveLength(1);
		expect(events[0].payload).toMatchObject({ title: 'Swim', icon: 'Fish', color: '#000000' });

		// Deleting again should be a no-op without throwing
		await deleteGoal(env, goal.id);
		teardown();
	});

	it('returns dashboard data with streak and heatmap computed', async () => {
		const db = await setup();
		const goal = await createGoal(env, { title: 'Stretch', dailyTargetCount: 2 });

		await recordGoalCompletion(env, goal.id, 2, '2024-02-11'); // today
		await recordGoalCompletion(env, goal.id, 2, '2024-02-10');
		await recordGoalCompletion(env, goal.id, 1, '2024-02-09');

		const data = await getDashboardData(env, 3, { offsetMinutes: 0 });
		expect(data).toHaveLength(1);
	expect(data[0].streak).toBe(3);
		expect(data[0].totalCompletedDays).toBe(3);
	expect(data[0].heatmap.map((h) => h.count)).toEqual([1, 2, 2]);

		// Also cover the case with no goals
		await db.delete(goalCompletions).where(eq(goalCompletions.goalId, goal.id));
		await db.delete(goals).where(eq(goals.id, goal.id));
		const empty = await getDashboardData(env, 3, { offsetMinutes: 0 });
		expect(empty).toEqual([]);
		teardown();
	});

	it('builds timeline data with summaries, legacy notes, and sorted events', async () => {
		const db = await setup();
		const goalA = await createGoal(env, { title: 'Goal A', dailyTargetCount: 1, icon: 'A', color: '#111' });
		const goalB = await createGoal(env, { title: 'Goal B', dailyTargetCount: 1, icon: 'B', color: '#222' });

		await recordGoalCompletion(env, goalA.id, 1, '2024-02-10');
		await recordGoalCompletion(env, goalB.id, 1, '2024-02-10');
		await recordGoalCompletion(env, goalA.id, 1, '2024-02-09');
	await recordGoalCompletion(env, goalA.id, 1, '2024-02-11');
	await recordGoalCompletion(env, goalB.id, 1, '2024-02-11');

		// Create an event missing numeric fields to exercise parseNumber fallbacks
		await db.insert(timelineEvents).values({
			date: '2024-02-09',
			type: 'checkin',
			goalId: goalA.id,
			payload: JSON.parse(
				JSON.stringify({ goalId: String(goalA.id), delta: 'notnum', newCount: 'x', target: undefined, icon: null }),
			),
			createdAt: '2024-02-09T05:00:00Z',
		});

		// Legacy note without corresponding event
		await db.insert(timelineNotes).values({
			content: 'Legacy',
			date: '2024-02-09',
			createdAt: '2024-02-09T02:00:00Z',
		});

		const timeline = await getTimelineData(env, 3, { offsetMinutes: 0 });
	expect(timeline.streak).toBe(2);

		const day9 = timeline.days.find((d) => d.date === '2024-02-09');
		const day10 = timeline.days.find((d) => d.date === '2024-02-10');
	expect(day9?.events.some((e) => e.type === 'note')).toBe(true);
	expect(day9?.events.some((e) => e.type === 'checkin')).toBe(true);
		expect(day10?.allGoalsCompleted).toBe(true);
		expect(timeline.heatmap.length).toBe(3);
		teardown();
	});

it('adds multiple event types to timeline data including goal deletion and note events', async () => {
	const db = await setup();
	const goal = await createGoal(env, { title: 'Temp', dailyTargetCount: 1 });
	await recordGoalCompletion(env, goal.id, 1, '2024-02-11');
	await createTimelineNote(env, 'event note', '2024-02-11');

	// Insert a malformed checkin event to exercise null goal guard
	await db.insert(timelineEvents).values({
		date: '2024-02-11',
		type: 'checkin',
		goalId: null,
		payload: { goalId: 'abc', delta: 1, newCount: 1, target: 1 },
		createdAt: '2024-02-11T12:00:00Z',
	});

	await db.insert(timelineEvents).values({
		date: '2024-02-11',
		type: 'note',
		goalId: null,
		payload: { noteId: 'none', content: 'payload note' },
		createdAt: '2024-02-11T12:05:00Z',
	});

	await db.insert(timelineEvents).values({
		date: '2024-02-11',
		type: 'other',
		goalId: null,
		payload: { misc: true },
		createdAt: '2024-02-11T12:10:00Z',
	});

	await deleteGoal(env, goal.id);
	const timeline = await getTimelineData(env, 1, { offsetMinutes: 0 });
	expect(timeline.days[0]?.events.some((e) => e.type === 'goal_deleted')).toBe(true);
	expect(timeline.days[0]?.events.some((e) => e.type === 'checkin')).toBe(true);
	expect(timeline.days[0]?.events.some((e) => e.type === 'note')).toBe(true);
	teardown();
});

	it('falls back to timeline streak when no summaries exist', async () => {
		const db = await setup();
		const goal = await createGoal(env, { title: 'Solo', dailyTargetCount: 1 });
		const todayKey = toDateKey(Date.now(), 0);
		await recordGoalCompletion(env, goal.id, 1, todayKey);

		const timeline = await getTimelineData(env, 1, { offsetMinutes: 0 });
		expect(timeline.streak).toBe(1);
		expect(timeline.days[0].date).toBe(todayKey);
		teardown();
	});

	it('backfills daily summaries across ranges and handles invalid ranges gracefully', async () => {
		const db = await setup();
		const goal = await createGoal(env, { title: 'Backfill', dailyTargetCount: 1 });
	await db.update(goals).set({ createdAt: '2024-02-08T00:00:00Z' }).where(eq(goals.id, goal.id));
		await recordGoalCompletion(env, goal.id, 1, '2024-02-10');
		await recordGoalCompletion(env, goal.id, 1, '2024-02-09');

		const result = await backfillDailySummaries(env, { offsetMinutes: 0 });
		expect(result.upserted).toBeGreaterThan(0);
		const summaries = await db.select().from(dailySummaries).orderBy(dailySummaries.date);
		expect(summaries.length).toBeGreaterThan(0);

		// Make the first goal date after yesterday to trigger the early return branch
		await db
			.update(goals)
			.set({ createdAt: '2099-01-01T00:00:00Z' })
			.where(eq(goals.id, goal.id));
		const skipped = await backfillDailySummaries(env, { offsetMinutes: 0 });
		expect(skipped.upserted).toBe(0);

	// Invalid date should also short circuit
	await db.update(goals).set({ createdAt: 'invalid' }).where(eq(goals.id, goal.id));
	const invalid = await backfillDailySummaries(env, { offsetMinutes: 0 });
	expect(invalid.upserted).toBe(0);
	teardown();
});

it('returns zero when backfilling with no goals present', async () => {
	await setup();
	const result = await backfillDailySummaries(env, { offsetMinutes: 0 });
	expect(result.upserted).toBe(0);
	teardown();
});

it('updates goal without optional payload fields', async () => {
	const db = await setup();
	const goal = await createGoal(env, { title: 'NoOps', dailyTargetCount: 1, icon: 'Target', color: '#aaa' });
	await updateGoal(env, goal.id, {});
	const [updated] = await db.select().from(goals).where(eq(goals.id, goal.id));
	expect(updated.title).toBe('NoOps');
	expect(updated.icon).toBe('Target');
	expect(updated.color).toBe('#aaa');
		teardown();
	});

	it('generates summary events when all goals completed', async () => {
		const db = await setup();
		const goal1 = await createGoal(env, { title: 'G1', dailyTargetCount: 1 });
		const goal2 = await createGoal(env, { title: 'G2', dailyTargetCount: 1 });

		// Complete one goal - no summary
		await recordGoalCompletion(env, goal1.id, 1, '2024-02-11');
		let events = await db
			.select()
			.from(timelineEvents)
			.where(and(eq(timelineEvents.date, '2024-02-11'), eq(timelineEvents.type, 'summary')));
		expect(events).toHaveLength(0);

		// Complete second goal - summary created
		await recordGoalCompletion(env, goal2.id, 1, '2024-02-11');
		events = await db
			.select()
			.from(timelineEvents)
			.where(and(eq(timelineEvents.date, '2024-02-11'), eq(timelineEvents.type, 'summary')));
		expect(events).toHaveLength(1);
		expect(events[0].payload).toMatchObject({ allGoalsCompleted: true });

		// Check getTimelineData uses it
		const timeline = await getTimelineData(env, 1, { offsetMinutes: 0 });
		const summaryEvent = timeline.days[0].events.find((e) => e.type === 'summary');
		expect(summaryEvent).toBeDefined();
		expect(summaryEvent?.id).toMatch(/^event-/);

		// Un-complete a goal - summary should be removed
		await recordGoalCompletion(env, goal2.id, -1, '2024-02-11');
		events = await db
			.select()
			.from(timelineEvents)
			.where(and(eq(timelineEvents.date, '2024-02-11'), eq(timelineEvents.type, 'summary')));
		expect(events).toHaveLength(0);

		teardown();
	});
});
