import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { goals } from './goals';

export const timelineEvents = sqliteTable(
  'timeline_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(), // YYYY-MM-DD (UTC)
    type: text('type').notNull(), // note | checkin | goal_created | goal_deleted | ...
    goalId: integer('goal_id').references(() => goals.id, {
      onDelete: 'set null',
    }),
    payload: text('payload', { mode: 'json' }).$type<Record<
      string,
      unknown
    > | null>(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    dateIdx: index('timeline_events_date_idx').on(table.date),
    typeIdx: index('timeline_events_type_idx').on(table.type),
    goalIdx: index('timeline_events_goal_idx').on(table.goalId),
    dateCreatedIdx: index('timeline_events_date_created_idx').on(
      table.date,
      table.createdAt
    ),
  })
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
