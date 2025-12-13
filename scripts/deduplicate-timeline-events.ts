import { spawnSync } from 'node:child_process';

const TARGET_DB = 'reset_myself';
const isRemote = process.argv.includes('--remote');

const SQL = `
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
    `Deduplicating timeline_events in "${TARGET_DB}" (${isRemote ? 'remote' : 'local'})...`
  );

  const result = spawnSync('wrangler', args, { stdio: 'inherit' });

  if (result.status !== 0) {
    console.error('Deduplication failed.');
    process.exit(result.status ?? 1);
  }

  console.log('Deduplication completed.');
};

run();

