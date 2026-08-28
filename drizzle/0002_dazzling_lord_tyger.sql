CREATE TYPE "public"."users_plan" AS ENUM('free', 'pro', 'premium');--> statement-breakpoint
CREATE TABLE "ai_usage_counters" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ai_usage_counters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"usage_date" varchar(10) NOT NULL,
	"call_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_verifications" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "email_verifications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" varchar(320) NOT NULL,
	"purpose" varchar(32) DEFAULT 'registration' NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "accepted_legal_version" varchar(16);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "plan" "users_plan" DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_usage_user_date_unique" ON "ai_usage_counters" USING btree ("user_id","usage_date");--> statement-breakpoint
CREATE INDEX "email_verification_email_idx" ON "email_verifications" USING btree ("email","created_at");