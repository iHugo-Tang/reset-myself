import { describe, expect, it } from 'vitest';
import {
  createGoal,
  getTimelineEventsInfinite,
  recordGoalCompletion,
} from '@/db/goals';
import { timelineEvents } from '../../drizzle/schema';
import { createTestEnv } from '../helpers/testDb';
import type { EnvWithD1 } from '@/db/client';
import { toDateKey } from '@/utils/time';
import { desc, eq, sql } from 'drizzle-orm';

describe('db/timeline_dedup', () => {
  let env: EnvWithD1;
  let dispose: () => void;
  let originalDateNow: typeof Date.now;

  const setup = async () => {
    const created = await createTestEnv();
    env = created.env;
    dispose = created.dispose;
    originalDateNow = Date.now;
    // Fix date to 2024-02-11
    Date.now = () => new Date('2024-02-11T12:00:00Z').getTime();
    return created.db;
  };

  const teardown = () => {
    if (originalDateNow) {
      Date.now = originalDateNow;
    }
    dispose?.();
  };

  it('deduplicates checkins on read (legacy data) and write (new data)', async () => {
    const db = await setup();
    const goal = await createGoal(env, {
      title: 'Dedupe Me',
      dailyTargetCount: 5,
    });
    const today = toDateKey(Date.now(), 0);

    // 1. Simulate LEGACY duplicate data by manually inserting
    await db.insert(timelineEvents).values({
      date: today,
      type: 'checkin',
      goalId: goal.id,
      payload: { goalId: goal.id, delta: 1, newCount: 1 },
      createdAt: '2024-02-11T10:00:00Z',
    });
    await db.insert(timelineEvents).values({
      date: today,
      type: 'checkin',
      goalId: goal.id,
      payload: { goalId: goal.id, delta: 1, newCount: 2 },
      createdAt: '2024-02-11T11:00:00Z',
    });
    // Latest one
    await db.insert(timelineEvents).values({
      date: today,
      type: 'checkin',
      goalId: goal.id,
      payload: { goalId: goal.id, delta: 1, newCount: 3 },
      createdAt: '2024-02-11T12:00:00Z',
    });

    // Verify raw DB has 3 events
    let rawEvents = await db
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.type, 'checkin'));
    expect(rawEvents).toHaveLength(3);

    // Verify READ logic deduplicates (should return 1 - the latest)
    const result = await getTimelineEventsInfinite(env, 10);
    const checkinEvents = result.events.filter((e) => e.type === 'checkin');

    expect(checkinEvents).toHaveLength(1);
    expect(checkinEvents[0].newCount).toBe(3); // Should be the latest one

    // 2. Verify WRITE logic prevents duplicates
    await recordGoalCompletion(env, goal.id, 1, today);

    // Now raw events should be 1 (the newly inserted one, replacing the 3 old ones)
    rawEvents = await db
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.type, 'checkin'));
    expect(rawEvents).toHaveLength(1);
    expect(rawEvents[0].payload).toMatchObject({ newCount: 1 }); // 0 (from empty goalCompletions) + 1

    teardown();
  });

  it('preserves checkins on different dates', async () => {
    const db = await setup();
    const goal = await createGoal(env, {
      title: 'Different Dates',
      dailyTargetCount: 5,
    });
    const today = toDateKey(Date.now(), 0);
    const yesterday = toDateKey(Date.now() - 24 * 60 * 60 * 1000, 0);

    // Insert checkin for today
    await db.insert(timelineEvents).values({
      date: today,
      type: 'checkin',
      goalId: goal.id,
      payload: { goalId: goal.id, delta: 1, newCount: 1 },
      createdAt: '2024-02-11T12:00:00Z',
    });

    // Insert checkin for yesterday
    await db.insert(timelineEvents).values({
      date: yesterday,
      type: 'checkin',
      goalId: goal.id,
      payload: { goalId: goal.id, delta: 1, newCount: 1 },
      createdAt: '2024-02-10T12:00:00Z',
    });

    // Verify READ logic returns both
    const result = await getTimelineEventsInfinite(env, 10);
    const checkinEvents = result.events.filter((e) => e.type === 'checkin');

    expect(checkinEvents).toHaveLength(2);
    // TimelineEvent doesn't have 'date' property, but we can verify by createdAt which we set
    const createdAts = checkinEvents.map((e) => e.createdAt).sort();
    expect(createdAts).toEqual(
      ['2024-02-10T12:00:00Z', '2024-02-11T12:00:00Z'].sort()
    );

    // Verify WRITE logic on today doesn't delete yesterday
    await recordGoalCompletion(env, goal.id, 1, today);

    const rawEvents = await db
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.type, 'checkin'));

    // Should have 2 events: one for yesterday (preserved) and one for today (newly inserted/replaced)
    expect(rawEvents).toHaveLength(2);
    const rawDates = rawEvents.map((e) => e.date).sort();
    expect(rawDates).toEqual([yesterday, today].sort());

    teardown();
  });

  it('cleanup script SQL works correctly', async () => {
    const db = await setup();
    const goal = await createGoal(env, {
      title: 'Cleanup Me',
      dailyTargetCount: 5,
    });
    const today = toDateKey(Date.now(), 0);

    // Insert 3 checkin events
    await db.insert(timelineEvents).values({
      date: today,
      type: 'checkin',
      goalId: goal.id,
      payload: { newCount: 1 },
      createdAt: '2024-02-11T10:00:00Z',
    });
    await db.insert(timelineEvents).values({
      date: today,
      type: 'checkin',
      goalId: goal.id,
      payload: { newCount: 2 },
      createdAt: '2024-02-11T11:00:00Z',
    });
    // Latest one - payload newCount: 3
    await db.insert(timelineEvents).values({
      date: today,
      type: 'checkin',
      goalId: goal.id,
      payload: { newCount: 3 },
      createdAt: '2024-02-11T12:00:00Z',
    });

    // Run the SQL from the script
    const deleteSql = sql`
      DELETE FROM timeline_events
      WHERE type = 'checkin'
        AND id NOT IN (
          SELECT id
          FROM (
            SELECT id,
              ROW_NUMBER() OVER (
                PARTITION BY date, goal_id
                ORDER BY created_at DESC, id DESC
              ) as rn
            FROM timeline_events
            WHERE type = 'checkin'
          )
          WHERE rn = 1
        );
    `;

    await db.run(deleteSql);

    // Verify only 1 remains
    const rawEvents = await db
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.type, 'checkin'));
    expect(rawEvents).toHaveLength(1);
    expect(rawEvents[0].payload).toMatchObject({ newCount: 3 });

    teardown();
  });
});
