CREATE TABLE `student_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`document_type` varchar(80) NOT NULL DEFAULT 'Transcript',
	`file_name` varchar(255) NOT NULL,
	`mime_type` varchar(120) NOT NULL,
	`storage_key` varchar(512) NOT NULL,
	`file_url` varchar(600) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `student_documents_id` PRIMARY KEY(`id`)
);
