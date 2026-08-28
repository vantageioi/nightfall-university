CREATE OR REPLACE FUNCTION nightfall_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION nightfall_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_workspace_profiles_updated_at BEFORE UPDATE ON "workspace_profiles" FOR EACH ROW EXECUTE FUNCTION nightfall_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_student_profiles_updated_at BEFORE UPDATE ON "student_profiles" FOR EACH ROW EXECUTE FUNCTION nightfall_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_student_consultation_cycles_updated_at BEFORE UPDATE ON "student_consultation_cycles" FOR EACH ROW EXECUTE FUNCTION nightfall_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_student_fit_profiles_updated_at BEFORE UPDATE ON "student_fit_profiles" FOR EACH ROW EXECUTE FUNCTION nightfall_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_saved_universities_updated_at BEFORE UPDATE ON "saved_universities" FOR EACH ROW EXECUTE FUNCTION nightfall_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_university_contacts_updated_at BEFORE UPDATE ON "university_contacts" FOR EACH ROW EXECUTE FUNCTION nightfall_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_university_communications_updated_at BEFORE UPDATE ON "university_communications" FOR EACH ROW EXECUTE FUNCTION nightfall_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_university_follow_up_plans_updated_at BEFORE UPDATE ON "university_follow_up_plans" FOR EACH ROW EXECUTE FUNCTION nightfall_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_student_inbox_connections_updated_at BEFORE UPDATE ON "student_inbox_connections" FOR EACH ROW EXECUTE FUNCTION nightfall_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_germany_programme_index_updated_at BEFORE UPDATE ON "germany_programme_index" FOR EACH ROW EXECUTE FUNCTION nightfall_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_italy_programme_index_updated_at BEFORE UPDATE ON "italy_programme_index" FOR EACH ROW EXECUTE FUNCTION nightfall_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_admin_intake_uploads_updated_at BEFORE UPDATE ON "admin_intake_uploads" FOR EACH ROW EXECUTE FUNCTION nightfall_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_admin_intake_records_updated_at BEFORE UPDATE ON "admin_intake_records" FOR EACH ROW EXECUTE FUNCTION nightfall_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_prospective_students_updated_at BEFORE UPDATE ON "prospective_students" FOR EACH ROW EXECUTE FUNCTION nightfall_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_reminder_preferences_updated_at BEFORE UPDATE ON "reminder_preferences" FOR EACH ROW EXECUTE FUNCTION nightfall_set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_university_watch_preferences_updated_at BEFORE UPDATE ON "university_watch_preferences" FOR EACH ROW EXECUTE FUNCTION nightfall_set_updated_at();
