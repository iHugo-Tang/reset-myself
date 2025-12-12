import fs from 'node:fs';
import path from 'node:path';
// `sql.js` doesn't ship TS types in this repo; use require() to keep this test helper typecheck-friendly.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const initSqlJs = require('sql.js');

import { getDb, type EnvWithD1 } from '@/db/client';

const makeMeta = (): D1Meta & Record<string, unknown> => ({
	duration: 0,
	size_after: 0,
	rows_read: 0,
	rows_written: 0,
	last_row_id: 0,
	changed_db: false,
	changes: 0,
});

class SqlJsPreparedStatement implements D1PreparedStatement {
	constructor(
		private readonly db: any,
		private readonly sql: string,
		private readonly bound?: unknown[]
	) {}

	bind(...values: unknown[]) {
		return new SqlJsPreparedStatement(this.db, this.sql, values);
	}

	private prepare() {
		const stmt = this.db.prepare(this.sql);
		if (this.bound) stmt.bind(this.bound as any);
		return stmt;
	}

	async first<T = unknown>(colName: string): Promise<T | null>;
	async first<T = Record<string, unknown>>(): Promise<T | null>;
	async first<T = unknown>(colName?: string) {
		const res = await this.all<Record<string, unknown>>();
		if (!res.results.length) return null;
		const firstRow = res.results[0] as Record<string, unknown>;
		return (colName ? (firstRow[colName] as T) : (firstRow as T)) ?? null;
	}

	async raw<T = unknown[]>(options: {
		columnNames: true;
	}): Promise<[string[], ...T[]]>;
	async raw<T = unknown[]>(options?: { columnNames?: false }): Promise<T[]>;
	async raw<T = unknown[]>(options?: { columnNames?: boolean }) {
		const stmt = this.prepare();
		const rows: T[] = [];
		const columns = stmt.getColumnNames();
		while (stmt.step()) rows.push(stmt.get() as T);
		stmt.free();

		if (options?.columnNames) {
			return [columns, ...(rows as any[])] as [string[], ...T[]];
		}
		return rows;
	}

	async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
		const stmt = this.prepare();
		stmt.step();
		stmt.free();
		return { success: true, results: [] as T[], meta: makeMeta() };
	}

	async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
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

		return { results: rows, success: true, meta: makeMeta() };
	}
}

class SqlJsD1Database implements D1Database {
	constructor(private readonly db: any) {}

	async batch<T = unknown>(
		statements: D1PreparedStatement[]
	): Promise<D1Result<T>[]> {
		return Promise.all(statements.map((stmt) => stmt.run<T>()));
	}

	prepare(query: string): D1PreparedStatement {
		return new SqlJsPreparedStatement(this.db, query);
	}

	async dump(): Promise<ArrayBuffer> {
		return this.db.export().buffer;
	}

	async exec(query: string): Promise<D1ExecResult> {
		this.db.exec(query);
		return { count: 0, duration: 0 };
	}

	withSession(): D1DatabaseSession {
		return {
			prepare: (query: string) => this.prepare(query),
			batch: <T = unknown>(statements: D1PreparedStatement[]) =>
				this.batch<T>(statements),
			getBookmark: () => null,
		} as unknown as D1DatabaseSession;
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
		locateFile: (file: string) =>
			path.join(
				path.dirname(require.resolve('sql.js/package.json')),
				'dist',
				file
			),
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
		].join('')
	);
};
