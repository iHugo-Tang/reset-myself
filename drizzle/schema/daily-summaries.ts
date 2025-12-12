import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const dailySummaries = sqliteTable(
	'daily_summaries',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		date: text('date').notNull(), // YYYY-MM-DD (UTC)
		totalGoals: integer('total_goals').notNull(),
		completedGoals: integer('completed_goals').notNull(),
		successRate: real('success_rate').notNull(),
		createdAt: text('created_at')
			.notNull()
			.default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => ({
		dateUnique: uniqueIndex('daily_summaries_date_unique').on(table.date),
	}),
);

export type DailySummaryRow = typeof dailySummaries.$inferSelect;
export type NewDailySummaryRow = typeof dailySummaries.$inferInsert;

