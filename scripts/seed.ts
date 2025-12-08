import { spawnSync } from 'node:child_process';

type GoalSeed = {
	title: string;
	description?: string;
	dailyTargetCount: number;
};

const GOALS: GoalSeed[] = [
	{ title: '每日阅读', description: '阅读 30 分钟', dailyTargetCount: 1 },
	{ title: '晨跑', description: '跑步或快走 2km', dailyTargetCount: 1 },
];

const DAYS = 30;
const TARGET_DB = 'reset_myself';

const isRemote = process.argv.includes('--remote');

const escapeSql = (value: string) => value.replace(/'/g, "''");

const formatDate = (date: Date) => date.toISOString().slice(0, 10); // YYYY-MM-DD UTC

const generateCount = (offset: number) => {
	// 提供稀疏/中等/高强度的演示数据
	if (offset % 6 === 0) return 0;
	if (offset % 3 === 0) return 2;
	return 1;
};

const buildSeedSql = () => {
	const lines: string[] = [];

	for (const goal of GOALS) {
		const title = escapeSql(goal.title);
		const description = escapeSql(goal.description ?? '');

		lines.push(
			`INSERT INTO goals (title, description, daily_target_count)
SELECT '${title}', '${description}', ${goal.dailyTargetCount}
WHERE NOT EXISTS (SELECT 1 FROM goals WHERE title = '${title}');`,
		);

		for (let i = 0; i < DAYS; i++) {
			const date = new Date();
			date.setUTCDate(date.getUTCDate() - i);
			const dateStr = formatDate(date);
			const count = generateCount(i);

			lines.push(
				`INSERT INTO goal_completions (goal_id, date, count)
SELECT id, '${dateStr}', ${count} FROM goals WHERE title = '${title}'
ON CONFLICT(goal_id, date) DO UPDATE SET count = excluded.count;`,
			);
		}
	}

	return lines.join('\n');
};

const run = () => {
	const sql = buildSeedSql();
	const args = ['d1', 'execute', TARGET_DB, isRemote ? '--remote' : '--local', '--command', sql];

	console.log(`Seeding D1 database "${TARGET_DB}" (${isRemote ? 'remote' : 'local'})...`);
	const result = spawnSync('wrangler', args, { stdio: 'inherit' });

	if (result.status !== 0) {
		console.error('Seeding failed.');
		process.exit(result.status ?? 1);
	}

	console.log('Seeding finished.');
};

run();
