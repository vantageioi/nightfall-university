CREATE TABLE "scheduler_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "scheduler_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"job_key" varchar(80) NOT NULL,
	"window_key" varchar(120) NOT NULL,
	"status" varchar(24) NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"details" jsonb
);
--> statement-breakpoint
CREATE UNIQUE INDEX "scheduler_runs_job_window_unique" ON "scheduler_runs" USING btree ("job_key","window_key");--> statement-breakpoint
CREATE INDEX "scheduler_runs_status_started_idx" ON "scheduler_runs" USING btree ("status","started_at");