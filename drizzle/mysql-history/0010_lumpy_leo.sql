CREATE TABLE `germany_programme_deadline_handoffs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`programme_id` varchar(80) NOT NULL,
	`deadline_at` timestamp NOT NULL,
	`official_evidence_url` varchar(700) NOT NULL,
	`reviewed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `germany_programme_deadline_handoffs_id` PRIMARY KEY(`id`),
	CONSTRAINT `germany_programme_deadline_unique` UNIQUE(`user_id`,`programme_id`)
);
--> statement-breakpoint
CREATE INDEX `germany_programme_deadline_student_idx` ON `germany_programme_deadline_handoffs` (`user_id`,`deadline_at`);