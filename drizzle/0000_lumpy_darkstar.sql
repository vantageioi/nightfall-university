CREATE TYPE "public"."admin_intake_records_review_status" AS ENUM('pending_review', 'approved', 'rejected', 'committed');--> statement-breakpoint
CREATE TYPE "public"."admin_intake_uploads_source_kind" AS ENUM('cv', 'spreadsheet');--> statement-breakpoint
CREATE TYPE "public"."admin_intake_uploads_status" AS ENUM('uploaded', 'extracting', 'ready_for_review', 'failed', 'rejected', 'committed');--> statement-breakpoint
CREATE TYPE "public"."application_events_country" AS ENUM('germany', 'italy');--> statement-breakpoint
CREATE TYPE "public"."application_events_event_type" AS ENUM('programme_saved', 'programme_archived', 'programme_priority_set', 'programme_priority_cleared', 'decision_notes_updated', 'consultation_completed', 'document_uploaded', 'document_verified', 'deadline_confirmed', 'communication_drafted', 'communication_approved', 'communication_sent', 'communication_reply_received', 'follow_up_planned', 'follow_up_completed', 'application_submitted', 'admission_offer_received', 'application_rejected');--> statement-breakpoint
CREATE TYPE "public"."student_inbox_connections_provider" AS ENUM('gmail');--> statement-breakpoint
CREATE TYPE "public"."university_communication_audit_events_event_type" AS ENUM('draft_created', 'draft_updated', 'student_approved', 'provider_send_requested', 'sent', 'send_failed', 'reply_imported', 'reply_categorized', 'follow_up_planned', 'follow_up_completed', 'inbox_connected', 'inbox_disconnected');--> statement-breakpoint
CREATE TYPE "public"."university_communications_category" AS ENUM('general', 'document_request', 'interview', 'decision', 'next_step', 'needs_review');--> statement-breakpoint
CREATE TYPE "public"."university_communications_direction" AS ENUM('outbound', 'inbound');--> statement-breakpoint
CREATE TYPE "public"."university_communications_status" AS ENUM('draft', 'ready_for_review', 'student_approved', 'provider_send_requested', 'sent', 'send_failed', 'received', 'needs_review', 'archived');--> statement-breakpoint
CREATE TYPE "public"."university_contacts_contact_preference" AS ENUM('email', 'portal', 'do_not_contact');--> statement-breakpoint
CREATE TYPE "public"."university_contacts_relationship_stage" AS ENUM('cold', 'warm', 'active', 'responded', 'paused');--> statement-breakpoint
CREATE TYPE "public"."university_follow_up_plans_status" AS ENUM('planned', 'draft_ready', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."users_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "admin_intake_records" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_intake_records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"upload_id" integer NOT NULL,
	"source_row_number" integer NOT NULL,
	"source_digest" varchar(64) NOT NULL,
	"proposed_profile_json" text NOT NULL,
	"extraction_confidence" varchar(16) NOT NULL,
	"review_status" "admin_intake_records_review_status" DEFAULT 'pending_review' NOT NULL,
	"reviewer_user_id" integer,
	"review_note" text,
	"prospective_student_id" integer,
	"reviewed_at" timestamp,
	"committed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_intake_uploads" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "admin_intake_uploads_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uploaded_by_user_id" integer NOT NULL,
	"source_kind" "admin_intake_uploads_source_kind" NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"byte_size" integer NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"storage_key" varchar(512) NOT NULL,
	"file_url" varchar(600) NOT NULL,
	"status" "admin_intake_uploads_status" DEFAULT 'uploaded' NOT NULL,
	"extracted_text" text,
	"extraction_note" text,
	"source_row_count" integer DEFAULT 0 NOT NULL,
	"ai_invocation_count" integer DEFAULT 0 NOT NULL,
	"failure_reason" text,
	"committed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "application_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"programme_id" varchar(80),
	"country" "application_events_country",
	"university_id" integer,
	"event_type" "application_events_event_type" NOT NULL,
	"event_json" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_milestones" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "application_milestones_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"university_id" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"due_label" varchar(100),
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deadline_notifications" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "deadline_notifications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"university_id" integer,
	"alert_key" varchar(180) NOT NULL,
	"title" varchar(220) NOT NULL,
	"body" text,
	"locale" varchar(8) DEFAULT 'en' NOT NULL,
	"deadline_at" timestamp,
	"days_before" integer,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "family_invites" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "family_invites_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"email" varchar(320) NOT NULL,
	"relationship" varchar(80) NOT NULL,
	"token" varchar(80) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "family_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "germany_programme_deadline_handoffs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "germany_programme_deadline_handoffs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"programme_id" varchar(80) NOT NULL,
	"deadline_at" timestamp NOT NULL,
	"official_evidence_url" varchar(700) NOT NULL,
	"reviewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "germany_programme_index" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "germany_programme_index_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"programme_id" varchar(80) NOT NULL,
	"official_name" varchar(280) NOT NULL,
	"city" varchar(180) NOT NULL,
	"region" varchar(180) NOT NULL,
	"programme_name" varchar(320) NOT NULL,
	"broad_subject_categories" varchar(420) NOT NULL,
	"field_match_basis" text,
	"programme_evidence_url" varchar(700) NOT NULL,
	"official_programme_url" varchar(700),
	"programme_language" varchar(180),
	"admission_semester" varchar(180),
	"admission_mode" varchar(240),
	"source_layer" varchar(120) NOT NULL,
	"reputation_tier" varchar(64),
	"security_infrastructure" text,
	"fee_risk_category" text,
	"syrian_baccalaureate_anabin_condition" text,
	"last_verified" varchar(32),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "germany_programme_index_programme_id_unique" UNIQUE("programme_id")
);
--> statement-breakpoint
CREATE TABLE "italy_programme_index" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "italy_programme_index_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"programme_id" varchar(80) NOT NULL,
	"institution_name" varchar(320) NOT NULL,
	"city" varchar(180) NOT NULL,
	"region" varchar(180) NOT NULL,
	"legal_status" varchar(120),
	"public_only_comparable" boolean NOT NULL,
	"programme_name_en" varchar(400),
	"programme_name_it" varchar(400),
	"programme_name_display" varchar(400) NOT NULL,
	"degree_level_en" varchar(120),
	"degree_class_code" varchar(32),
	"cun_area" varchar(16),
	"duration_years" varchar(16),
	"programme_language" varchar(60),
	"admissions_access_type_en" varchar(240),
	"official_programme_url" varchar(700),
	"universitaly_reference_url" varchar(900) NOT NULL,
	"health_category" varchar(60),
	"technology_engineering_category" varchar(60),
	"priority_scope" varchar(60),
	"fee_basis" text,
	"scholarship_status" text,
	"international_student_note" text,
	"last_verified_utc" varchar(40),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "italy_programme_index_programme_id_unique" UNIQUE("programme_id")
);
--> statement-breakpoint
CREATE TABLE "personal_reminders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "personal_reminders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"title" varchar(200) NOT NULL,
	"body" text,
	"due_label" varchar(100),
	"locale" varchar(8) DEFAULT 'en' NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programme_research_briefings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "programme_research_briefings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"programme_id" varchar(80) NOT NULL,
	"locale" varchar(8) NOT NULL,
	"source_url" varchar(700) NOT NULL,
	"content_hash" varchar(128) NOT NULL,
	"briefing_json" text NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospective_students" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "prospective_students_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source_record_id" integer NOT NULL,
	"preferred_name" varchar(160),
	"contact_email" varchar(320),
	"phone_number" varchar(80),
	"nationality" varchar(120),
	"high_school_diploma_origin" varchar(200),
	"study_direction" varchar(240),
	"academic_average" varchar(80),
	"grade_scale" varchar(120),
	"qualifications" text,
	"source_summary" text,
	"created_by_user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prospective_students_source_record_id_unique" UNIQUE("source_record_id")
);
--> statement-breakpoint
CREATE TABLE "reminder_preferences" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reminder_preferences_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"remind_seven_days" boolean DEFAULT true NOT NULL,
	"remind_three_days" boolean DEFAULT true NOT NULL,
	"remind_one_day" boolean DEFAULT true NOT NULL,
	"preferred_hour_utc" integer DEFAULT 8 NOT NULL,
	"schedule_cron_task_uid" varchar(65),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reminder_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "saved_germany_programmes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "saved_germany_programmes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"programme_id" varchar(80) NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"priority_rank" integer,
	"priority_updated_at" timestamp,
	"archived_at" timestamp,
	"decision_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_italy_programmes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "saved_italy_programmes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"programme_id" varchar(80) NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"priority_rank" integer,
	"priority_updated_at" timestamp,
	"archived_at" timestamp,
	"decision_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_universities" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "saved_universities_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"university" varchar(200) NOT NULL,
	"location" varchar(200) NOT NULL,
	"program" varchar(200) NOT NULL,
	"source_url" varchar(600),
	"scholarship_source_url" varchar(600),
	"snapshot_summary" text,
	"image_url" varchar(600),
	"image_attribution" varchar(240),
	"deadline" varchar(80),
	"tuition" varchar(160),
	"scholarship_info" text,
	"admission_requirements" text,
	"eligibility_criteria" text,
	"status" varchar(40) DEFAULT 'Saved' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_consultation_cycles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "student_consultation_cycles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"cycle_key" varchar(32) NOT NULL,
	"included_uses" integer DEFAULT 3 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"last_consulted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_documents" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "student_documents_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"document_type" varchar(80) DEFAULT 'Transcript' NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"storage_key" varchar(512) NOT NULL,
	"file_url" varchar(600) NOT NULL,
	"extraction_status" varchar(40) DEFAULT 'not_started' NOT NULL,
	"extracted_grades" text,
	"extracted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_fit_profiles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "student_fit_profiles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"study_direction" varchar(240) NOT NULL,
	"study_level" varchar(80),
	"academic_average" varchar(80),
	"grade_scale" varchar(120),
	"qualifications" text,
	"nationality" varchar(120),
	"language_comfort" varchar(320),
	"tuition_budget_band" varchar(80),
	"funding_route" varchar(80),
	"has_sponsor" boolean DEFAULT false NOT NULL,
	"priorities" text,
	"matching_consent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_fit_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "student_inbox_connections" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "student_inbox_connections_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"provider" "student_inbox_connections_provider" DEFAULT 'gmail' NOT NULL,
	"email_address" varchar(320) NOT NULL,
	"encrypted_refresh_token" text NOT NULL,
	"gmail_history_id" varchar(120),
	"watch_expires_at" timestamp,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"last_synced_at" timestamp,
	"disconnected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_inbox_connections_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "student_profiles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"preferred_name" varchar(120),
	"contact_email" varchar(320),
	"phone_number" varchar(80),
	"destination" varchar(200) NOT NULL,
	"graduation_year" varchar(32) NOT NULL,
	"high_school_diploma_origin" varchar(200),
	"preferred_language" varchar(8) DEFAULT 'en' NOT NULL,
	"academic_average" varchar(80),
	"grade_scale" varchar(120),
	"academic_summary" text,
	"last_viewed_comparison_university_id" integer,
	"gemini_api_key_sealed" text,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "university_communication_audit_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "university_communication_audit_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"communication_id" integer,
	"follow_up_plan_id" integer,
	"event_type" "university_communication_audit_events_event_type" NOT NULL,
	"event_json" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "university_communications" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "university_communications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"university_id" integer NOT NULL,
	"contact_id" integer,
	"direction" "university_communications_direction" NOT NULL,
	"status" "university_communications_status" DEFAULT 'draft' NOT NULL,
	"subject" varchar(998) NOT NULL,
	"body" text NOT NULL,
	"category" "university_communications_category" DEFAULT 'general' NOT NULL,
	"ai_next_step" text,
	"ai_review_note" text,
	"provider_message_id" varchar(255),
	"provider_thread_id" varchar(255),
	"student_approved_at" timestamp,
	"sent_at" timestamp,
	"received_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "university_contacts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "university_contacts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"university_id" integer NOT NULL,
	"contact_name" varchar(160),
	"contact_role" varchar(160),
	"email" varchar(320) NOT NULL,
	"phone" varchar(80),
	"portal_url" varchar(700),
	"relationship_stage" "university_contacts_relationship_stage" DEFAULT 'cold' NOT NULL,
	"contact_preference" "university_contacts_contact_preference" DEFAULT 'email' NOT NULL,
	"student_confirmed_at" timestamp DEFAULT now() NOT NULL,
	"last_contact_at" timestamp,
	"next_follow_up_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "university_follow_up_notifications" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "university_follow_up_notifications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"follow_up_plan_id" integer NOT NULL,
	"alert_key" varchar(180) NOT NULL,
	"title" varchar(240) NOT NULL,
	"body" text NOT NULL,
	"locale" varchar(8) DEFAULT 'en' NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "university_follow_up_plans" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "university_follow_up_plans_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"university_id" integer NOT NULL,
	"contact_id" integer,
	"due_at" timestamp NOT NULL,
	"reason" varchar(240) NOT NULL,
	"status" "university_follow_up_plans_status" DEFAULT 'planned' NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "university_requirement_alerts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "university_requirement_alerts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"university_id" integer NOT NULL,
	"change_key" varchar(180) NOT NULL,
	"source_url" varchar(600) NOT NULL,
	"title" varchar(240) NOT NULL,
	"body" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "university_requirement_watches" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "university_requirement_watches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"university_id" integer NOT NULL,
	"source_url" varchar(600) NOT NULL,
	"source_label" varchar(240) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_known_hash" varchar(128),
	"last_checked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "university_source_caches" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "university_source_caches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"source_url" varchar(600) NOT NULL,
	"source_label" varchar(240) NOT NULL,
	"content_hash" varchar(128) NOT NULL,
	"normalized_text" text NOT NULL,
	"summary" text,
	"last_fetched_at" timestamp DEFAULT now() NOT NULL,
	"last_changed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "university_source_caches_source_url_unique" UNIQUE("source_url")
);
--> statement-breakpoint
CREATE TABLE "university_watch_preferences" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "university_watch_preferences_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"preferred_hour_utc" integer DEFAULT 10 NOT NULL,
	"schedule_cron_task_uid" varchar(65),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "university_watch_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_keys" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_keys_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"wrapped_dek" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"destroyed_at" timestamp,
	CONSTRAINT "user_keys_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"password_hash" text,
	"google_id" varchar(64),
	"token_version" integer DEFAULT 0 NOT NULL,
	"role" "users_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "waitlist_entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(120) NOT NULL,
	"email" varchar(320) NOT NULL,
	"organization" varchar(200) NOT NULL,
	"team_size" varchar(32) NOT NULL,
	"role" varchar(120) NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_entries_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workspace_profiles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "workspace_profiles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"organization" varchar(200) NOT NULL,
	"team_size" varchar(32) NOT NULL,
	"active_regions" varchar(255) NOT NULL,
	"applicant_volume" varchar(32) NOT NULL,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "admin_intake_record_source_unique" ON "admin_intake_records" USING btree ("upload_id","source_row_number");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_intake_record_digest_unique" ON "admin_intake_records" USING btree ("source_digest");--> statement-breakpoint
