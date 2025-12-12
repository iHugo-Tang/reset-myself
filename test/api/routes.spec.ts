import { describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';

import type { EnvWithD1 } from '@/db/client';
import { getDb } from '@/db/client';
import { createGoal, createTimelineNote } from '@/db/goals';
import { goals } from '../../drizzle/schema';
import { createRouteTester } from '../helpers/routeTester';
import { createTestEnv } from '../helpers/testDb';

const mockCloudflare = (env: EnvWithD1) => {
	vi.doMock('@opennextjs/cloudflare', () => ({
		getCloudflareContext: () => ({ env }),
	}));
};

describe('API routes', () => {
	it('GET /api/timeline returns data and handles errors', async () => {
		const { env, dispose } = await createTestEnv();
		mockCloudflare(env);
		const { GET } = await import('@/app/api/timeline/route');

		const okServer = createRouteTester(GET);
		const okRes = await okServer.request.get('/api/timeline?days=2&tz_offset=120').expect(200);
		expect(okRes.body.success).toBe(true);
		await okServer.close();

		const goalsModule = await import('@/db/goals');
		vi.spyOn(goalsModule, 'getTimelineData').mockRejectedValueOnce(new Error('boom'));
		const errorServer = createRouteTester(GET);
		const errorRes = await errorServer.request.get('/api/timeline').expect(500);
		expect(errorRes.body.success).toBe(false);
		await errorServer.close();
		dispose();
	});

	it('GET /api/goals returns dashboard data and surfaces errors', async () => {
		const { env, dispose } = await createTestEnv();
		mockCloudflare(env);
		await createGoal(env, { title: 'X', dailyTargetCount: 1 });

		const { GET } = await import('@/app/api/goals/route');
		const okServer = createRouteTester(GET);
		const okRes = await okServer.request.get('/api/goals').expect(200);
		expect(okRes.body.success).toBe(true);
		await okServer.close();

		const goalsModule = await import('@/db/goals');
		vi.spyOn(goalsModule, 'getDashboardData').mockRejectedValueOnce(new Error('nope'));
		const errorServer = createRouteTester(GET);
		const errorRes = await errorServer.request.get('/api/goals').expect(500);
		expect(errorRes.body.success).toBe(false);
		await errorServer.close();
		dispose();
	});

	it('POST /api/goals validates input and redirects', async () => {
		const { env, dispose } = await createTestEnv();
		mockCloudflare(env);
		const { POST } = await import('@/app/api/goals/route');

		const badServer = createRouteTester(POST);
	const badRes = await badServer.request.post('/api/goals').type('form').send({ title: '' }).expect(307);
		expect(badRes.headers.location).toContain('?error=title_required');
		await badServer.close();

		const okServer = createRouteTester(POST);
		const okRes = await okServer.request
			.post('/api/goals')
			.type('form')
			.send({ title: 'Good', dailyTargetCount: '2', icon: '', color: '' })
		.expect(307);
	expect(okRes.headers.location).toContain('/admin/dashboard');
		await okServer.close();
		dispose();
	});

it('POST /api/goals returns error redirect when creation fails', async () => {
	const { env, dispose } = await createTestEnv();
	mockCloudflare(env);
	const goalsModule = await import('@/db/goals');
	vi.spyOn(goalsModule, 'createGoal').mockRejectedValueOnce(new Error('fail'));
	const { POST } = await import('@/app/api/goals/route');

	const server = createRouteTester(POST);
	const res = await server.request
		.post('/api/goals')
		.type('form')
		.send({ title: 'Bad', dailyTargetCount: '1' })
		.expect(307);
	expect(res.headers.location).toContain('create_failed');
	await server.close();
	dispose();
});

	it('POST /api/goals/[id]/completion handles success and failure paths', async () => {
		const { env, dispose } = await createTestEnv();
		mockCloudflare(env);
		const goalsModule = await import('@/db/goals');
		const { POST } = await import('@/app/api/goals/[id]/completion/route');

		const missingServer = createRouteTester(POST, { id: '0' });
		const missingRes = await missingServer.request
			.post('/api/goals/0/completion')
			.set('accept', 'application/json')
		.type('form')
		.send({})
			.expect(400);
		expect(missingRes.body.error).toBe('missing_goal_id');
		await missingServer.close();

	const missingRedirectServer = createRouteTester(POST, { id: '0' });
	const missingRedirectRes = await missingRedirectServer.request
		.post('/api/goals/0/completion')
		.type('form')
		.send({});
	expect(missingRedirectRes.headers.location).toContain('missing_goal_id');
	await missingRedirectServer.close();

		const goal = await createGoal(env, { title: 'Comp', dailyTargetCount: 1 });
		const okServer = createRouteTester(POST, { id: String(goal.id) });
		const okRes = await okServer.request
			.post(`/api/goals/${goal.id}/completion`)
			.set('accept', 'application/json')
			.type('form')
			.send({ count: '2', date: '2024-02-10' })
			.expect(200);
		expect(okRes.body.ok).toBe(true);
		await okServer.close();

	const htmlServer = createRouteTester(POST, { id: String(goal.id) });
	const htmlRes = await htmlServer.request
		.post(`/api/goals/${goal.id}/completion`)
		.type('form')
		.send({ count: 0 });
	expect(htmlRes.headers.location).toContain('/admin/dashboard');
	await htmlServer.close();

		vi.spyOn(goalsModule, 'recordGoalCompletion').mockRejectedValueOnce(new Error('fail'));
		const failServer = createRouteTester(POST, { id: String(goal.id) });
		const failRes = await failServer.request
			.post(`/api/goals/${goal.id}/completion`)
			.set('accept', 'application/json')
			.type('form')
		.send({ count: '1' })
			.expect(500);
		expect(failRes.body.error).toBe('record_completion_failed');
		await failServer.close();
		dispose();
	});

it('POST /api/goals/[id]/completion redirects on error when client accepts html', async () => {
	const { env, dispose } = await createTestEnv();
	mockCloudflare(env);
	const goalsModule = await import('@/db/goals');
	vi.spyOn(goalsModule, 'recordGoalCompletion').mockRejectedValueOnce(new Error('fail'));
	const goal = await createGoal(env, { title: 'Redirect', dailyTargetCount: 1 });
	const { POST } = await import('@/app/api/goals/[id]/completion/route');
	const server = createRouteTester(POST, { id: String(goal.id) });
	const res = await server.request.post(`/api/goals/${goal.id}/completion`).type('form').send({ count: 1 });
	expect(res.headers.location).toContain('record_completion_failed');
	await server.close();
	dispose();
});

	it('POST /api/goals/[id]/target updates goal target or redirects on missing id', async () => {
		const { env, dispose } = await createTestEnv();
		mockCloudflare(env);
		const { POST } = await import('@/app/api/goals/[id]/target/route');

		const missingServer = createRouteTester(POST, { id: '0' });
		const missingRes = await missingServer.request.post('/api/goals/0/target').type('form').send({ dailyTargetCount: 3 });
		expect(missingRes.headers.location).toContain('?error=missing_goal_id');
		await missingServer.close();

		const goal = await createGoal(env, { title: 'Target', dailyTargetCount: 1 });
		const okServer = createRouteTester(POST, { id: String(goal.id) });
		const okRes = await okServer.request
			.post(`/api/goals/${goal.id}/target`)
			.type('form')
			.send({ dailyTargetCount: 4 });
	expect(okRes.headers.location).toContain('/admin/dashboard');
	const db = getDb(env);
	const [updated] = await db.select().from(goals).where(eq(goals.id, goal.id));
	expect(updated.dailyTargetCount).toBe(4);
		await okServer.close();

	const fallbackServer = createRouteTester(POST, { id: String(goal.id) });
	await fallbackServer.request
		.post(`/api/goals/${goal.id}/target`)
		.type('form')
		.send({ dailyTargetCount: -5 });
	const [fallback] = await db.select().from(goals).where(eq(goals.id, goal.id));
	expect(fallback.dailyTargetCount).toBe(1);
	await fallbackServer.close();
	const nonNumericServer = createRouteTester(POST, { id: String(goal.id) });
	await nonNumericServer.request
		.post(`/api/goals/${goal.id}/target`)
		.type('form')
		.send({ dailyTargetCount: 'abc' });
	const [nonNumeric] = await db.select().from(goals).where(eq(goals.id, goal.id));
	expect(nonNumeric.dailyTargetCount).toBe(1);
	await nonNumericServer.close();
	dispose();
	});

it('POST /api/goals/[id]/target redirects when update fails', async () => {
	const { env, dispose } = await createTestEnv();
	mockCloudflare(env);
	const goalsModule = await import('@/db/goals');
	const goal = await createGoal(env, { title: 'Err', dailyTargetCount: 1 });
	vi.spyOn(goalsModule, 'updateGoalTarget').mockRejectedValueOnce(new Error('fail'));
	const { POST } = await import('@/app/api/goals/[id]/target/route');
	const server = createRouteTester(POST, { id: String(goal.id) });
	const res = await server.request
		.post(`/api/goals/${goal.id}/target`)
		.type('form')
		.send({ dailyTargetCount: 2 });
	expect(res.headers.location).toContain('update_target_failed');
	await server.close();
	dispose();
});

	it('POST /api/timeline/notes validates content and stores note', async () => {
		const { env, dispose } = await createTestEnv();
		mockCloudflare(env);
		const { POST } = await import('@/app/api/timeline/notes/route');

		const emptyServer = createRouteTester(POST);
		const emptyRes = await emptyServer.request.post('/api/timeline/notes').set('accept', 'application/json').send({ content: '' });
		expect(emptyRes.status).toBe(400);
		expect(emptyRes.body.message).toContain('empty');
		await emptyServer.close();

		const longContent = 'a'.repeat(281);
		const longServer = createRouteTester(POST);
		const longRes = await longServer.request
			.post('/api/timeline/notes')
			.set('accept', 'application/json')
			.send({ content: longContent });
		expect(longRes.status).toBe(400);
		expect(longRes.body.message).toContain('280');
		await longServer.close();

		const okServer = createRouteTester(POST);
		const okRes = await okServer.request
			.post('/api/timeline/notes')
			.set('accept', 'application/json')
			.send({ content: 'note' });
		expect(okRes.status).toBe(200);
		expect(okRes.body.success).toBe(true);
		await okServer.close();
		dispose();
	});

it('POST /api/timeline/notes accepts form payloads and surfaces errors', async () => {
	const { env, dispose } = await createTestEnv();
	mockCloudflare(env);
	const goalsModule = await import('@/db/goals');
	const spy = vi.spyOn(goalsModule, 'createTimelineNote');
	const { POST } = await import('@/app/api/timeline/notes/route');

	const formServer = createRouteTester(POST);
	const formRes = await formServer.request
		.post('/api/timeline/notes')
		.type('form')
		.send({ content: 'form note' });
	expect(formRes.status).toBe(200);
	await formServer.close();

	const htmlServer = createRouteTester(POST);
	const htmlRes = await htmlServer.request
		.post('/api/timeline/notes')
		.type('form')
		.set('accept', 'text/html')
		.send({ content: 'html note' });
	expect(htmlRes.headers.location).toContain('/timeline');
	await htmlServer.close();

	spy.mockRejectedValueOnce(new Error('fail'));
	const errorServer = createRouteTester(POST);
	const errorRes = await errorServer.request
		.post('/api/timeline/notes')
		.set('accept', 'application/json')
		.send({ content: 'should fail' });
	expect(errorRes.status).toBe(500);
	expect(errorRes.body.success).toBe(false);
	await errorServer.close();
	dispose();
});

it('DELETE/PATCH /api/goals/[id] cover CRUD flows', async () => {
	const { env, dispose } = await createTestEnv();
	mockCloudflare(env);
	const goalsModule = await import('@/db/goals');
	const { DELETE, POST, PATCH } = await import('@/app/api/goals/[id]/route');

	const missingDelete = createRouteTester(DELETE, { id: '0' });
	const missingDeleteRes = await missingDelete.request.delete('/api/goals/0');
	expect(missingDeleteRes.status).toBe(400);
	await missingDelete.close();

	const missingRedirect = createRouteTester(POST, { id: '0' });
	const missingRedirectRes = await missingRedirect.request.post('/api/goals/0');
	expect(missingRedirectRes.headers.location).toContain('missing_goal_id');
	await missingRedirect.close();

	const goal = await createGoal(env, { title: 'CRUD', dailyTargetCount: 1 });
	const redirectDelete = createRouteTester(POST, { id: String(goal.id) });
	const redirectRes = await redirectDelete.request.post(`/api/goals/${goal.id}`);
	expect(redirectRes.headers.location).toContain('/admin/dashboard');
	await redirectDelete.close();

	const deleteServer = createRouteTester(DELETE, { id: String(goal.id) });
	const deleteRes = await deleteServer.request
		.delete(`/api/goals/${goal.id}`)
		.set('accept', 'application/json');
	expect(deleteRes.body.success).toBe(true);
	await deleteServer.close();

	const failDeleteSpy = vi.spyOn(goalsModule, 'deleteGoal').mockRejectedValueOnce(new Error('boom'));
	const failDeleteServer = createRouteTester(POST, { id: String(goal.id) });
	const failDeleteRes = await failDeleteServer.request.post(`/api/goals/${goal.id}`);
	expect(failDeleteRes.headers.location).toContain('delete_goal_failed');
	await failDeleteServer.close();
	failDeleteSpy.mockRestore();

	const failJsonServer = createRouteTester(DELETE, { id: String(goal.id) });
	vi.spyOn(goalsModule, 'deleteGoal').mockRejectedValueOnce(new Error('boom-json'));
	const failJsonRes = await failJsonServer.request.delete(`/api/goals/${goal.id}`).set('accept', 'application/json');
	expect(failJsonRes.status).toBe(500);
	await failJsonServer.close();

	const missingPatch = createRouteTester(PATCH, { id: '0' });
	const missingPatchRes = await missingPatch.request.patch('/api/goals/0').send({}).set('content-type', 'application/json');
	expect(missingPatchRes.status).toBe(400);
	await missingPatch.close();

	const goal2 = await createGoal(env, { title: 'CRUD2', dailyTargetCount: 1 });
	const patchServer = createRouteTester(PATCH, { id: String(goal2.id) });
	const patchRes = await patchServer.request
		.patch(`/api/goals/${goal2.id}`)
		.send({ title: 'Updated title' })
		.set('content-type', 'application/json');
	expect(patchRes.body.success).toBe(true);
	await patchServer.close();

	vi.spyOn(goalsModule, 'updateGoal').mockRejectedValueOnce(new Error('title_required'));
	const errorPatchServer = createRouteTester(PATCH, { id: String(goal2.id) });
	const errorPatchRes = await errorPatchServer.request
		.patch(`/api/goals/${goal2.id}`)
		.send({})
		.set('content-type', 'application/json');
	expect(errorPatchRes.body.message).toContain('Title');
	await errorPatchServer.close();

	dispose();
});

it('DELETE/POST /api/timeline/notes/[id] remove notes or validate id', async () => {
	const { env, dispose } = await createTestEnv();
	mockCloudflare(env);
	const goalsModule = await import('@/db/goals');
	const { POST, DELETE } = await import('@/app/api/timeline/notes/[id]/route');

	const missingServer = createRouteTester(DELETE, { id: '0' });
	const missingRes = await missingServer.request.delete('/api/timeline/notes/0');
	expect(missingRes.status).toBe(400);
	await missingServer.close();

	const note = await createTimelineNote(env, 'persist me', '2024-02-10');
	const deleteServer = createRouteTester(DELETE, { id: String(note.id) });
	const deleteRes = await deleteServer.request.delete(`/api/timeline/notes/${note.id}`);
	expect(deleteRes.status).toBe(200);
	expect(deleteRes.body.success).toBe(true);
	await deleteServer.close();

	const postServer = createRouteTester(POST, { id: String(note.id) });
	const postRes = await postServer.request.post(`/api/timeline/notes/${note.id}`);
	expect(postRes.status).toBe(200);
	expect(postRes.body.success).toBe(true);
	await postServer.close();

	vi.spyOn(goalsModule, 'deleteTimelineNote').mockRejectedValueOnce(new Error('fail'));
	const errorServer = createRouteTester(DELETE, { id: String(note.id) });
	const errorRes = await errorServer.request.delete(`/api/timeline/notes/${note.id}`);
	expect(errorRes.status).toBe(500);
	await errorServer.close();
	dispose();
});
});
