ALTER TABLE `study_logs` RENAME TO `study_stats`;--> statement-breakpoint
CREATE TABLE `rateLimit` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text,
	`count` integer,
	`lastRequest` integer
);
--> statement-breakpoint
CREATE INDEX `rateLimit_key_idx` ON `rateLimit` (`key`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_study_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`subtitle` text,
	`start_date_time` text NOT NULL,
	`end_date_time` text NOT NULL,
	`date` text NOT NULL,
	`study_hours` integer NOT NULL,
	`tags` text,
	`user_id` text NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_study_stats`("id", "title", "subtitle", "start_date_time", "end_date_time", "date", "study_hours", "tags", "user_id", "createdAt") SELECT "id", "title", "subtitle", "start_date_time", "end_date_time", "date", "study_hours", "tags", "user_id", "createdAt" FROM `study_stats`;--> statement-breakpoint
DROP TABLE `study_stats`;--> statement-breakpoint
ALTER TABLE `__new_study_stats` RENAME TO `study_stats`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `user_date_index` ON `study_stats` (`user_id`,`date`);--> statement-breakpoint
DROP INDEX `session_userId_idx`;--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`,`token`);--> statement-breakpoint
CREATE INDEX `user_email_idx` ON `user` (`email`);