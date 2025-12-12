import { spawnSync } from 'node:child_process';

const TARGET_DB = 'reset_myself';
const isRemote = process.argv.includes('--remote');

const SQL = `
-- Backfill check-in events from goal_completions
INSERT INTO timeline_events (date, type, goal_id, payload, created_at)
SELECT
  gc.date,
  'checkin',
  gc.goal_id,
  json_object(
    'goalId', gc.goal_id,
    'delta', gc.count,
    'newCount', gc.count,
    'title', g.title,
    'icon', g.icon,
    'color', g.color,
    'target', g.daily_target_count
  ),
  COALESCE(gc.created_at, CURRENT_TIMESTAMP)
FROM goal_completions gc
JOIN goals g ON gc.goal_id = g.id
WHERE NOT EXISTS (
  SELECT 1 FROM timeline_events e
  WHERE e.type = 'checkin'
    AND e.goal_id = gc.goal_id
    AND e.date = gc.date
);

-- Backfill timeline notes
INSERT INTO timeline_events (date, type, goal_id, payload, created_at)
SELECT
  tn.date,
  'note',
  NULL,
  json_object(
    'noteId', tn.id,
    'content', tn.content
  ),
  COALESCE(tn.created_at, CURRENT_TIMESTAMP)
FROM timeline_notes tn
WHERE NOT EXISTS (
  SELECT 1 FROM timeline_events e
  WHERE e.type = 'note'
    AND json_extract(e.payload, '$.noteId') = tn.id
);

-- Backfill goal created events
INSERT INTO timeline_events (date, type, goal_id, payload, created_at)
SELECT
  SUBSTR(g.created_at, 1, 10),
  'goal_created',
  g.id,
  json_object(
    'goalId', g.id,
    'title', g.title,
    'icon', g.icon,
    'color', g.color
  ),
  COALESCE(g.created_at, CURRENT_TIMESTAMP)
FROM goals g
WHERE NOT EXISTS (
  SELECT 1 FROM timeline_events e
  WHERE e.type = 'goal_created'
    AND e.goal_id = g.id
);
`;

const run = () => {
  const args = [
    'd1',
    'execute',
    TARGET_DB,
    isRemote ? '--remote' : '--local',
    '--command',
    SQL,
  ];

  console.log(
    `Backfilling timeline_events into "${TARGET_DB}" (${isRemote ? 'remote' : 'local'})...`
  );
  const result = spawnSync('wrangler', args, { stdio: 'inherit' });

  if (result.status !== 0) {
    console.error('Backfill failed.');
    process.exit(result.status ?? 1);
  }

  console.log('Backfill completed.');
};

run();
