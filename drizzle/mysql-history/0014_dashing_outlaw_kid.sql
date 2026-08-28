CREATE TABLE `university_follow_up_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`follow_up_plan_id` int NOT NULL,
	`alert_key` varchar(180) NOT NULL,
	`title` varchar(240) NOT NULL,
	`body` text NOT NULL,
	`locale` varchar(8) NOT NULL DEFAULT 'en',
	`read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `university_follow_up_notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `university_follow_up_notification_key_unique` UNIQUE(`alert_key`)
);
--> statement-breakpoint
CREATE INDEX `university_follow_up_notification_student_idx` ON `university_follow_up_notifications` (`user_id`,`read`);