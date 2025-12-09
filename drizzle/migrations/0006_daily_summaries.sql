CREATE TABLE `daily_summaries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`total_goals` integer NOT NULL,
	`completed_goals` integer NOT NULL,
	`success_rate` real NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `daily_summaries_date_unique` ON `daily_summaries` (`date`);
