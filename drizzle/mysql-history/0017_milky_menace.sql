CREATE TABLE `student_consultation_cycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`cycle_key` varchar(32) NOT NULL,
	`included_uses` int NOT NULL DEFAULT 3,
	`used_count` int NOT NULL DEFAULT 0,
	`last_consulted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_consultation_cycles_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_consultation_cycle_unique` UNIQUE(`user_id`,`cycle_key`)
);
--> statement-breakpoint
ALTER TABLE `saved_germany_programmes` ADD `priority_rank` int;--> statement-breakpoint
ALTER TABLE `saved_germany_programmes` ADD `priority_updated_at` timestamp;--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `contact_email` varchar(320);--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `phone_number` varchar(80);--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `high_school_diploma_origin` varchar(200);--> statement-breakpoint
CREATE INDEX `student_consultation_cycle_student_idx` ON `student_consultation_cycles` (`user_id`,`updated_at`);