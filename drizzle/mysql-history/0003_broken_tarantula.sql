CREATE TABLE `deadline_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`university_id` int,
	`alert_key` varchar(180) NOT NULL,
	`title` varchar(220) NOT NULL,
	`body` text,
	`locale` varchar(8) NOT NULL DEFAULT 'en',
	`deadline_at` timestamp,
	`days_before` int,
	`read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deadline_notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `deadline_notifications_alert_key_unique` UNIQUE(`alert_key`)
);
--> statement-breakpoint
CREATE TABLE `reminder_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`remind_seven_days` boolean NOT NULL DEFAULT true,
	`remind_three_days` boolean NOT NULL DEFAULT true,
	`remind_one_day` boolean NOT NULL DEFAULT true,
	`preferred_hour_utc` int NOT NULL DEFAULT 8,
	`schedule_cron_task_uid` varchar(65),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reminder_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `reminder_preferences_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `saved_universities` ADD `tuition` varchar(160);--> statement-breakpoint
ALTER TABLE `saved_universities` ADD `scholarship_info` text;--> statement-breakpoint
ALTER TABLE `saved_universities` ADD `admission_requirements` text;--> statement-breakpoint
ALTER TABLE `saved_universities` ADD `eligibility_criteria` text;--> statement-breakpoint
ALTER TABLE `student_documents` ADD `extraction_status` varchar(40) DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE `student_documents` ADD `extracted_grades` text;--> statement-breakpoint
ALTER TABLE `student_documents` ADD `extracted_at` timestamp;--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `academic_average` varchar(80);--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `grade_scale` varchar(120);--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `academic_summary` text;--> statement-breakpoint
CREATE INDEX `deadline_notifications_student_idx` ON `deadline_notifications` (`user_id`,`read`);--> statement-breakpoint
CREATE INDEX `reminder_preferences_schedule_cron_idx` ON `reminder_preferences` (`schedule_cron_task_uid`);