import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const goals = sqliteTable('goals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  dailyTargetCount: integer('daily_target_count').notNull().default(1),
  icon: text('icon').notNull().default('Target'),
  color: text('color').notNull().default('#10b981'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const goalCompletions = sqliteTable(
  'goal_completions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    goalId: integer('goal_id')
      .notNull()
      .references(() => goals.id, { onDelete: 'cascade' }),
    date: text('date').notNull(), // YYYY-MM-DD
    count: integer('count').notNull().default(0),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    goalDateUnique: uniqueIndex('goal_date_unique').on(table.goalId, table.date),
  }),
);

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;

export type GoalCompletion = typeof goalCompletions.$inferSelect;
export type NewGoalCompletion = typeof goalCompletions.$inferInsert;

export const timelineEvents = sqliteTable(
	'timeline_events',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		date: text('date').notNull(), // YYYY-MM-DD (UTC)
		type: text('type').notNull(), // note | checkin | goal_created | goal_deleted | ...
		goalId: integer('goal_id').references(() => goals.id, { onDelete: 'set null' }),
		payload: text('payload', { mode: 'json' }).$type<Record<string, unknown> | null>(),
		createdAt: text('created_at')
			.notNull()
			.default(sql`CURRENT_TIMESTAMP`),
	},
	(table) => ({
		dateIdx: index('timeline_events_date_idx').on(table.date),
		typeIdx: index('timeline_events_type_idx').on(table.type),
		goalIdx: index('timeline_events_goal_idx').on(table.goalId),
		dateCreatedIdx: index('timeline_events_date_created_idx').on(table.date, table.createdAt),
	}),
);

export const timelineNotes = sqliteTable('timeline_notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  content: text('content').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD (UTC)
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type TimelineNote = typeof timelineNotes.$inferSelect;
export type NewTimelineNote = typeof timelineNotes.$inferInsert;
export type TimelineEventRow = typeof timelineEvents.$inferSelect;
export type NewTimelineEvent = typeof timelineEvents.$inferInsert;

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
