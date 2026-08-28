CREATE TABLE `saved_germany_programmes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`programme_id` varchar(80) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_germany_programmes_id` PRIMARY KEY(`id`),
	CONSTRAINT `saved_germany_programme_unique` UNIQUE(`user_id`,`programme_id`)
);
--> statement-breakpoint
CREATE INDEX `saved_germany_programme_student_idx` ON `saved_germany_programmes` (`user_id`);