CREATE INDEX "admin_intake_record_review_idx" ON "admin_intake_records" USING btree ("review_status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_intake_upload_content_hash_unique" ON "admin_intake_uploads" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "admin_intake_upload_status_idx" ON "admin_intake_uploads" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "application_event_student_idx" ON "application_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "application_event_programme_idx" ON "application_events" USING btree ("programme_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "deadline_notifications_alert_key_unique" ON "deadline_notifications" USING btree ("alert_key");--> statement-breakpoint
CREATE INDEX "deadline_notifications_student_idx" ON "deadline_notifications" USING btree ("user_id","read");--> statement-breakpoint
CREATE UNIQUE INDEX "germany_programme_deadline_unique" ON "germany_programme_deadline_handoffs" USING btree ("user_id","programme_id");--> statement-breakpoint
CREATE INDEX "germany_programme_deadline_student_idx" ON "germany_programme_deadline_handoffs" USING btree ("user_id","deadline_at");--> statement-breakpoint
CREATE INDEX "germany_programme_category_idx" ON "germany_programme_index" USING btree ("broad_subject_categories");--> statement-breakpoint
CREATE INDEX "germany_programme_region_idx" ON "germany_programme_index" USING btree ("region");--> statement-breakpoint
CREATE INDEX "germany_programme_language_idx" ON "germany_programme_index" USING btree ("programme_language");--> statement-breakpoint
CREATE INDEX "italy_programme_region_idx" ON "italy_programme_index" USING btree ("region");--> statement-breakpoint
CREATE INDEX "italy_programme_language_idx" ON "italy_programme_index" USING btree ("programme_language");--> statement-breakpoint
CREATE INDEX "italy_programme_health_idx" ON "italy_programme_index" USING btree ("health_category");--> statement-breakpoint
CREATE INDEX "italy_programme_tech_idx" ON "italy_programme_index" USING btree ("technology_engineering_category");--> statement-breakpoint
CREATE UNIQUE INDEX "programme_research_briefing_unique" ON "programme_research_briefings" USING btree ("user_id","programme_id","locale");--> statement-breakpoint
CREATE INDEX "programme_research_briefing_student_idx" ON "programme_research_briefings" USING btree ("user_id","generated_at");--> statement-breakpoint
CREATE INDEX "prospective_student_email_idx" ON "prospective_students" USING btree ("contact_email");--> statement-breakpoint
CREATE INDEX "prospective_student_created_by_idx" ON "prospective_students" USING btree ("created_by_user_id","created_at");--> statement-breakpoint
CREATE INDEX "reminder_preferences_schedule_cron_idx" ON "reminder_preferences" USING btree ("schedule_cron_task_uid");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_germany_programme_unique" ON "saved_germany_programmes" USING btree ("user_id","programme_id");--> statement-breakpoint
CREATE INDEX "saved_germany_programme_student_idx" ON "saved_germany_programmes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_italy_programme_unique" ON "saved_italy_programmes" USING btree ("user_id","programme_id");--> statement-breakpoint
CREATE INDEX "saved_italy_programme_student_idx" ON "saved_italy_programmes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_consultation_cycle_unique" ON "student_consultation_cycles" USING btree ("user_id","cycle_key");--> statement-breakpoint
CREATE INDEX "student_consultation_cycle_student_idx" ON "student_consultation_cycles" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "university_communication_audit_student_idx" ON "university_communication_audit_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "university_communication_audit_message_idx" ON "university_communication_audit_events" USING btree ("communication_id","created_at");--> statement-breakpoint
CREATE INDEX "university_communication_student_idx" ON "university_communications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "university_communication_contact_idx" ON "university_communications" USING btree ("contact_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "university_communication_provider_id_unique" ON "university_communications" USING btree ("user_id","provider_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "university_contact_unique" ON "university_contacts" USING btree ("user_id","university_id","email");--> statement-breakpoint
CREATE INDEX "university_contact_student_idx" ON "university_contacts" USING btree ("user_id","relationship_stage");--> statement-breakpoint
CREATE UNIQUE INDEX "university_follow_up_notification_key_unique" ON "university_follow_up_notifications" USING btree ("alert_key");--> statement-breakpoint
CREATE INDEX "university_follow_up_notification_student_idx" ON "university_follow_up_notifications" USING btree ("user_id","read");--> statement-breakpoint
CREATE INDEX "university_follow_up_student_idx" ON "university_follow_up_plans" USING btree ("user_id","status","due_at");--> statement-breakpoint
CREATE INDEX "university_follow_up_contact_idx" ON "university_follow_up_plans" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "university_requirement_alert_key_unique" ON "university_requirement_alerts" USING btree ("change_key");--> statement-breakpoint
CREATE INDEX "university_requirement_alert_student_idx" ON "university_requirement_alerts" USING btree ("user_id","read");--> statement-breakpoint
CREATE UNIQUE INDEX "university_requirement_watch_unique" ON "university_requirement_watches" USING btree ("user_id","university_id");--> statement-breakpoint
CREATE INDEX "university_requirement_watch_student_idx" ON "university_requirement_watches" USING btree ("user_id","enabled");--> statement-breakpoint
CREATE INDEX "university_watch_preferences_schedule_idx" ON "university_watch_preferences" USING btree ("schedule_cron_task_uid");--> statement-breakpoint
CREATE INDEX "user_key_student_idx" ON "user_keys" USING btree ("user_id");