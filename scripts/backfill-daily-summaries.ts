import { spawnSync } from 'node:child_process';

const TARGET_DB = 'reset_myself';
const isRemote = process.argv.includes('--remote');

const offsetArg = process.argv.find((arg) => arg.startsWith('--tz-offset='));
const parsedOffset = offsetArg ? Number(offsetArg.split('=')[1]) : 0;
const offsetMinutes = Number.isFinite(parsedOffset) ? Math.round(parsedOffset) : 0;
const offsetSql = `${offsetMinutes >= 0 ? '+' : ''}${offsetMinutes} minutes`;

const SQL = `
-- Generate date series from first goal (local day) to yesterday (local day)
WITH first_goal AS (
  SELECT date(datetime(MIN(created_at), '${offsetSql}')) AS start_date FROM goals WHERE created_at IS NOT NULL
),
date_series(date_key) AS (
  SELECT start_date FROM first_goal
  WHERE start_date IS NOT NULL
  UNION ALL
  SELECT date(date_key, '+1 day')
  FROM date_series, first_goal
  WHERE date_key IS NOT NULL
    AND date(date_key, '+1 day') <= date('now', '${offsetSql}', '-1 day')
),
summary_data AS (
  SELECT
    ds.date_key,
    (
      SELECT COUNT(*) FROM goals g
      WHERE date(datetime(g.created_at, '${offsetSql}')) <= ds.date_key
    ) AS total_goals,
    (
      SELECT COUNT(*) FROM goals g
      WHERE date(datetime(g.created_at, '${offsetSql}')) <= ds.date_key
        AND (
          SELECT COALESCE(SUM(gc.count), 0)
          FROM goal_completions gc
          WHERE gc.goal_id = g.id AND gc.date = ds.date_key
        ) >= g.daily_target_count
    ) AS completed_goals
  FROM date_series ds
)
INSERT INTO daily_summaries (date, total_goals, completed_goals, success_rate, created_at)
SELECT
  date_key,
  total_goals,
  completed_goals,
  CASE
    WHEN total_goals > 0 THEN CAST(completed_goals AS REAL) / total_goals
    ELSE 0
  END AS success_rate,
  CURRENT_TIMESTAMP
FROM summary_data
WHERE date_key IS NOT NULL AND total_goals > 0
ON CONFLICT(date) DO UPDATE SET
  total_goals = excluded.total_goals,
  completed_goals = excluded.completed_goals,
  success_rate = excluded.success_rate;
`;

const run = () => {
	const args = ['d1', 'execute', TARGET_DB, isRemote ? '--remote' : '--local', '--command', SQL];
	console.log(
		`Backfilling daily_summaries into "${TARGET_DB}" (${isRemote ? 'remote' : 'local'}), tz offset ${offsetMinutes} minutes...`,
	);

	const result = spawnSync('wrangler', args, { stdio: 'inherit' });

	if (result.status !== 0) {
		console.error('Backfill failed.');
		process.exit(result.status ?? 1);
	}

	console.log('Backfill completed.');
};

run();
