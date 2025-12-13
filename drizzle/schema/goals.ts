import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const goals = sqliteTable(
  'goals',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull(),
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
  },
  (table) => ({
    userCreatedIdx: index('goals_user_created_idx').on(
      table.userId,
      table.createdAt
    ),
  })
);

export const goalCompletions = sqliteTable(
  'goal_completions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull(),
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
    userDateIdx: index('goal_completions_user_date_idx').on(
      table.userId,
      table.date
    ),
    goalDateUnique: uniqueIndex('goal_date_unique').on(
      table.goalId,
      table.date
    ),
  })
);

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;

export type GoalCompletion = typeof goalCompletions.$inferSelect;
export type NewGoalCompletion = typeof goalCompletions.$inferInsert;
