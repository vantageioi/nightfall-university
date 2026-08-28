CREATE TABLE `germany_programme_index` (
	`id` int AUTO_INCREMENT NOT NULL,
	`programme_id` varchar(80) NOT NULL,
	`official_name` varchar(280) NOT NULL,
	`city` varchar(180) NOT NULL,
	`region` varchar(180) NOT NULL,
	`programme_name` varchar(320) NOT NULL,
	`broad_subject_categories` varchar(420) NOT NULL,
	`field_match_basis` text,
	`programme_evidence_url` varchar(700) NOT NULL,
	`official_programme_url` varchar(700),
	`programme_language` varchar(180),
	`admission_semester` varchar(180),
	`admission_mode` varchar(240),
	`source_layer` varchar(120) NOT NULL,
	`reputation_tier` varchar(64),
	`security_infrastructure` text,
	`fee_risk_category` text,
	`syrian_baccalaureate_anabin_condition` text,
	`last_verified` varchar(32),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `germany_programme_index_id` PRIMARY KEY(`id`),
	CONSTRAINT `germany_programme_index_programme_id_unique` UNIQUE(`programme_id`)
);
--> statement-breakpoint
CREATE INDEX `germany_programme_category_idx` ON `germany_programme_index` (`broad_subject_categories`);--> statement-breakpoint
CREATE INDEX `germany_programme_region_idx` ON `germany_programme_index` (`region`);--> statement-breakpoint
CREATE INDEX `germany_programme_language_idx` ON `germany_programme_index` (`programme_language`);