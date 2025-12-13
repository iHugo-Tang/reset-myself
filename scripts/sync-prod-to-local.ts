import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DB_NAME = 'reset_myself';

const TABLES = [
  'goals',
  'goal_completions',
  'timeline_events',
  'timeline_notes',
  'daily_summaries',
];

function runCommand(command: string, args: string[], captureOutput = false) {
  const result = spawnSync(command, args, {
    stdio: captureOutput ? 'pipe' : 'inherit',
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024, // 50MB buffer to be safe
  });

  if (result.status !== 0) {
    if (captureOutput) console.error(result.stderr);
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }

  return result.stdout;
}

function fetchTableData(table: string) {
  console.log(`Fetching ${table} from remote...`);
  const jsonOutput = runCommand(
    'wrangler',
    ['d1', 'execute', DB_NAME, '--remote', '--command', `SELECT * FROM ${table}`, '--json'],
    true
  );

  try {
    // Find the start and end of the JSON array to avoid parsing log messages
    const startIndex = jsonOutput.indexOf('[');
    const endIndex = jsonOutput.lastIndexOf(']');
    
    if (startIndex === -1 || endIndex === -1) {
       throw new Error('No JSON array found in output');
    }

    const cleanJson = jsonOutput.substring(startIndex, endIndex + 1);
    const parsed = JSON.parse(cleanJson);
    
    // Wrangler returns an array of result objects. Usually the first query result is at index 0.
    // Structure: [ { results: [...], success: true, ... } ]
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].results) {
      return parsed[0].results as any[];
    }
    return [];
  } catch (e) {
    console.error('Failed to parse JSON output for table', table);
    console.error('Raw Output snippet:', jsonOutput.slice(0, 200));
    throw e;
  }
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'object') {
     // For JSON columns or other objects, stringify and escape
     return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  }
  // string
  return `'${String(val).replace(/'/g, "''")}'`;
}

function generateInsertSql(table: string, rows: any[]) {
  if (rows.length === 0) return '';
  
  // Get all unique keys from all rows to ensure we handle missing columns in some rows (unlikely in SQL but good practice)
  const columns = Array.from(new Set(rows.flatMap(Object.keys)));
  const colNames = columns.join(', ');
  
  const values = rows.map(row => {
    const rowValues = columns.map(col => formatValue(row[col]));
    return `(${rowValues.join(', ')})`;
  }).join(',\n');
  
  return `INSERT INTO ${table} (${colNames}) VALUES \n${values};\n`;
}

async function main() {
  console.log('Syncing Prod to Local...');

  // 1. Reset Local DB
  console.log('Resetting local database...');
  runCommand('npx', ['tsx', 'scripts/reset-db.ts']);

  // 2. Fetch and Generate SQL
  // PRAGMA foreign_keys = OFF is important to avoid constraint violations during insert order
  let fullSql = 'PRAGMA foreign_keys = OFF;\nBEGIN TRANSACTION;\n';

  for (const table of TABLES) {
    const rows = fetchTableData(table);
    console.log(`  Fetched ${rows.length} rows for ${table}`);
    if (rows.length > 0) {
      fullSql += generateInsertSql(table, rows);
    }
  }

  fullSql += 'COMMIT;\nPRAGMA foreign_keys = ON;\n';

  // 3. Write SQL to file
  const sqlFile = path.resolve('temp_sync.sql');
  fs.writeFileSync(sqlFile, fullSql);
  
  // 4. Execute SQL locally
  console.log('Applying data to local database...');
  try {
      // Use --file to execute the SQL
      runCommand('wrangler', ['d1', 'execute', DB_NAME, '--local', '--file', sqlFile]);
  } catch (e) {
      console.error('Failed to apply data to local database');
      throw e;
  } finally {
      if (fs.existsSync(sqlFile)) {
        fs.unlinkSync(sqlFile);
      }
  }
  
  console.log('Sync complete!');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

