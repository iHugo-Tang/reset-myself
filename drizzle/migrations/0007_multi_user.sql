-- Add user scoping to all business data tables.
-- Existing rows are assigned to a legacy user id so they become inaccessible
-- to real Supabase users unless explicitly migrated.

ALTER TABLE `goals` ADD `user_id` text DEFAULT '81d7dde0-ba6a-4e9d-b087-b70190e92224' NOT NULL;
--> statement-breakpoint
CREATE INDEX `goals_user_created_idx` ON `goals` (`user_id`,`created_at`);
--> statement-breakpoint

ALTER TABLE `timeline_notes` ADD `user_id` text DEFAULT '81d7dde0-ba6a-4e9d-b087-b70190e92224' NOT NULL;
--> statement-breakpoint
CREATE INDEX `timeline_notes_user_date_idx` ON `timeline_notes` (`user_id`,`date`);
--> statement-breakpoint

ALTER TABLE `timeline_events` ADD `user_id` text DEFAULT '81d7dde0-ba6a-4e9d-b087-b70190e92224' NOT NULL;
--> statement-breakpoint
CREATE INDEX `timeline_events_user_date_created_idx` ON `timeline_events` (`user_id`,`date`,`created_at`,`id`);
--> statement-breakpoint

ALTER TABLE `daily_summaries` ADD `user_id` text DEFAULT '81d7dde0-ba6a-4e9d-b087-b70190e92224' NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS `daily_summaries_date_unique`;
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_summaries_user_date_unique` ON `daily_summaries` (`user_id`,`date`);

--> statement-breakpoint
ALTER TABLE `goal_completions` ADD `user_id` text DEFAULT '81d7dde0-ba6a-4e9d-b087-b70190e92224' NOT NULL;
--> statement-breakpoint
CREATE INDEX `goal_completions_user_date_idx` ON `goal_completions` (`user_id`,`date`);
