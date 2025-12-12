import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';

import { getDb, type EnvWithD1 } from '@/db/client';

type Meta = { duration: number };
type StatementResult<T = unknown> = { success: boolean; results?: T[]; error?: string; meta?: Meta };

class SqlJsPreparedStatement implements D1PreparedStatement {
	constructor(private readonly db: initSqlJs.Database, private readonly sql: string, private readonly bound?: unknown[]) {}

	bind(...values: unknown[]) {
		return new SqlJsPreparedStatement(this.db, this.sql, values);
	}

	private prepare() {
		const stmt = this.db.prepare(this.sql);
		if (this.bound) stmt.bind(this.bound as initSqlJs.BindParams);
		return stmt;
	}

	async first<T = unknown>(col?: string) {
		const { results } = await this.all<T>();
		if (!results?.length) return null;
		const first = results[0] as Record<string, unknown>;
		return (col ? first?.[col] : first) ?? null;
	}

	async raw<T = unknown>() {
		const stmt = this.prepare();
		const rows: T[] = [];
		while (stmt.step()) {
			rows.push(stmt.get() as T);
		}
		stmt.free();
		return rows;
	}

	async run(): Promise<StatementResult> {
		const stmt = this.prepare();
		stmt.step();
		stmt.free();
		return { success: true, meta: { duration: 0 } };
	}

	async all<T = unknown>(): Promise<StatementResult<T>> {
		const stmt = this.prepare();
		const rows: T[] = [];
		const columns = stmt.getColumnNames();

		while (stmt.step()) {
			const values = stmt.get() as unknown[];
			const row: Record<string, unknown> = {};
			for (let i = 0; i < columns.length; i++) {
				row[columns[i]] = values[i];
			}
			rows.push(row as T);
		}
		stmt.free();

		return { results: rows, success: true, meta: { duration: 0 } };
	}
}

class SqlJsD1Database implements D1Database {
	constructor(private readonly db: initSqlJs.Database) {}

	async batch(statements: D1PreparedStatement[]): Promise<StatementResult[]> {
		return Promise.all(statements.map((stmt) => stmt.run()));
	}

	prepare(query: string): D1PreparedStatement {
		return new SqlJsPreparedStatement(this.db, query);
	}

	async dump(): Promise<ArrayBuffer> {
		return this.db.export().buffer;
	}

	async exec(query: string): Promise<StatementResult> {
		this.db.exec(query);
		return { success: true, meta: { duration: 0 } };
	}
}

const migrationDir = path.resolve(process.cwd(), 'drizzle', 'migrations');
const migrationSql = fs
	.readdirSync(migrationDir)
	.filter((file) => file.endsWith('.sql'))
	.sort()
	.map((file) => {
		const raw = fs.readFileSync(path.join(migrationDir, file), 'utf8');
		return raw.replace(/-->\s?statement-breakpoint\s?/g, '');
	});

export const createTestEnv = async () => {
	const SQL = await initSqlJs({
		locateFile: (file) => path.join(path.dirname(require.resolve('sql.js/package.json')), 'dist', file),
	});

	const sqlite = new SQL.Database();
	sqlite.exec('PRAGMA foreign_keys = ON;');
	for (const sql of migrationSql) sqlite.exec(sql);

	const env: EnvWithD1 = { reset_myself: new SqlJsD1Database(sqlite) };
	return {
		env,
		db: getDb(env),
		dispose: () => sqlite.close(),
	};
};

export const resetDb = async (env: EnvWithD1) => {
	const db = env.reset_myself;
	if (!db) return;
	await db.exec(
		[
			'DELETE FROM timeline_events;',
			'DELETE FROM timeline_notes;',
			'DELETE FROM daily_summaries;',
			'DELETE FROM goal_completions;',
			'DELETE FROM goals;',
		].join(''),
	);
};
