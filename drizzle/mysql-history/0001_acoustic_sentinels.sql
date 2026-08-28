CREATE TABLE `application_milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`university_id` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`due_label` varchar(100),
	`completed` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `application_milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `family_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`relationship` varchar(80) NOT NULL,
	`token` varchar(80) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `family_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `family_invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `personal_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` text,
	`due_label` varchar(100),
	`locale` varchar(8) NOT NULL DEFAULT 'en',
	`completed` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `personal_reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_universities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`university` varchar(200) NOT NULL,
	`location` varchar(200) NOT NULL,
	`program` varchar(200) NOT NULL,
	`deadline` varchar(80),
	`status` varchar(40) NOT NULL DEFAULT 'Saved',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_universities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `student_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`destination` varchar(200) NOT NULL,
	`graduation_year` varchar(32) NOT NULL,
	`preferred_language` varchar(8) NOT NULL DEFAULT 'en',
	`onboarding_complete` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_profiles_user_id_unique` UNIQUE(`user_id`)
);
