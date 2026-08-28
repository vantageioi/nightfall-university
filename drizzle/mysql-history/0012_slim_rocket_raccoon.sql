CREATE TABLE `programme_research_briefings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`programme_id` varchar(80) NOT NULL,
	`locale` varchar(8) NOT NULL,
	`source_url` varchar(700) NOT NULL,
	`content_hash` varchar(128) NOT NULL,
	`briefing_json` text NOT NULL,
	`generated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `programme_research_briefings_id` PRIMARY KEY(`id`),
	CONSTRAINT `programme_research_briefing_unique` UNIQUE(`user_id`,`programme_id`,`locale`)
);
--> statement-breakpoint
CREATE INDEX `programme_research_briefing_student_idx` ON `programme_research_briefings` (`user_id`,`generated_at`);