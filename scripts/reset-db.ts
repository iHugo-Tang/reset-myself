import { spawnSync } from 'node:child_process';

const TARGET_DB = 'reset_myself';
const isRemote = process.argv.includes('--remote');

// Tables to drop in order of dependencies (child tables first)
const TABLES = [
  'timeline_events',
  'goal_completions',
  'goals',
  'timeline_notes',
  'daily_summaries',
  'drizzle_migrations',
  'd1_migrations',
];

const buildDropSql = () => {
  return TABLES.map((table) => `DROP TABLE IF EXISTS ${table};`).join('\n');
};

const run = () => {
  console.log(
    `Resetting D1 database "${TARGET_DB}" (${isRemote ? 'remote' : 'local'})...`
  );

  // 1. Drop all tables
  const dropSql = buildDropSql();
  const dropArgs = [
    'd1',
    'execute',
    TARGET_DB,
    isRemote ? '--remote' : '--local',
    '--command',
    dropSql,
  ];

  console.log('Dropping tables...');
  const dropResult = spawnSync('wrangler', dropArgs, { stdio: 'inherit' });

  if (dropResult.status !== 0) {
    console.error('Failed to drop tables.');
    process.exit(dropResult.status ?? 1);
  }

  // 2. Re-apply migrations
  const migrateArgs = [
    'd1',
    'migrations',
    'apply',
    TARGET_DB,
    isRemote ? '--remote' : '--local',
  ];

  console.log('Applying migrations...');
  // We need to answer "y" to the confirmation prompt if it appears, but --local might not ask?
  // Wrangler migrations apply usually asks for confirmation.
  // There isn't a --yes flag for apply in all versions, but let's check.
  // We can pipe "y\n" to it if needed, or hope for a force flag.
  // Wrangler v3+ usually implies non-interactive if CI is set or via some flag.
  // Let's check help or assume we might need --force (deprecated?) or similar.
  // Actually, for local dev, it might just run. For remote, it warns.
  // Looking at package.json, "drizzle:migrate" uses "wrangler d1 migrations apply ... --local".
  // Let's try running it. If it hangs, we might need to handle stdin.
  
  // Since we are running this via "tsx scripts/reset-db.ts", we are in an interactive shell often.
  // But if we want it automated, we might need to be careful.
  
  // Actually, let's just run it. If it prompts, the user can type 'y'. 
  // But the spawnSync with stdio: 'inherit' will allow user interaction.
  
  const migrateResult = spawnSync('wrangler', migrateArgs, { stdio: 'inherit' });

  if (migrateResult.status !== 0) {
    console.error('Failed to apply migrations.');
    process.exit(migrateResult.status ?? 1);
  }

  console.log('Database reset complete.');
};

run();

