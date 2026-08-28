import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const usersRoleEnum = pgEnum("users_role", ["user", "admin"]);
export const usersPlanEnum = pgEnum("users_plan", ["free", "pro", "premium"]);
export const universityContactsRelationshipStageEnum = pgEnum("university_contacts_relationship_stage", ["cold", "warm", "active", "responded", "paused"]);
export const universityContactsContactPreferenceEnum = pgEnum("university_contacts_contact_preference", ["email", "portal", "do_not_contact"]);
export const universityCommunicationsDirectionEnum = pgEnum("university_communications_direction", ["outbound", "inbound"]);
export const universityCommunicationsStatusEnum = pgEnum("university_communications_status", ["draft", "ready_for_review", "student_approved", "provider_send_requested", "sent", "send_failed", "received", "needs_review", "archived"]);
export const universityCommunicationsCategoryEnum = pgEnum("university_communications_category", ["general", "document_request", "interview", "decision", "next_step", "needs_review"]);
export const universityFollowUpPlansStatusEnum = pgEnum("university_follow_up_plans_status", ["planned", "draft_ready", "completed", "cancelled"]);
export const studentInboxConnectionsProviderEnum = pgEnum("student_inbox_connections_provider", ["gmail"]);
export const universityCommunicationAuditEventsEventTypeEnum = pgEnum("university_communication_audit_events_event_type", ["draft_created", "draft_updated", "student_approved", "provider_send_requested", "sent", "send_failed", "reply_imported", "reply_categorized", "follow_up_planned", "follow_up_completed", "inbox_connected", "inbox_disconnected"]);
export const adminIntakeUploadsSourceKindEnum = pgEnum("admin_intake_uploads_source_kind", ["cv", "spreadsheet"]);
export const adminIntakeUploadsStatusEnum = pgEnum("admin_intake_uploads_status", ["uploaded", "extracting", "ready_for_review", "failed", "rejected", "committed"]);
export const adminIntakeRecordsReviewStatusEnum = pgEnum("admin_intake_records_review_status", ["pending_review", "approved", "rejected", "committed"]);
export const applicationEventsCountryEnum = pgEnum("application_events_country", ["germany", "italy"]);
export const applicationEventsEventTypeEnum = pgEnum("application_events_event_type", [
    "programme_saved",
    "programme_archived",
    "programme_priority_set",
    "programme_priority_cleared",
    "decision_notes_updated",
    "application_preparation_started",
    "consultation_completed",
    "document_uploaded",
    "document_verified",
    "deadline_confirmed",
    "communication_drafted",
    "communication_approved",
    "communication_sent",
    "communication_reply_received",
    "follow_up_planned",
    "follow_up_completed",
    "application_submitted",
    "admission_offer_received",
    "application_rejected",
  ]);

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  /** Stable local identity token generated at registration. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  /** scrypt password hash for self-hosted credential auth; null until a password is set. */
  passwordHash: text("password_hash"),
  /** Google OIDC subject id, when the user has linked or signed in with Google. */
  googleId: varchar("google_id", { length: 64 }),
  /** Bumped to invalidate every issued session server-side (logout everywhere, password change). */
  tokenVersion: integer("token_version").default(0).notNull(),
  /** Self-selected feature tier. Payment wiring is deferred; activation is manual for now. */
  plan: usersPlanEnum("plan").default("free").notNull(),
  /** Set when the email ownership challenge is passed. Google sign-ins are trusted at link time; password accounts gate on this before login. */
  emailVerifiedAt: timestamp("email_verified_at"),
  role: usersRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Public event and product-access requests. Email is the idempotency key. */
