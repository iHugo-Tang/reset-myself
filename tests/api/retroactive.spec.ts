import { describe, expect, it, vi } from 'vitest';
import { and, eq } from 'drizzle-orm';

import type { EnvWithD1 } from '@/db/client';
import { getDb } from '@/db/client';
import { createGoal } from '@/db/goals';
import { goalCompletions, timelineEvents } from '../../drizzle/schema';
import { createRouteTester } from '../helpers/routeTester';
import { createTestEnv } from '../helpers/testDb';

let mockedCloudflareEnv: EnvWithD1 | undefined;
let mockedUserId = 'user-a';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: () => ({ env: mockedCloudflareEnv }),
}));

vi.mock('@/lib/auth/user', () => ({
  requireUserIdFromRequest: async () => mockedUserId,
  requireUserIdFromServer: async () => mockedUserId,
  getUserIdFromRequest: async () => mockedUserId,
}));

const mockCloudflare = (env: EnvWithD1) => {
  mockedCloudflareEnv = env;
};

describe('Retroactive goal completion', () => {
  it('records completion for supplied date and logs timeline event', async () => {
    const { env, dispose } = await createTestEnv();
    mockCloudflare(env);
    const goal = await createGoal(env, mockedUserId, {
      title: 'Retro',
      dailyTargetCount: 2,
    });
    const targetDate = '2023-05-10';
    const { POST } = await import('@/app/api/goals/[id]/completion/route');

    const server = createRouteTester(POST, { id: String(goal.id) });
    const res = await server.request
      .post(`/api/goals/${goal.id}/completion`)
      .set('accept', 'application/json')
      .send({ date: targetDate, count: 2 });
    expect(res.status).toBe(200);
    await server.close();

    const db = getDb(env);
    const [completion] = await db
      .select()
      .from(goalCompletions)
      .where(
        and(
          eq(goalCompletions.goalId, goal.id),
          eq(goalCompletions.date, targetDate)
        )
      )
      .limit(1);
    expect(completion?.count).toBe(2);

    const [event] = await db
      .select()
      .from(timelineEvents)
      .where(
        and(
          eq(timelineEvents.userId, mockedUserId),
          eq(timelineEvents.goalId, goal.id),
          eq(timelineEvents.date, targetDate),
          eq(timelineEvents.type, 'checkin')
        )
      )
      .limit(1);
    expect(event?.payload?.delta).toBe(2);
    expect(event?.payload?.newCount).toBe(2);
    dispose();
  });

  it('rejects invalid date formats', async () => {
    const { env, dispose } = await createTestEnv();
    mockCloudflare(env);
    const goal = await createGoal(env, mockedUserId, {
      title: 'Retro2',
      dailyTargetCount: 1,
    });
    const { POST } = await import('@/app/api/goals/[id]/completion/route');

    const server = createRouteTester(POST, { id: String(goal.id) });
    const res = await server.request
      .post(`/api/goals/${goal.id}/completion`)
      .set('accept', 'application/json')
      .send({ date: '20230510', count: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_date');
    await server.close();
    dispose();
  });
});
