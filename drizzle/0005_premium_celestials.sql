CREATE TABLE "student_document_requirement_links" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "student_document_requirement_links_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"document_id" integer NOT NULL,
	"programme_id" varchar(80) NOT NULL,
	"requirement_key" varchar(80) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "student_document_requirement_link_unique" ON "student_document_requirement_links" USING btree ("user_id","document_id","programme_id","requirement_key");--> statement-breakpoint
CREATE INDEX "student_document_requirement_link_student_programme_idx" ON "student_document_requirement_links" USING btree ("user_id","programme_id");
