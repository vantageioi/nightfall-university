CREATE TABLE `admin_intake_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`upload_id` int NOT NULL,
	`source_row_number` int NOT NULL,
	`source_digest` varchar(64) NOT NULL,
	`proposed_profile_json` text NOT NULL,
	`extraction_confidence` varchar(16) NOT NULL,
	`review_status` enum('pending_review','approved','rejected','committed') NOT NULL DEFAULT 'pending_review',
	`reviewer_user_id` int,
	`review_note` text,
	`prospective_student_id` int,
	`reviewed_at` timestamp,
	`committed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_intake_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_intake_record_source_unique` UNIQUE(`upload_id`,`source_row_number`),
	CONSTRAINT `admin_intake_record_digest_unique` UNIQUE(`source_digest`)
);
--> statement-breakpoint
CREATE TABLE `admin_intake_uploads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uploaded_by_user_id` int NOT NULL,
	`source_kind` enum('cv','spreadsheet') NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`mime_type` varchar(120) NOT NULL,
	`byte_size` int NOT NULL,
	`content_hash` varchar(64) NOT NULL,
	`storage_key` varchar(512) NOT NULL,
	`file_url` varchar(600) NOT NULL,
	`status` enum('uploaded','extracting','ready_for_review','failed','rejected','committed') NOT NULL DEFAULT 'uploaded',
	`extracted_text` text,
	`extraction_note` text,
	`source_row_count` int NOT NULL DEFAULT 0,
	`ai_invocation_count` int NOT NULL DEFAULT 0,
	`failure_reason` text,
	`committed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `admin_intake_uploads_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_intake_upload_content_hash_unique` UNIQUE(`content_hash`)
);
--> statement-breakpoint
CREATE TABLE `prospective_students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_record_id` int NOT NULL,
	`preferred_name` varchar(160),
	`contact_email` varchar(320),
	`phone_number` varchar(80),
	`nationality` varchar(120),
	`high_school_diploma_origin` varchar(200),
	`study_direction` varchar(240),
	`academic_average` varchar(80),
	`grade_scale` varchar(120),
	`qualifications` text,
	`source_summary` text,
	`created_by_user_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prospective_students_id` PRIMARY KEY(`id`),
	CONSTRAINT `prospective_students_source_record_id_unique` UNIQUE(`source_record_id`)
);
--> statement-breakpoint
CREATE INDEX `admin_intake_record_review_idx` ON `admin_intake_records` (`review_status`,`created_at`);--> statement-breakpoint
CREATE INDEX `admin_intake_upload_status_idx` ON `admin_intake_uploads` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `prospective_student_email_idx` ON `prospective_students` (`contact_email`);--> statement-breakpoint
CREATE INDEX `prospective_student_created_by_idx` ON `prospective_students` (`created_by_user_id`,`created_at`);