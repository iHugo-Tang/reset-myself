import { spawnSync } from 'node:child_process';

const TARGET_DB = 'reset_myself';
const isRemote = process.argv.includes('--remote');

const offsetArg = process.argv.find((arg) => arg.startsWith('--tz-offset='));
const parsedOffset = offsetArg ? Number(offsetArg.split('=')[1]) : 0;
const offsetMinutes = Number.isFinite(parsedOffset) ? Math.round(parsedOffset) : 0;
const offsetSql = `${offsetMinutes >= 0 ? '+' : ''}${offsetMinutes} minutes`;

const SQL = `
-- Generate date series from first goal (local day) to yesterday (local day)
WITH RECURSIVE
first_goal AS (
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
active_goals_per_day AS (
  SELECT
    ds.date_key,
    g.id,
    g.title,
    g.daily_target_count,
    g.icon,
    g.color,
    COALESCE(SUM(gc.count), 0) as count
  FROM date_series ds
  CROSS JOIN goals g
  LEFT JOIN goal_completions gc ON gc.goal_id = g.id AND gc.date = ds.date_key
  WHERE date(datetime(g.created_at, '${offsetSql}')) <= ds.date_key
  GROUP BY ds.date_key, g.id
),
day_summaries AS (
  SELECT
    date_key,
    json_group_array(json_object(
      'goalId', id,
      'title', title,
      'target', daily_target_count,
      'count', count,
      'icon', icon,
      'color', color
    )) as items,
    MIN(CASE WHEN count >= daily_target_count THEN 1 ELSE 0 END) as all_goals_completed
  FROM active_goals_per_day
  GROUP BY date_key
)
INSERT INTO timeline_events (date, type, payload, created_at)
SELECT
  date_key,
  'summary',
  json_object(
    'items', json(items),
    'allGoalsCompleted', all_goals_completed
  ),
  date_key || 'T23:59:59.999Z'
FROM day_summaries
WHERE NOT EXISTS (
  SELECT 1 FROM timeline_events e
  WHERE e.date = day_summaries.date_key
    AND e.type = 'summary'
);
`;

const run = () => {
	const args = ['d1', 'execute', TARGET_DB, isRemote ? '--remote' : '--local', '--command', SQL];
	console.log(
		`Backfilling summary events into "${TARGET_DB}" (${isRemote ? 'remote' : 'local'}), tz offset ${offsetMinutes} minutes...`,
	);

	const result = spawnSync('wrangler', args, { stdio: 'inherit' });

	if (result.status !== 0) {
		console.error('Backfill failed.');
		process.exit(result.status ?? 1);
	}

	console.log('Backfill completed.');
};

run();