export const waitlistEntries = pgTable("waitlist_entries", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  destination: varchar("organization", { length: 200 }).notNull(),
  journeyStage: varchar("team_size", { length: 32 }).notNull(),
  graduationYear: varchar("role", { length: 120 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** A signed-in user's lightweight workspace baseline from the onboarding workflow. */
export const workspaceProfiles = pgTable("workspace_profiles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().unique(),
  organization: varchar("organization", { length: 200 }).notNull(),
  teamSize: varchar("team_size", { length: 32 }).notNull(),
  activeRegions: varchar("active_regions", { length: 255 }).notNull(),
  applicantVolume: varchar("applicant_volume", { length: 32 }).notNull(),
  onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Student-owned personal baseline used by the localized onboarding journey. */
export const studentProfiles = pgTable("student_profiles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().unique(),
  preferredName: varchar("preferred_name", { length: 120 }),
  contactEmail: varchar("contact_email", { length: 320 }),
  phoneNumber: varchar("phone_number", { length: 80 }),
  destination: varchar("destination", { length: 200 }).notNull(),
  graduationYear: varchar("graduation_year", { length: 32 }).notNull(),
  highSchoolDiplomaOrigin: varchar("high_school_diploma_origin", { length: 200 }),
  preferredLanguage: varchar("preferred_language", { length: 8 }).default("en").notNull(),
  academicAverage: varchar("academic_average", { length: 80 }),
  gradeScale: varchar("grade_scale", { length: 120 }),
  academicSummary: text("academic_summary"),
  lastViewedComparisonUniversityId: integer("last_viewed_comparison_university_id"),
  /** Student's own Gemini API key, sealed under their per-user DEK (see userKeys). Never returned to any client after save. */
  geminiApiKeySealed: text("gemini_api_key_sealed"),
  /** Version string of the last accepted Terms/EULA/Privacy set (e.g. "2026-08"). */
  acceptedLegalVersion: varchar("accepted_legal_version", { length: 16 }),
  onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** A transparent three-use allowance for student-initiated recommendation refreshes in one declared application cycle. Regular browsing is never limited. */
export const studentConsultationCycles = pgTable("student_consultation_cycles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  cycleKey: varchar("cycle_key", { length: 32 }).notNull(),
  includedUses: integer("included_uses").default(3).notNull(),
  usedCount: integer("used_count").default(0).notNull(),
  lastConsultedAt: timestamp("last_consulted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("student_consultation_cycle_unique").on(table.userId, table.cycleKey), index("student_consultation_cycle_student_idx").on(table.userId, table.updatedAt)]);

/** Student-controlled context for research matching. This informs fit signals only; it never stores an eligibility or admissions outcome. */
export const studentFitProfiles = pgTable("student_fit_profiles", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().unique(),
  studyDirection: varchar("study_direction", { length: 240 }).notNull(),
  studyLevel: varchar("study_level", { length: 80 }),
  academicAverage: varchar("academic_average", { length: 80 }),
  gradeScale: varchar("grade_scale", { length: 120 }),
  qualifications: text("qualifications"),
  nationality: varchar("nationality", { length: 120 }),
  languageComfort: varchar("language_comfort", { length: 320 }),
  tuitionBudgetBand: varchar("tuition_budget_band", { length: 80 }),
  fundingRoute: varchar("funding_route", { length: 80 }),
  hasSponsor: boolean("has_sponsor").default(false).notNull(),
  priorities: text("priorities"),
  matchingConsentAt: timestamp("matching_consent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** A saved university and its personal application status. */
export const savedUniversities = pgTable("saved_universities", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  university: varchar("university", { length: 200 }).notNull(),
  location: varchar("location", { length: 200 }).notNull(),
  program: varchar("program", { length: 200 }).notNull(),
  sourceUrl: varchar("source_url", { length: 600 }),
  scholarshipSourceUrl: varchar("scholarship_source_url", { length: 600 }),
  snapshotSummary: text("snapshot_summary"),
  imageUrl: varchar("image_url", { length: 600 }),
  imageAttribution: varchar("image_attribution", { length: 240 }),
  deadline: varchar("deadline", { length: 80 }),
  tuition: varchar("tuition", { length: 160 }),
  scholarshipInfo: text("scholarship_info"),
  admissionRequirements: text("admission_requirements"),
  eligibilityCriteria: text("eligibility_criteria"),
  status: varchar("status", { length: 40 }).default("Saved").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Student-confirmed public university contacts used only inside that student's approval-first relationship workspace. */
export const universityContacts = pgTable("university_contacts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  universityId: integer("university_id").notNull(),
  contactName: varchar("contact_name", { length: 160 }),
  contactRole: varchar("contact_role", { length: 160 }),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 80 }),
  portalUrl: varchar("portal_url", { length: 700 }),
  relationshipStage: universityContactsRelationshipStageEnum("relationship_stage").default("cold").notNull(),
  contactPreference: universityContactsContactPreferenceEnum("contact_preference").default("email").notNull(),
  studentConfirmedAt: timestamp("student_confirmed_at").defaultNow().notNull(),
  lastContactAt: timestamp("last_contact_at"),
  nextFollowUpAt: timestamp("next_follow_up_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("university_contact_unique").on(table.userId, table.universityId, table.email), index("university_contact_student_idx").on(table.userId, table.relationshipStage)]);

/** A private local record of proposed, approved, delivered, and received university communications. */
export const universityCommunications = pgTable("university_communications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  universityId: integer("university_id").notNull(),
  contactId: integer("contact_id"),
  direction: universityCommunicationsDirectionEnum("direction").notNull(),
  status: universityCommunicationsStatusEnum("status").default("draft").notNull(),
  subject: varchar("subject", { length: 998 }).notNull(),
  body: text("body").notNull(),
  category: universityCommunicationsCategoryEnum("category").default("general").notNull(),
  aiNextStep: text("ai_next_step"),
  aiReviewNote: text("ai_review_note"),
  providerMessageId: varchar("provider_message_id", { length: 255 }),
  providerThreadId: varchar("provider_thread_id", { length: 255 }),
  studentApprovedAt: timestamp("student_approved_at"),
  sentAt: timestamp("sent_at"),
  receivedAt: timestamp("received_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [index("university_communication_student_idx").on(table.userId, table.createdAt), index("university_communication_contact_idx").on(table.contactId, table.status), uniqueIndex("university_communication_provider_id_unique").on(table.userId, table.providerMessageId)]);

/** Student-created follow-up plans; due plans create review cues, never autonomous outbound email. */
export const universityFollowUpPlans = pgTable("university_follow_up_plans", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  universityId: integer("university_id").notNull(),
  contactId: integer("contact_id"),
  dueAt: timestamp("due_at").notNull(),
  reason: varchar("reason", { length: 240 }).notNull(),
  status: universityFollowUpPlansStatusEnum("status").default("planned").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [index("university_follow_up_student_idx").on(table.userId, table.status, table.dueAt), index("university_follow_up_contact_idx").on(table.contactId)]);

/** Durable in-app cues created for due follow-up plans; a cue never sends university email. */
export const universityFollowUpNotifications = pgTable("university_follow_up_notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  followUpPlanId: integer("follow_up_plan_id").notNull(),
  alertKey: varchar("alert_key", { length: 180 }).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  body: text("body").notNull(),
  locale: varchar("locale", { length: 8 }).default("en").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("university_follow_up_notification_key_unique").on(table.alertKey), index("university_follow_up_notification_student_idx").on(table.userId, table.read)]);

/** Gmail-only connection metadata; refresh credentials remain server-side and are never returned to a client. */
export const studentInboxConnections = pgTable("student_inbox_connections", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().unique(),
  provider: studentInboxConnectionsProviderEnum("provider").default("gmail").notNull(),
  emailAddress: varchar("email_address", { length: 320 }).notNull(),
  encryptedRefreshToken: text("encrypted_refresh_token").notNull(),
  gmailHistoryId: varchar("gmail_history_id", { length: 120 }),
  watchExpiresAt: timestamp("watch_expires_at"),
  connectedAt: timestamp("connected_at").defaultNow().notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  disconnectedAt: timestamp("disconnected_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Append-only student-visible audit evidence for approval, send, sync, and follow-up lifecycle changes. */
export const universityCommunicationAuditEvents = pgTable("university_communication_audit_events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  communicationId: integer("communication_id"),
  followUpPlanId: integer("follow_up_plan_id"),
  eventType: universityCommunicationAuditEventsEventTypeEnum("event_type").notNull(),
  eventJson: text("event_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [index("university_communication_audit_student_idx").on(table.userId, table.createdAt), index("university_communication_audit_message_idx").on(table.communicationId, table.createdAt)]);

/** Reviewed public German programme discovery records imported from source-linked directory evidence. */
export const germanyProgrammeIndex = pgTable("germany_programme_index", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  programmeId: varchar("programme_id", { length: 80 }).notNull().unique(),
  officialName: varchar("official_name", { length: 280 }).notNull(),
  city: varchar("city", { length: 180 }).notNull(),
  region: varchar("region", { length: 180 }).notNull(),
  programmeName: varchar("programme_name", { length: 320 }).notNull(),
  broadSubjectCategories: varchar("broad_subject_categories", { length: 420 }).notNull(),
  fieldMatchBasis: text("field_match_basis"),
  programmeEvidenceUrl: varchar("programme_evidence_url", { length: 700 }).notNull(),
  officialProgrammeUrl: varchar("official_programme_url", { length: 700 }),
  programmeLanguage: varchar("programme_language", { length: 180 }),
  admissionSemester: varchar("admission_semester", { length: 180 }),
  admissionMode: varchar("admission_mode", { length: 240 }),
  sourceLayer: varchar("source_layer", { length: 120 }).notNull(),
  reputationTier: varchar("reputation_tier", { length: 64 }),
  securityInfrastructure: text("security_infrastructure"),
  feeRiskCategory: text("fee_risk_category"),
  syrianBaccalaureateAnabinCondition: text("syrian_baccalaureate_anabin_condition"),
  lastVerified: varchar("last_verified", { length: 32 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [index("germany_programme_category_idx").on(table.broadSubjectCategories), index("germany_programme_region_idx").on(table.region), index("germany_programme_language_idx").on(table.programmeLanguage)]);

/** Student-owned programme bookmarks; source evidence remains canonical in germanyProgrammeIndex. */
export const savedGermanyProgrammes = pgTable("saved_germany_programmes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  programmeId: varchar("programme_id", { length: 80 }).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  priorityRank: integer("priority_rank"),
  priorityUpdatedAt: timestamp("priority_updated_at"),
  archivedAt: timestamp("archived_at"),
  decisionNotes: text("decision_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("saved_germany_programme_unique").on(table.userId, table.programmeId), index("saved_germany_programme_student_idx").on(table.userId)]);

/**
 * Italy Universitaly programme catalogue. Kept as its own table rather than
 * reshaped into germanyProgrammeIndex's shape: the source schema is richer
 * (EN/IT programme names, degree classification, institution legal status)
 * and, critically, does NOT include per-programme fee data — Italian tuition
 * is institution/income/residency/cycle-specific and must stay an explicit
 * "not collected, verify with the institution" signal rather than being
 * forced into Germany's feeRiskCategory shape.
 */
export const italyProgrammeIndex = pgTable("italy_programme_index", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  programmeId: varchar("programme_id", { length: 80 }).notNull().unique(),
  institutionName: varchar("institution_name", { length: 320 }).notNull(),
  city: varchar("city", { length: 180 }).notNull(),
  region: varchar("region", { length: 180 }).notNull(),
  legalStatus: varchar("legal_status", { length: 120 }),
  publicOnlyComparable: boolean("public_only_comparable").notNull(),
  programmeNameEn: varchar("programme_name_en", { length: 400 }),
  programmeNameIt: varchar("programme_name_it", { length: 400 }),
  programmeNameDisplay: varchar("programme_name_display", { length: 400 }).notNull(),
  degreeLevelEn: varchar("degree_level_en", { length: 120 }),
  degreeClassCode: varchar("degree_class_code", { length: 32 }),
  cunArea: varchar("cun_area", { length: 16 }),
  durationYears: varchar("duration_years", { length: 16 }),
  programmeLanguage: varchar("programme_language", { length: 60 }),
  admissionsAccessTypeEn: varchar("admissions_access_type_en", { length: 240 }),
  officialProgrammeUrl: varchar("official_programme_url", { length: 700 }),
  universitalyReferenceUrl: varchar("universitaly_reference_url", { length: 900 }).notNull(),
  healthCategory: varchar("health_category", { length: 60 }),
  technologyEngineeringCategory: varchar("technology_engineering_category", { length: 60 }),
  priorityScope: varchar("priority_scope", { length: 60 }),
  // Deliberately not a numeric/boolean fee field — see table comment above.
  // Always "NOT_COLLECTED..." in the source data today; kept as free text so
  // a future data pass can populate it without a schema migration.
  feeBasis: text("fee_basis"),
  scholarshipStatus: text("scholarship_status"),
  internationalStudentNote: text("international_student_note"),
  lastVerifiedUtc: varchar("last_verified_utc", { length: 40 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [index("italy_programme_region_idx").on(table.region), index("italy_programme_language_idx").on(table.programmeLanguage), index("italy_programme_health_idx").on(table.healthCategory), index("italy_programme_tech_idx").on(table.technologyEngineeringCategory)]);

/** Student-owned programme bookmarks for Italy; source evidence remains canonical in italyProgrammeIndex. */
export const savedItalyProgrammes = pgTable("saved_italy_programmes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  programmeId: varchar("programme_id", { length: 80 }).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  priorityRank: integer("priority_rank"),
  priorityUpdatedAt: timestamp("priority_updated_at"),
  archivedAt: timestamp("archived_at"),
  decisionNotes: text("decision_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("saved_italy_programme_unique").on(table.userId, table.programmeId), index("saved_italy_programme_student_idx").on(table.userId)]);

/** Student-owned, locale-specific AI summaries of supplied public programme index data. */
export const programmeResearchBriefings = pgTable("programme_research_briefings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  programmeId: varchar("programme_id", { length: 80 }).notNull(),
  locale: varchar("locale", { length: 8 }).notNull(),
  sourceUrl: varchar("source_url", { length: 700 }).notNull(),
  contentHash: varchar("content_hash", { length: 128 }).notNull(),
  briefingJson: text("briefing_json").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("programme_research_briefing_unique").on(table.userId, table.programmeId, table.locale), index("programme_research_briefing_student_idx").on(table.userId, table.generatedAt)]);

/** A student-reviewed programme deadline handoff; canonical evidence URL is copied from the shared index. */
export const germanyProgrammeDeadlineHandoffs = pgTable("germany_programme_deadline_handoffs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  programmeId: varchar("programme_id", { length: 80 }).notNull(),
  deadlineAt: timestamp("deadline_at").notNull(),
  officialEvidenceUrl: varchar("official_evidence_url", { length: 700 }).notNull(),
  reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("germany_programme_deadline_unique").on(table.userId, table.programmeId), index("germany_programme_deadline_student_idx").on(table.userId, table.deadlineAt)]);

/** Cached normalized official programme pages shared across students to avoid redundant fetches and AI calls. */
export const universitySourceCaches = pgTable("university_source_caches", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sourceUrl: varchar("source_url", { length: 600 }).notNull().unique(),
  sourceLabel: varchar("source_label", { length: 240 }).notNull(),
  contentHash: varchar("content_hash", { length: 128 }).notNull(),
  normalizedText: text("normalized_text").notNull(),
  summary: text("summary"),
  lastFetchedAt: timestamp("last_fetched_at").defaultNow().notNull(),
  lastChangedAt: timestamp("last_changed_at").defaultNow().notNull(),
});

/** An opt-in official admissions-page watch tied to one student-owned saved university. */
export const universityRequirementWatches = pgTable("university_requirement_watches", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  universityId: integer("university_id").notNull(),
  sourceUrl: varchar("source_url", { length: 600 }).notNull(),
  sourceLabel: varchar("source_label", { length: 240 }).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  lastKnownHash: varchar("last_known_hash", { length: 128 }),
  lastCheckedAt: timestamp("last_checked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("university_requirement_watch_unique").on(table.userId, table.universityId), index("university_requirement_watch_student_idx").on(table.userId, table.enabled)]);

/** One student-owned scheduler preference for low-cost official-page checks. */
export const universityWatchPreferences = pgTable("university_watch_preferences", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().unique(),
  enabled: boolean("enabled").default(true).notNull(),
  preferredHourUtc: integer("preferred_hour_utc").default(10).notNull(),
  scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [index("university_watch_preferences_schedule_idx").on(table.scheduleCronTaskUid)]);

/** Human-review alerts are generated only after an official page cache hash changes. */
export const universityRequirementAlerts = pgTable("university_requirement_alerts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  universityId: integer("university_id").notNull(),
  changeKey: varchar("change_key", { length: 180 }).notNull(),
  sourceUrl: varchar("source_url", { length: 600 }).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  body: text("body").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("university_requirement_alert_key_unique").on(table.changeKey), index("university_requirement_alert_student_idx").on(table.userId, table.read)]);

/** Small application steps kept visible beneath a saved university. */
export const applicationMilestones = pgTable("application_milestones", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  universityId: integer("university_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  dueLabel: varchar("due_label", { length: 100 }),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Personalized tasks that can be dismissed after a student records progress. */
export const personalReminders = pgTable("personal_reminders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body"),
  dueLabel: varchar("due_label", { length: 100 }),
  locale: varchar("locale", { length: 8 }).default("en").notNull(),
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** One student-owned configuration controlling durable in-app deadline nudges. */
export const reminderPreferences = pgTable("reminder_preferences", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().unique(),
  enabled: boolean("enabled").default(true).notNull(),
  remindSevenDays: boolean("remind_seven_days").default(true).notNull(),
  remindThreeDays: boolean("remind_three_days").default(true).notNull(),
  remindOneDay: boolean("remind_one_day").default(true).notNull(),
  preferredHourUtc: integer("preferred_hour_utc").default(8).notNull(),
  scheduleCronTaskUid: varchar("schedule_cron_task_uid", { length: 65 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [index("reminder_preferences_schedule_cron_idx").on(table.scheduleCronTaskUid)]);

/** One row per global scheduler window; the unique key makes HTTP-trigger retries safe. */
export const schedulerRuns = pgTable("scheduler_runs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  jobKey: varchar("job_key", { length: 80 }).notNull(),
  windowKey: varchar("window_key", { length: 120 }).notNull(),
  status: varchar("status", { length: 24 }).notNull(),
  attempts: integer("attempts").default(1).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  details: jsonb("details"),
}, (table) => [uniqueIndex("scheduler_runs_job_window_unique").on(table.jobKey, table.windowKey), index("scheduler_runs_status_started_idx").on(table.status, table.startedAt)]);

/** Durable in-app alerts generated by the deadline scheduler; alertKey makes retries safe. */
export const deadlineNotifications = pgTable("deadline_notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  universityId: integer("university_id"),
  alertKey: varchar("alert_key", { length: 180 }).notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  body: text("body"),
  locale: varchar("locale", { length: 8 }).default("en").notNull(),
  deadlineAt: timestamp("deadline_at"),
  daysBefore: integer("days_before"),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("deadline_notifications_alert_key_unique").on(table.alertKey), index("deadline_notifications_student_idx").on(table.userId, table.read)]);

/** Tokenized read-only family sharing; no family member can edit the student's journey. */
export const familyInvites = pgTable("family_invites", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  relationship: varchar("relationship", { length: 80 }).notNull(),
  token: varchar("token", { length: 80 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Private student document metadata. Actual transcript bytes live in storage, never in the database. */
export const studentDocuments = pgTable("student_documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  documentType: varchar("document_type", { length: 80 }).default("Transcript").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 120 }).notNull(),
  storageKey: varchar("storage_key", { length: 512 }).notNull(),
  fileUrl: varchar("file_url", { length: 600 }).notNull(),
  extractionStatus: varchar("extraction_status", { length: 40 }).default("not_started").notNull(),
  extractedGrades: text("extracted_grades"),
  extractedAt: timestamp("extracted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * A student's explicit, review-only placement of one private file beside a
 * saved Germany programme requirement. This is never a verification of the
 * document or a representation that the university will accept it.
 */
export const studentDocumentRequirementLinks = pgTable("student_document_requirement_links", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  documentId: integer("document_id").notNull(),
  programmeId: varchar("programme_id", { length: 80 }).notNull(),
  requirementKey: varchar("requirement_key", { length: 80 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("student_document_requirement_link_unique").on(table.userId, table.documentId, table.programmeId, table.requirementKey),
  index("student_document_requirement_link_student_programme_idx").on(table.userId, table.programmeId),
]);

/** Admin-controlled source file intake. The original CV or spreadsheet stays in private storage; the database holds only audit metadata and extracted review state. */
export const adminIntakeUploads = pgTable("admin_intake_uploads", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  uploadedByUserId: integer("uploaded_by_user_id").notNull(),
  sourceKind: adminIntakeUploadsSourceKindEnum("source_kind").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 120 }).notNull(),
  byteSize: integer("byte_size").notNull(),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  storageKey: varchar("storage_key", { length: 512 }).notNull(),
  fileUrl: varchar("file_url", { length: 600 }).notNull(),
  status: adminIntakeUploadsStatusEnum("status").default("uploaded").notNull(),
  extractedText: text("extracted_text"),
  extractionNote: text("extraction_note"),
  sourceRowCount: integer("source_row_count").default(0).notNull(),
  aiInvocationCount: integer("ai_invocation_count").default(0).notNull(),
  failureReason: text("failure_reason"),
  committedAt: timestamp("committed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("admin_intake_upload_content_hash_unique").on(table.contentHash), index("admin_intake_upload_status_idx").on(table.status, table.createdAt)]);

/** One AI-derived, reviewable intake row. These drafts never update a student account automatically. */
export const adminIntakeRecords = pgTable("admin_intake_records", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  uploadId: integer("upload_id").notNull(),
  sourceRowNumber: integer("source_row_number").notNull(),
  sourceDigest: varchar("source_digest", { length: 64 }).notNull(),
  proposedProfileJson: text("proposed_profile_json").notNull(),
  extractionConfidence: varchar("extraction_confidence", { length: 16 }).notNull(),
  reviewStatus: adminIntakeRecordsReviewStatusEnum("review_status").default("pending_review").notNull(),
  reviewerUserId: integer("reviewer_user_id"),
  reviewNote: text("review_note"),
  prospectiveStudentId: integer("prospective_student_id"),
  reviewedAt: timestamp("reviewed_at"),
  committedAt: timestamp("committed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("admin_intake_record_source_unique").on(table.uploadId, table.sourceRowNumber), uniqueIndex("admin_intake_record_digest_unique").on(table.sourceDigest), index("admin_intake_record_review_idx").on(table.reviewStatus, table.createdAt)]);

/** A vetted prospective-student record created only when an admin explicitly commits a reviewed intake draft. It is not an authenticated student account. */
export const prospectiveStudents = pgTable("prospective_students", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sourceRecordId: integer("source_record_id").notNull().unique(),
  preferredName: varchar("preferred_name", { length: 160 }),
  contactEmail: varchar("contact_email", { length: 320 }),
  phoneNumber: varchar("phone_number", { length: 80 }),
  nationality: varchar("nationality", { length: 120 }),
  highSchoolDiplomaOrigin: varchar("high_school_diploma_origin", { length: 200 }),
  studyDirection: varchar("study_direction", { length: 240 }),
  academicAverage: varchar("academic_average", { length: 80 }),
  gradeScale: varchar("grade_scale", { length: 120 }),
  qualifications: text("qualifications"),
  sourceSummary: text("source_summary"),
  createdByUserId: integer("created_by_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [index("prospective_student_email_idx").on(table.contactEmail), index("prospective_student_created_by_idx").on(table.createdByUserId, table.createdAt)]);

/**
 * The application-lifecycle event log. This is the "database knows what
 * happened" layer: an append-only history of everything meaningful that
 * occurs against a student's relationship with one programme, so both the
 * UI and any future agent orchestrator can reason over what actually
 * happened and when, instead of only ever seeing the current row state.
 *
 * Deliberately general, not communication-only: it supersedes
 * universityCommunicationAuditEvents in scope (which is kept as-is, still
 * written to by the existing Gmail approval/send flow, rather than
 * migrated in this pass). New work should prefer writing here going
 * forward; communication-specific writes can additionally still write to
 * the narrower table without conflict, since both are purely additive
 * event logs.
 *
 * programmeId + country together identify the programme this event is
 * about (Germany's IDs are "g"-prefixed, Italy's are "it"-prefixed, so a
 * bare programmeId is already unambiguous � country is kept as an explicit
 * column anyway so queries don't have to parse an ID prefix to filter).
 * universityId is kept nullable and separate for events that pertain to the
 * broader relationship (e.g. a saved-but-unmatched university in
 * savedUniversities) rather than a specific catalogued programme.
 */
export const applicationEvents = pgTable("application_events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  programmeId: varchar("programme_id", { length: 80 }),
  country: applicationEventsCountryEnum("country"),
  universityId: integer("university_id"),
  eventType: applicationEventsEventTypeEnum("event_type").notNull(),
  // Freeform structured detail for this specific event (e.g. which document
  // type, which priority rank, the communication id). Kept as JSON text
  // rather than a wide sparse column set, matching the existing
  // universityCommunicationAuditEvents.eventJson convention.
  eventJson: text("event_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("application_event_student_idx").on(table.userId, table.createdAt),
  index("application_event_programme_idx").on(table.programmeId, table.createdAt),
]);

/**
 * Per-user data-encryption key, wrapped by the server MASTER_KEY. This is
 * the GDPR crypto-shredding mechanism: every secret payload that belongs to
 * a user (Gemini API key, Gmail refresh token at rest) is encrypted under
 * their DEK. Destroying the wrapped key ("shredding") on account deletion
 * renders all such ciphertext permanently undecryptable � including copies
 * already sitting in backups � without touching the backup files themselves.
 */
export const userKeys = pgTable("user_keys", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().unique(),
  /** base64(nonce || ciphertext || tag) of the user's DEK, wrapped by MASTER_KEY. */
  wrappedDek: text("wrapped_dek").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  destroyedAt: timestamp("destroyed_at"),
}, (table) => [index("user_key_student_idx").on(table.userId)]);

/** Daily AI-usage counter per user, used by the tier limit gate. Reset by date key (UTC). */
export const aiUsageCounters = pgTable("ai_usage_counters", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  usageDate: varchar("usage_date", { length: 10 }).notNull(),
  callCount: integer("call_count").default(0).notNull(),
}, (table) => [uniqueIndex("ai_usage_user_date_unique").on(table.userId, table.usageDate)]);

/**
 * Time-limited email ownership codes (#163). The hashed code is the only
 * thing stored � a database leak cannot reveal usable codes. Attempts are
 * counted per row so brute-forcing a code dies at 5 tries long before the
 * 10-minute expiry, and the endpoint itself is IP rate-limited.
 */
export const emailVerifications = pgTable("email_verifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: varchar("email", { length: 320 }).notNull(),
  purpose: varchar("purpose", { length: 32 }).default("registration").notNull(),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  consumedAt: timestamp("consumed_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [index("email_verification_email_idx").on(table.email, table.createdAt)]);
