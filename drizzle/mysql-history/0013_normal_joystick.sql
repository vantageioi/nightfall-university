CREATE TABLE `student_inbox_connections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`provider` enum('gmail') NOT NULL DEFAULT 'gmail',
	`email_address` varchar(320) NOT NULL,
	`encrypted_refresh_token` text NOT NULL,
	`gmail_history_id` varchar(120),
	`watch_expires_at` timestamp,
	`connected_at` timestamp NOT NULL DEFAULT (now()),
	`last_synced_at` timestamp,
	`disconnected_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `student_inbox_connections_id` PRIMARY KEY(`id`),
	CONSTRAINT `student_inbox_connections_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `university_communication_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`communication_id` int,
	`follow_up_plan_id` int,
	`event_type` enum('draft_created','draft_updated','student_approved','provider_send_requested','sent','send_failed','reply_imported','reply_categorized','follow_up_planned','follow_up_completed','inbox_connected','inbox_disconnected') NOT NULL,
	`event_json` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `university_communication_audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `university_communications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`university_id` int NOT NULL,
	`contact_id` int,
	`direction` enum('outbound','inbound') NOT NULL,
	`status` enum('draft','ready_for_review','student_approved','provider_send_requested','sent','send_failed','received','needs_review','archived') NOT NULL DEFAULT 'draft',
	`subject` varchar(998) NOT NULL,
	`body` text NOT NULL,
	`category` enum('general','document_request','interview','decision','next_step','needs_review') NOT NULL DEFAULT 'general',
	`provider_message_id` varchar(255),
	`provider_thread_id` varchar(255),
	`student_approved_at` timestamp,
	`sent_at` timestamp,
	`received_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `university_communications_id` PRIMARY KEY(`id`),
	CONSTRAINT `university_communication_provider_id_unique` UNIQUE(`user_id`,`provider_message_id`)
);
--> statement-breakpoint
CREATE TABLE `university_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`university_id` int NOT NULL,
	`contact_name` varchar(160),
	`contact_role` varchar(160),
	`email` varchar(320) NOT NULL,
	`phone` varchar(80),
	`portal_url` varchar(700),
	`relationship_stage` enum('cold','warm','active','responded','paused') NOT NULL DEFAULT 'cold',
	`contact_preference` enum('email','portal','do_not_contact') NOT NULL DEFAULT 'email',
	`student_confirmed_at` timestamp NOT NULL DEFAULT (now()),
	`last_contact_at` timestamp,
	`next_follow_up_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `university_contacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `university_contact_unique` UNIQUE(`user_id`,`university_id`,`email`)
);
--> statement-breakpoint
CREATE TABLE `university_follow_up_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`university_id` int NOT NULL,
	`contact_id` int,
	`due_at` timestamp NOT NULL,
	`reason` varchar(240) NOT NULL,
	`status` enum('planned','draft_ready','completed','cancelled') NOT NULL DEFAULT 'planned',
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `university_follow_up_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `university_communication_audit_student_idx` ON `university_communication_audit_events` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `university_communication_audit_message_idx` ON `university_communication_audit_events` (`communication_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `university_communication_student_idx` ON `university_communications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `university_communication_contact_idx` ON `university_communications` (`contact_id`,`status`);--> statement-breakpoint
CREATE INDEX `university_contact_student_idx` ON `university_contacts` (`user_id`,`relationship_stage`);--> statement-breakpoint
CREATE INDEX `university_follow_up_student_idx` ON `university_follow_up_plans` (`user_id`,`status`,`due_at`);--> statement-breakpoint
CREATE INDEX `university_follow_up_contact_idx` ON `university_follow_up_plans` (`contact_id`);