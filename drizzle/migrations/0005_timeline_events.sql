CREATE TABLE `timeline_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`goal_id` integer,
	`payload` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `timeline_events_date_idx` ON `timeline_events` (`date`);
--> statement-breakpoint
CREATE INDEX `timeline_events_type_idx` ON `timeline_events` (`type`);
--> statement-breakpoint
CREATE INDEX `timeline_events_goal_idx` ON `timeline_events` (`goal_id`);
--> statement-breakpoint
CREATE INDEX `timeline_events_date_created_idx` ON `timeline_events` (`date`,`created_at`);
