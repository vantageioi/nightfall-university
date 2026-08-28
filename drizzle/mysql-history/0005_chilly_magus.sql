CREATE TABLE `university_requirement_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`university_id` int NOT NULL,
	`change_key` varchar(180) NOT NULL,
	`source_url` varchar(600) NOT NULL,
	`title` varchar(240) NOT NULL,
	`body` text NOT NULL,
	`read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `university_requirement_alerts_id` PRIMARY KEY(`id`),
	CONSTRAINT `university_requirement_alert_key_unique` UNIQUE(`change_key`)
);
--> statement-breakpoint
CREATE TABLE `university_requirement_watches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`university_id` int NOT NULL,
	`source_url` varchar(600) NOT NULL,
	`source_label` varchar(240) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`last_known_hash` varchar(128),
	`last_checked_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `university_requirement_watches_id` PRIMARY KEY(`id`),
	CONSTRAINT `university_requirement_watch_unique` UNIQUE(`user_id`,`university_id`)
);
--> statement-breakpoint
CREATE TABLE `university_source_caches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_url` varchar(600) NOT NULL,
	`source_label` varchar(240) NOT NULL,
	`content_hash` varchar(128) NOT NULL,
	`normalized_text` text NOT NULL,
	`summary` text,
	`last_fetched_at` timestamp NOT NULL DEFAULT (now()),
	`last_changed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `university_source_caches_id` PRIMARY KEY(`id`),
	CONSTRAINT `university_source_caches_source_url_unique` UNIQUE(`source_url`)
);
--> statement-breakpoint
CREATE TABLE `university_watch_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`preferred_hour_utc` int NOT NULL DEFAULT 10,
	`schedule_cron_task_uid` varchar(65),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `university_watch_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `university_watch_preferences_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `saved_universities` ADD `source_url` varchar(600);--> statement-breakpoint
ALTER TABLE `saved_universities` ADD `scholarship_source_url` varchar(600);--> statement-breakpoint
ALTER TABLE `saved_universities` ADD `snapshot_summary` text;--> statement-breakpoint
ALTER TABLE `saved_universities` ADD `image_url` varchar(600);--> statement-breakpoint
ALTER TABLE `saved_universities` ADD `image_attribution` varchar(240);--> statement-breakpoint
CREATE INDEX `university_requirement_alert_student_idx` ON `university_requirement_alerts` (`user_id`,`read`);--> statement-breakpoint
CREATE INDEX `university_requirement_watch_student_idx` ON `university_requirement_watches` (`user_id`,`enabled`);--> statement-breakpoint
CREATE INDEX `university_watch_preferences_schedule_idx` ON `university_watch_preferences` (`schedule_cron_task_uid`);