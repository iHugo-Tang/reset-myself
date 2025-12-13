import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const DB_NAME = 'reset_myself';

// Tables in dependency order
const ALL_TABLES = [
  'goals',
  'goal_completions',
  'timeline_events',
  'timeline_notes',
  'daily_summaries',
];

type Row = Record<string, unknown>;

function runCommand(command: string, args: string[], captureOutput = false) {
  const result = spawnSync(command, args, {
    stdio: captureOutput ? 'pipe' : 'inherit',
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024, // 50MB
  });

  if (result.status !== 0) {
    if (captureOutput) console.error(result.stderr);
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }

  return result.stdout;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function fetchLocalData(table: string) {
  console.log(`Fetching ${table} from local...`);
  const jsonOutput = runCommand(
    'wrangler',
    ['d1', 'execute', DB_NAME, '--local', '--command', `SELECT * FROM ${table}`, '--json'],
    true
  );

  try {
    const startIndex = jsonOutput.indexOf('[');
    const endIndex = jsonOutput.lastIndexOf(']');
    
    if (startIndex === -1 || endIndex === -1) {
       throw new Error('No JSON array found in output');
    }

    const cleanJson = jsonOutput.substring(startIndex, endIndex + 1);
    const parsed: unknown = JSON.parse(cleanJson);
    
    if (Array.isArray(parsed) && parsed.length > 0 && isRecord(parsed[0])) {
      const results = parsed[0].results;
      if (Array.isArray(results)) {
        return results.filter(isRecord);
      }
    }
    return [];
  } catch (e) {
    console.error('Failed to parse JSON output for table', table);
    console.error('Raw Output snippet:', jsonOutput.slice(0, 200));
    throw e;
  }
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'object') {
     return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

function generateInsertSql(table: string, rows: Row[]) {
  if (rows.length === 0) return '';
  
  const columns = Array.from(new Set(rows.flatMap(Object.keys)));
  const colNames = columns.join(', ');
  
  const values = rows.map(row => {
    const rowValues = columns.map(col => formatValue(row[col]));
    return `(${rowValues.join(', ')})`;
  }).join(',\n');
  
  return `INSERT INTO ${table} (${colNames}) VALUES \n${values};\n`;
}

async function askConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  let tablesToSync = ALL_TABLES;

  if (args.length > 0) {
    const invalidTables = args.filter(t => !ALL_TABLES.includes(t));
    if (invalidTables.length > 0) {
      console.error(`Invalid tables: ${invalidTables.join(', ')}`);
      console.error(`Available tables: ${ALL_TABLES.join(', ')}`);
      process.exit(1);
    }
    tablesToSync = args;
  }

  console.log('Syncing Local to Prod (Remote)...');
  console.log('Tables to sync:', tablesToSync.join(', '));
  console.log('WARNING: This will overwrite data in the remote database for the selected tables.');
  
  const confirmed = await askConfirmation('Are you sure you want to continue?');
  if (!confirmed) {
    console.log('Aborted.');
    process.exit(0);
  }

  let fullSql = 'PRAGMA foreign_keys = OFF;\n';

  for (const table of tablesToSync) {
    const rows = fetchLocalData(table);
    console.log(`  Fetched ${rows.length} rows for ${table} from local`);
    
    // Clear remote table before inserting
    fullSql += `DELETE FROM ${table};\n`;
    
    if (rows.length > 0) {
      fullSql += generateInsertSql(table, rows);
    }
  }

  fullSql += 'PRAGMA foreign_keys = ON;\n';

  const sqlFile = path.resolve('temp_sync_up.sql');
  fs.writeFileSync(sqlFile, fullSql);
  
  console.log('Applying data to REMOTE database...');
  try {
      runCommand('wrangler', ['d1', 'execute', DB_NAME, '--remote', '--file', sqlFile]);
      console.log('Sync complete!');
  } catch (e) {
      console.error('Failed to apply data to remote database');
      throw e;
  } finally {
      if (fs.existsSync(sqlFile)) {
        fs.unlinkSync(sqlFile);
      }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
