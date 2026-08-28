import { and, desc, eq, gte, isNull, isNotNull, like, lte, or, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { applicationEvents, applicationMilestones, deadlineNotifications, emailVerifications, familyInvites, germanyProgrammeDeadlineHandoffs, germanyProgrammeIndex, italyProgrammeIndex, InsertUser, personalReminders, programmeResearchBriefings, reminderPreferences, savedGermanyProgrammes, savedItalyProgrammes, savedUniversities, studentConsultationCycles, studentDocumentRequirementLinks, studentDocuments, studentFitProfiles, studentProfiles, studentInboxConnections, universityCommunicationAuditEvents, universityCommunications, universityContacts, universityFollowUpNotifications, universityFollowUpPlans, userKeys, users, waitlistEntries, workspaceProfiles } from "../drizzle/schema";
import { adminIntakeRecords, adminIntakeUploads, prospectiveStudents } from "../drizzle/schema";
import { storagePut } from "./storage";
import { decryptForUser, encryptForUser } from "./_core/userCrypto";
import { MAX_EMAILS_PER_CONTACT_PER_24H, MAX_STUDENT_UNIVERSITY_EMAILS_PER_24H } from "./universityCommunicationPolicy";
import { deliverDueUniversityFollowUps } from "./domain/followUpDelivery";
import { legalAcceptanceProfile } from "./legalAcceptance";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(postgres(process.env.DATABASE_URL, { prepare: false }));
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.passwordHash !== undefined) {
      values.passwordHash = user.passwordHash;
      updateSet.passwordHash = user.passwordHash;
    }
    if (user.emailVerifiedAt !== undefined) {
      values.emailVerifiedAt = user.emailVerifiedAt;
      updateSet.emailVerifiedAt = user.emailVerifiedAt;
    }
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function countUsers(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ id: users.id }).from(users).limit(1);
  return result.length;
}

/** Server-side session revocation: invalidates every issued token for this user. */
export async function bumpUserTokenVersion(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(users).set({ tokenVersion: sql`${users.tokenVersion} + 1` }).where(eq(users.id, userId));
}

// --- Per-user encryption keys (GDPR crypto-shredding; see userCrypto.ts) ---

export async function getUserKey(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(userKeys).where(eq(userKeys.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function createUserKey(userId: number, wrappedDek: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(userKeys).values({ userId, wrappedDek }).onConflictDoUpdate({ target: userKeys.userId, set: { wrappedDek } });
}

/**
 * Crypto-shred: destroys the wrapped DEK. Every payload encrypted under it
 * (Gemini key, Gmail token at rest) becomes permanently undecryptable,
 * including in backups. Called only from account deletion.
 */
export async function shredUserKey(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(userKeys).set({ wrappedDek: "", destroyedAt: new Date() }).where(eq(userKeys.userId, userId));
}

export async function findOrCreateGoogleUser(input: { googleId: string; email: string; name: string | null }) {
  const conn = await getDb();
  if (!conn) throw new Error("Database is unavailable");
  const byGoogle = await conn.select().from(users).where(eq(users.googleId, input.googleId)).limit(1);
  if (byGoogle[0]) {
    await upsertUser({ openId: byGoogle[0].openId, lastSignedIn: new Date() });
    return (await getUserByOpenId(byGoogle[0].openId))!;
  }
  const email = input.email.trim().toLowerCase();
  const byEmail = await getUserByEmail(email);
  if (byEmail) {
    // Link Google to the existing account (password or pre-provisioned).
    await conn.update(users).set({ googleId: input.googleId, name: byEmail.name || input.name, lastSignedIn: new Date() }).where(eq(users.id, byEmail.id));
    return (await getUserByOpenId(byEmail.openId))!;
  }
  const isFirstUser = (await countUsers()) === 0;
  const openId = `local-${randomUUID().replace(/-/g, "").slice(0, 24)}`;
  await upsertUser({ openId, name: input.name || null, email, loginMethod: "google", googleId: input.googleId, role: isFirstUser ? "admin" : "user" });
  return (await getUserByOpenId(openId))!;
}

export async function addWaitlistEntry(input: {
  name: string;
  email: string;
  destination: string;
  journeyStage: string;
  graduationYear: string;
  note?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const existing = await db.select().from(waitlistEntries).where(eq(waitlistEntries.email, input.email)).limit(1);
  if (existing[0]) return { entry: existing[0], alreadyRegistered: true };
  await db.insert(waitlistEntries).values({ ...input, note: input.note || null });
  const inserted = await db.select().from(waitlistEntries).where(eq(waitlistEntries.email, input.email)).limit(1);
  return { entry: inserted[0], alreadyRegistered: false };
}

export async function getWorkspaceProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(workspaceProfiles).where(eq(workspaceProfiles.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function saveWorkspaceProfile(userId: number, input: {
  organization: string;
  teamSize: string;
  activeRegions: string;
  applicantVolume: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(workspaceProfiles).values({ userId, ...input, onboardingComplete: true }).onConflictDoUpdate({ target: workspaceProfiles.userId, set: { ...input, onboardingComplete: true } });
  return getWorkspaceProfile(userId);
}

export async function getStudentProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  return result[0] ?? null;
}

// --- Student Gemini key (BYO-AI; sealed under the user's DEK) ---

export async function saveGeminiApiKey(userId: number, apiKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const sealed = await encryptForUser(userId, apiKey.trim());
  if (sealed === null) throw new Error("Your encryption key was destroyed with your account. This data cannot be re-secured.");
  await db.update(studentProfiles).set({ geminiApiKeySealed: sealed }).where(eq(studentProfiles.userId, userId));
  return { saved: true };
}

export async function clearGeminiApiKey(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(studentProfiles).set({ geminiApiKeySealed: null }).where(eq(studentProfiles.userId, userId));
  return { cleared: true };
}

/** Resolves the student's own Gemini key for server-side LLM calls. Null when absent or shredded. */
export async function getStudentGeminiApiKey(userId: number): Promise<string | null> {
  const profile = await getStudentProfile(userId);
  if (!profile?.geminiApiKeySealed) return null;
  return decryptForUser(userId, profile.geminiApiKeySealed);
}

export async function acceptLegalVersion(userId: number, version: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const profile = legalAcceptanceProfile(userId, version);
  await db.insert(studentProfiles).values(profile).onConflictDoUpdate({
    target: studentProfiles.userId,
    set: { acceptedLegalVersion: profile.acceptedLegalVersion },
  });
  return { accepted: true };
}

/** GDPR data portability: everything we hold on this student, minus secrets. */
export async function exportStudentData(userId: number) {
  const [profile, fitProfile, universities, milestones, reminders, documents, documentRequirementLinks, savedGermany, savedItaly, handoffs, briefings, events, relationship] = await Promise.all([
    getStudentProfile(userId), getStudentFitProfile(userId), listUniversities(userId), listMilestones(userId), listReminders(userId), listStudentDocuments(userId), listStudentDocumentRequirementLinks(userId), listSavedGermanyProgrammes(userId), listSavedItalyProgrammes(userId), listGermanyProgrammeDeadlineHandoffs(userId), listGermanyProgrammeBriefings(userId, "en"), listApplicationEvents(userId, { limit: 200 }), listUniversityRelationshipWorkspace(userId),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    profile,
    fitProfile,
    savedUniversities: universities,
    milestones,
    reminders,
    documents: documents.map((d) => ({ ...d, storageKey: undefined })),
    documentRequirementLinks,
    savedGermanyProgrammes: savedGermany,
    savedItalyProgrammes: savedItaly,
    deadlineHandoffs: handoffs,
    researchBriefings: briefings,
    applicationEvents: events,
    contacts: relationship.contacts,
    communications: relationship.communications,
    followUpPlans: relationship.followUpPlans,
  };
}

/**
 * Full account erasure. Hard-deletes every personal row across all tables,
 * then crypto-shreds the user's DEK so any encrypted payload that survived
 * in backups becomes permanently undecryptable. Finally revokes all sessions.
 */
export async function deleteStudentAccount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  // Documents metadata first (bytes live in local storage and are removed separately).
  await db.delete(studentDocumentRequirementLinks).where(eq(studentDocumentRequirementLinks.userId, userId));
  await db.delete(studentDocuments).where(eq(studentDocuments.userId, userId));
  await db.delete(universityFollowUpNotifications).where(eq(universityFollowUpNotifications.userId, userId));
  await db.delete(universityCommunications).where(eq(universityCommunications.userId, userId));
  await db.delete(universityContacts).where(eq(universityContacts.userId, userId));
  await db.delete(universityFollowUpPlans).where(eq(universityFollowUpPlans.userId, userId));
  await db.delete(universityCommunicationAuditEvents).where(eq(universityCommunicationAuditEvents.userId, userId));
  await db.delete(studentInboxConnections).where(eq(studentInboxConnections.userId, userId));
  await db.delete(applicationMilestones).where(eq(applicationMilestones.userId, userId));
  await db.delete(savedUniversities).where(eq(savedUniversities.userId, userId));
  await db.delete(germanyProgrammeDeadlineHandoffs).where(eq(germanyProgrammeDeadlineHandoffs.userId, userId));
  await db.delete(programmeResearchBriefings).where(eq(programmeResearchBriefings.userId, userId));
  await db.delete(savedGermanyProgrammes).where(eq(savedGermanyProgrammes.userId, userId));
  await db.delete(savedItalyProgrammes).where(eq(savedItalyProgrammes.userId, userId));
  await db.delete(personalReminders).where(eq(personalReminders.userId, userId));
  await db.delete(reminderPreferences).where(eq(reminderPreferences.userId, userId));
  await db.delete(deadlineNotifications).where(eq(deadlineNotifications.userId, userId));
  await db.delete(familyInvites).where(eq(familyInvites.userId, userId));
  await db.delete(studentConsultationCycles).where(eq(studentConsultationCycles.userId, userId));
  await db.delete(studentFitProfiles).where(eq(studentFitProfiles.userId, userId));
  await db.delete(applicationEvents).where(eq(applicationEvents.userId, userId));
  await db.delete(workspaceProfiles).where(eq(workspaceProfiles.userId, userId));
  await db.delete(userKeys).where(eq(userKeys.userId, userId)); // the shred itself
  await db.delete(studentProfiles).where(eq(studentProfiles.userId, userId));
  await db.delete(users).where(eq(users.id, userId)); // kills every session's identity
  return { deleted: true };
}

export type StudentFitProfileInput = {
  studyDirection: string; studyLevel?: string; academicAverage?: string; gradeScale?: string; qualifications?: string; nationality?: string; languageComfort?: string; tuitionBudgetBand?: string; fundingRoute?: string; hasSponsor: boolean; priorities?: string; consent: boolean;
};

export async function getStudentFitProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(studentFitProfiles).where(eq(studentFitProfiles.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function saveStudentFitProfile(userId: number, input: StudentFitProfileInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const values = { userId, studyDirection: input.studyDirection, studyLevel: input.studyLevel || null, academicAverage: input.academicAverage || null, gradeScale: input.gradeScale || null, qualifications: input.qualifications || null, nationality: input.nationality || null, languageComfort: input.languageComfort || null, tuitionBudgetBand: input.tuitionBudgetBand || null, fundingRoute: input.fundingRoute || null, hasSponsor: input.hasSponsor, priorities: input.priorities || null, matchingConsentAt: input.consent ? new Date() : null };
  await db.insert(studentFitProfiles).values(values).onConflictDoUpdate({ target: studentFitProfiles.userId, set: values });
  // Only the actual consent moment counts as "consultation completed" —
  // this function is also called on intermediate onboarding steps before
  // consent, which should not each produce a lifecycle event.
  if (input.consent) await recordApplicationEvent(userId, { eventType: "consultation_completed", eventJson: { studyDirection: input.studyDirection } });
  return getStudentFitProfile(userId);
}

export async function saveStudentProfile(userId: number, input: { preferredName: string; contactEmail: string; phoneNumber: string; destination: string; graduationYear: string; highSchoolDiplomaOrigin: string; preferredLanguage: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(studentProfiles).values({ userId, ...input, onboardingComplete: true }).onConflictDoUpdate({ target: studentProfiles.userId, set: { ...input, onboardingComplete: true } });
  const existingReminders = await db.select().from(personalReminders).where(eq(personalReminders.userId, userId)).limit(1);
  if (!existingReminders[0]) {
    const isArabic = input.preferredLanguage === "ar";
    await db.insert(personalReminders).values([
      { userId, locale: input.preferredLanguage, title: isArabic ? "رتّب أول ثلاث جامعات" : "Save your first three universities", body: isArabic ? "اختار الجامعات اللي بتحسّها مناسبة إلك، وخلّي المقارنة أبسط." : "Choose the universities that feel right and make your comparison easier.", dueLabel: isArabic ? "لما تكون جاهز" : "Whenever you are ready" },
      { userId, locale: input.preferredLanguage, title: isArabic ? "ابدأ بورقة واحدة" : "Start with one document", body: isArabic ? "اختار ورقة موجودة عندك وخليها أول خطوة بترتيب طلباتك." : "Choose a document you already have and make it the first step in your application plan.", dueLabel: isArabic ? "هالأسبوع" : "This week" },
    ]);
  }
  return getStudentProfile(userId);
}

export async function getStudentConsultationCycle(userId: number, cycleKey: string) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(studentConsultationCycles).values({ userId, cycleKey }).onConflictDoUpdate({ target: [studentConsultationCycles.userId, studentConsultationCycles.cycleKey], set: { cycleKey } });
  const result = await db.select().from(studentConsultationCycles).where(and(eq(studentConsultationCycles.userId, userId), eq(studentConsultationCycles.cycleKey, cycleKey))).limit(1);
  const cycle = result[0] ?? null;
  return cycle ? { ...cycle, remainingUses: Math.max(0, cycle.includedUses - cycle.usedCount) } : null;
}

export async function consumeStudentConsultation(userId: number, cycleKey: string) {
  const cycle = await getStudentConsultationCycle(userId, cycleKey);
  if (!cycle) throw new Error("Consultation allowance is unavailable");
  if (cycle.remainingUses <= 0) throw new Error("Your included consultation refreshes for this application cycle have been used. You can still browse, save, compare, and organize programmes.");
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(studentConsultationCycles).set({ usedCount: sql`${studentConsultationCycles.usedCount} + 1`, lastConsultedAt: new Date() }).where(and(eq(studentConsultationCycles.userId, userId), eq(studentConsultationCycles.cycleKey, cycleKey), lte(studentConsultationCycles.usedCount, cycle.includedUses - 1)));
  const updated = await getStudentConsultationCycle(userId, cycleKey);
  if (!updated || updated.usedCount <= cycle.usedCount) throw new Error("Your included consultation refreshes for this application cycle have been used. You can still browse, save, compare, and organize programmes.");
  return updated;
}

export async function saveLastViewedComparisonUniversity(userId: number, universityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const ownedUniversity = await db.select({ id: savedUniversities.id }).from(savedUniversities).where(and(eq(savedUniversities.id, universityId), eq(savedUniversities.userId, userId))).limit(1);
  if (!ownedUniversity[0]) throw new Error("University is not part of this student journey");
  await db.update(studentProfiles).set({ lastViewedComparisonUniversityId: universityId }).where(eq(studentProfiles.userId, userId));
  return getStudentProfile(userId);
}

export async function listUniversities(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(savedUniversities).where(eq(savedUniversities.userId, userId));
}

type RelationshipStage = "cold" | "warm" | "active" | "responded" | "paused";
type ContactPreference = "email" | "portal" | "do_not_contact";
type CommunicationCategory = "general" | "document_request" | "interview" | "decision" | "next_step" | "needs_review";
type AuditEventType = "draft_created" | "draft_updated" | "student_approved" | "provider_send_requested" | "sent" | "send_failed" | "reply_imported" | "reply_categorized" | "follow_up_planned" | "follow_up_completed" | "inbox_connected" | "inbox_disconnected";

async function assertOwnedUniversity(userId: number, universityId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const university = await db.select().from(savedUniversities).where(and(eq(savedUniversities.id, universityId), eq(savedUniversities.userId, userId))).limit(1);
  if (!university[0]) throw new Error("University is not part of this student journey");
  return university[0];
}

async function assertOwnedContact(userId: number, contactId: number, universityId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const contact = await db.select().from(universityContacts).where(and(eq(universityContacts.id, contactId), eq(universityContacts.userId, userId))).limit(1);
  if (!contact[0] || (universityId && contact[0].universityId !== universityId)) throw new Error("Contact is not part of this student relationship workspace");
  return contact[0];
}

async function recordCommunicationAudit(userId: number, input: { communicationId?: number; followUpPlanId?: number; eventType: AuditEventType; eventJson?: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(universityCommunicationAuditEvents).values({ userId, communicationId: input.communicationId ?? null, followUpPlanId: input.followUpPlanId ?? null, eventType: input.eventType, eventJson: input.eventJson ? JSON.stringify(input.eventJson) : null });
}

export type ApplicationEventType = "programme_saved" | "programme_archived" | "programme_priority_set" | "programme_priority_cleared" | "decision_notes_updated" | "application_preparation_started" | "consultation_completed" | "document_uploaded" | "document_verified" | "deadline_confirmed" | "communication_drafted" | "communication_approved" | "communication_sent" | "communication_reply_received" | "follow_up_planned" | "follow_up_completed" | "application_submitted" | "admission_offer_received" | "application_rejected";

/**
 * The general application-lifecycle event writer (see applicationEvents in
 * drizzle/schema.ts for the full rationale). This never throws on a missing
 * database the way most other writers in this file do — recording history
 * is important but should not be able to fail a student-facing mutation
 * that already succeeded against its own table. A failed history write is
 * logged, not surfaced.
 */
async function recordApplicationEvent(userId: number, input: { programmeId?: string; country?: "germany" | "italy"; universityId?: number; eventType: ApplicationEventType; eventJson?: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(applicationEvents).values({ userId, programmeId: input.programmeId ?? null, country: input.country ?? null, universityId: input.universityId ?? null, eventType: input.eventType, eventJson: input.eventJson ? JSON.stringify(input.eventJson) : null });
  } catch (error) {
    console.error("Failed to record application event", { userId, eventType: input.eventType, error });
  }
}

export async function listApplicationEvents(userId: number, filter?: { programmeId?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(applicationEvents.userId, userId)];
  if (filter?.programmeId) conditions.push(eq(applicationEvents.programmeId, filter.programmeId));
  return db.select().from(applicationEvents).where(and(...conditions)).orderBy(desc(applicationEvents.createdAt)).limit(filter?.limit ?? 120);
}

/**
 * A student explicitly elects to organise preparation for one saved programme.
 * This is deliberately not a submission or admissions decision; it only gives
 * their own Journey an active preparation context. Repeated clicks are
 * idempotent so history cannot be inflated accidentally.
 */
export async function startGermanyProgrammePreparation(userId: number, programmeId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const saved = await db.select({ programmeId: savedGermanyProgrammes.programmeId }).from(savedGermanyProgrammes).where(and(eq(savedGermanyProgrammes.userId, userId), eq(savedGermanyProgrammes.programmeId, programmeId), isNull(savedGermanyProgrammes.archivedAt))).limit(1);
  if (!saved[0]) throw new Error("Choose and save this programme before starting preparation.");
  const existing = await db.select({ id: applicationEvents.id }).from(applicationEvents).where(and(eq(applicationEvents.userId, userId), eq(applicationEvents.programmeId, programmeId), eq(applicationEvents.eventType, "application_preparation_started"))).limit(1);
  if (!existing[0]) await recordApplicationEvent(userId, { programmeId, country: "germany", eventType: "application_preparation_started" });
  return listApplicationEvents(userId, { programmeId, limit: 120 });
}

export async function listUniversityRelationshipWorkspace(userId: number) {
  const db = await getDb();
  if (!db) return { contacts: [], communications: [], followUpPlans: [], auditEvents: [], inboxConnection: null };
  // Due follow-up plans are promoted through the delivering path (notification
  // insert + promotion), never a bare status flip — otherwise loading the
  // workspace before the scheduler fires would silently swallow the alert.
  const profile = await getStudentProfile(userId);
  await createDueUniversityFollowUpNotifications(userId, profile?.preferredLanguage === "ar" ? "ar" : "en", new Date());
  const [contacts, communications, followUpPlans, auditEvents, inboxConnection] = await Promise.all([
    db.select({ id: universityContacts.id, universityId: universityContacts.universityId, university: savedUniversities.university, program: savedUniversities.program, contactName: universityContacts.contactName, contactRole: universityContacts.contactRole, email: universityContacts.email, phone: universityContacts.phone, portalUrl: universityContacts.portalUrl, relationshipStage: universityContacts.relationshipStage, contactPreference: universityContacts.contactPreference, studentConfirmedAt: universityContacts.studentConfirmedAt, lastContactAt: universityContacts.lastContactAt, nextFollowUpAt: universityContacts.nextFollowUpAt }).from(universityContacts).innerJoin(savedUniversities, eq(universityContacts.universityId, savedUniversities.id)).where(eq(universityContacts.userId, userId)).orderBy(desc(universityContacts.updatedAt)),
    db.select({ id: universityCommunications.id, universityId: universityCommunications.universityId, university: savedUniversities.university, program: savedUniversities.program, contactId: universityCommunications.contactId, direction: universityCommunications.direction, status: universityCommunications.status, subject: universityCommunications.subject, body: universityCommunications.body, category: universityCommunications.category, aiNextStep: universityCommunications.aiNextStep, aiReviewNote: universityCommunications.aiReviewNote, studentApprovedAt: universityCommunications.studentApprovedAt, sentAt: universityCommunications.sentAt, receivedAt: universityCommunications.receivedAt, createdAt: universityCommunications.createdAt }).from(universityCommunications).innerJoin(savedUniversities, eq(universityCommunications.universityId, savedUniversities.id)).where(eq(universityCommunications.userId, userId)).orderBy(desc(universityCommunications.createdAt)),
    db.select({ id: universityFollowUpPlans.id, universityId: universityFollowUpPlans.universityId, university: savedUniversities.university, contactId: universityFollowUpPlans.contactId, dueAt: universityFollowUpPlans.dueAt, reason: universityFollowUpPlans.reason, status: universityFollowUpPlans.status, completedAt: universityFollowUpPlans.completedAt }).from(universityFollowUpPlans).innerJoin(savedUniversities, eq(universityFollowUpPlans.universityId, savedUniversities.id)).where(eq(universityFollowUpPlans.userId, userId)).orderBy(universityFollowUpPlans.dueAt),
    db.select().from(universityCommunicationAuditEvents).where(eq(universityCommunicationAuditEvents.userId, userId)).orderBy(desc(universityCommunicationAuditEvents.createdAt)).limit(80),
    db.select({ emailAddress: studentInboxConnections.emailAddress, connectedAt: studentInboxConnections.connectedAt, lastSyncedAt: studentInboxConnections.lastSyncedAt, disconnectedAt: studentInboxConnections.disconnectedAt }).from(studentInboxConnections).where(and(eq(studentInboxConnections.userId, userId), isNull(studentInboxConnections.disconnectedAt))).limit(1),
  ]);
  return { contacts, communications, followUpPlans, auditEvents, inboxConnection: inboxConnection[0] ?? null };
}

export async function saveUniversityContact(userId: number, input: { universityId: number; contactName?: string; contactRole?: string; email: string; phone?: string; portalUrl?: string; relationshipStage: RelationshipStage; contactPreference: ContactPreference }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await assertOwnedUniversity(userId, input.universityId);
  await db.insert(universityContacts).values({ userId, universityId: input.universityId, contactName: input.contactName || null, contactRole: input.contactRole || null, email: input.email, phone: input.phone || null, portalUrl: input.portalUrl || null, relationshipStage: input.relationshipStage, contactPreference: input.contactPreference }).onConflictDoUpdate({ target: [universityContacts.userId, universityContacts.universityId, universityContacts.email], set: { contactName: input.contactName || null, contactRole: input.contactRole || null, phone: input.phone || null, portalUrl: input.portalUrl || null, relationshipStage: input.relationshipStage, contactPreference: input.contactPreference, studentConfirmedAt: new Date() } });
  return listUniversityRelationshipWorkspace(userId);
}

export async function getUniversityCommunicationDraftContext(userId: number, input: { universityId: number; contactId?: number }) {
  const university = await assertOwnedUniversity(userId, input.universityId);
  const contact = input.contactId ? await assertOwnedContact(userId, input.contactId, input.universityId) : null;
  return {
    university: { university: university.university, location: university.location, program: university.program, deadline: university.deadline, sourceUrl: university.sourceUrl, snapshotSummary: university.snapshotSummary },
    contact: contact ? { name: contact.contactName, role: contact.contactRole, email: contact.email, relationshipStage: contact.relationshipStage, contactPreference: contact.contactPreference } : null,
  };
}

export async function createUniversityCommunicationDraft(userId: number, input: { universityId: number; contactId?: number; subject: string; body: string; category: CommunicationCategory }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await assertOwnedUniversity(userId, input.universityId);
  if (input.contactId) await assertOwnedContact(userId, input.contactId, input.universityId);
  const created = await db.insert(universityCommunications).values({ userId, universityId: input.universityId, contactId: input.contactId ?? null, direction: "outbound", status: "draft", subject: input.subject, body: input.body, category: input.category }).returning({ id: universityCommunications.id });
  const communicationId = created[0].id;
  await recordCommunicationAudit(userId, { communicationId, eventType: "draft_created", eventJson: { origin: "student_workspace" } });
  return communicationId;
}

export async function updateUniversityCommunicationDraft(userId: number, input: { communicationId: number; subject: string; body: string; category: CommunicationCategory }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const communication = await db.select().from(universityCommunications).where(and(eq(universityCommunications.id, input.communicationId), eq(universityCommunications.userId, userId))).limit(1);
  if (!communication[0] || !["draft", "ready_for_review"].includes(communication[0].status)) throw new Error("Only an unapproved draft can be edited");
  await db.update(universityCommunications).set({ subject: input.subject, body: input.body, category: input.category, status: "ready_for_review" }).where(eq(universityCommunications.id, input.communicationId));
  await recordCommunicationAudit(userId, { communicationId: input.communicationId, eventType: "draft_updated" });
  return listUniversityRelationshipWorkspace(userId);
}

export async function approveUniversityCommunication(userId: number, communicationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const communication = await db.select().from(universityCommunications).where(and(eq(universityCommunications.id, communicationId), eq(universityCommunications.userId, userId))).limit(1);
  if (!communication[0] || communication[0].direction !== "outbound" || !["draft", "ready_for_review"].includes(communication[0].status)) throw new Error("Only a reviewable outbound draft can be approved");
  const approvedAt = new Date();
  await db.update(universityCommunications).set({ status: "student_approved", studentApprovedAt: approvedAt }).where(eq(universityCommunications.id, communicationId));
  await recordCommunicationAudit(userId, { communicationId, eventType: "student_approved", eventJson: { approvedAt: approvedAt.toISOString(), sendPolicy: "student_click_required" } });
  return listUniversityRelationshipWorkspace(userId);
}

export async function createUniversityFollowUpPlan(userId: number, input: { universityId: number; contactId?: number; dueAt: Date; reason: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await assertOwnedUniversity(userId, input.universityId);
  if (input.contactId) await assertOwnedContact(userId, input.contactId, input.universityId);
  const created = await db.insert(universityFollowUpPlans).values({ userId, universityId: input.universityId, contactId: input.contactId ?? null, dueAt: input.dueAt, reason: input.reason }).returning({ id: universityFollowUpPlans.id });
  const followUpPlanId = created[0].id;
  if (input.contactId) await db.update(universityContacts).set({ nextFollowUpAt: input.dueAt }).where(and(eq(universityContacts.id, input.contactId), eq(universityContacts.userId, userId)));
  await recordCommunicationAudit(userId, { followUpPlanId, eventType: "follow_up_planned", eventJson: { dueAt: input.dueAt.toISOString() } });
  return listUniversityRelationshipWorkspace(userId);
}

export async function completeUniversityFollowUpPlan(userId: number, followUpPlanId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const plan = await db.select().from(universityFollowUpPlans).where(and(eq(universityFollowUpPlans.id, followUpPlanId), eq(universityFollowUpPlans.userId, userId))).limit(1);
  if (!plan[0]) throw new Error("Follow-up plan not found");
  const completedAt = new Date();
  await db.update(universityFollowUpPlans).set({ status: "completed", completedAt }).where(eq(universityFollowUpPlans.id, followUpPlanId));
  await recordCommunicationAudit(userId, { followUpPlanId, eventType: "follow_up_completed", eventJson: { completedAt: completedAt.toISOString() } });
  return listUniversityRelationshipWorkspace(userId);
}

export async function saveStudentGmailConnection(userId: number, input: { emailAddress: string; encryptedRefreshToken: string; gmailHistoryId?: string; watchExpiresAt?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  // Double-wrap the provider-encrypted token under the user's DEK so that
  // crypto-shredding the DEK also destroys Gmail access credentials at rest.
  const sealedToken = (await encryptForUser(userId, input.encryptedRefreshToken)) ?? "";
  await db.insert(studentInboxConnections).values({ userId, provider: "gmail", emailAddress: input.emailAddress, encryptedRefreshToken: sealedToken || input.encryptedRefreshToken, gmailHistoryId: input.gmailHistoryId ?? null, watchExpiresAt: input.watchExpiresAt ?? null, disconnectedAt: null, lastSyncedAt: new Date() }).onConflictDoUpdate({ target: studentInboxConnections.userId, set: { emailAddress: input.emailAddress, encryptedRefreshToken: sealedToken || input.encryptedRefreshToken, gmailHistoryId: input.gmailHistoryId ?? null, watchExpiresAt: input.watchExpiresAt ?? null, disconnectedAt: null, lastSyncedAt: new Date() } });
  await recordCommunicationAudit(userId, { eventType: "inbox_connected", eventJson: { provider: "gmail", emailAddress: input.emailAddress } });
  return listUniversityRelationshipWorkspace(userId);
}

export async function disconnectStudentGmail(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(studentInboxConnections).set({ disconnectedAt: new Date(), encryptedRefreshToken: "" }).where(and(eq(studentInboxConnections.userId, userId), isNull(studentInboxConnections.disconnectedAt)));
  await recordCommunicationAudit(userId, { eventType: "inbox_disconnected", eventJson: { provider: "gmail" } });
  return listUniversityRelationshipWorkspace(userId);
}

export async function getStudentGmailConnectionForServer(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const connection = await db.select().from(studentInboxConnections).where(and(eq(studentInboxConnections.userId, userId), isNull(studentInboxConnections.disconnectedAt))).limit(1);
  if (!connection[0]) return null;
  // Unwrap the user-DEK layer added in saveStudentGmailConnection. Legacy
  // rows stored only the provider-layer ciphertext and still decrypt fine.
  const unwrapped = await decryptForUser(userId, connection[0].encryptedRefreshToken);
  return { ...connection[0], encryptedRefreshToken: unwrapped ?? connection[0].encryptedRefreshToken };
}

export async function prepareApprovedUniversityCommunicationForSend(userId: number, communicationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const records = await db.select({ communication: universityCommunications, contact: universityContacts }).from(universityCommunications).leftJoin(universityContacts, eq(universityCommunications.contactId, universityContacts.id)).where(and(eq(universityCommunications.id, communicationId), eq(universityCommunications.userId, userId))).limit(1);
  const record = records[0];
  if (!record || record.communication.direction !== "outbound" || record.communication.status !== "student_approved" || !record.communication.studentApprovedAt) throw new Error("Review and approve this draft before sending from Gmail.");
  if (!record.contact || record.contact.userId !== userId || record.contact.contactPreference === "do_not_contact") throw new Error("This draft needs a confirmed email contact before it can be sent.");
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [recentStudentSends, recentContactSends] = await Promise.all([
    db.select({ id: universityCommunications.id }).from(universityCommunications).where(and(eq(universityCommunications.userId, userId), eq(universityCommunications.direction, "outbound"), eq(universityCommunications.status, "sent"), gte(universityCommunications.sentAt, windowStart))),
    db.select({ id: universityCommunications.id }).from(universityCommunications).where(and(eq(universityCommunications.userId, userId), eq(universityCommunications.contactId, record.contact.id), eq(universityCommunications.direction, "outbound"), eq(universityCommunications.status, "sent"), gte(universityCommunications.sentAt, windowStart))),
  ]);
  if (recentStudentSends.length >= MAX_STUDENT_UNIVERSITY_EMAILS_PER_24H) throw new Error("Nightfall’s student-protection limit is five university emails per 24 hours. Please continue tomorrow.");
  if (recentContactSends.length >= MAX_EMAILS_PER_CONTACT_PER_24H) throw new Error("Wait at least 24 hours before sending another email to this university contact.");
  await db.update(universityCommunications).set({ status: "provider_send_requested" }).where(eq(universityCommunications.id, communicationId));
  await recordCommunicationAudit(userId, { communicationId, eventType: "provider_send_requested", eventJson: { provider: "gmail", recipient: record.contact.email } });
  return { communication: record.communication, contact: record.contact };
}

export async function markUniversityCommunicationSent(userId: number, input: { communicationId: number; providerMessageId: string; providerThreadId?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const sentAt = new Date();
  const message = await db.select().from(universityCommunications).where(and(eq(universityCommunications.id, input.communicationId), eq(universityCommunications.userId, userId))).limit(1);
  if (!message[0]) throw new Error("Communication not found");
  await db.update(universityCommunications).set({ status: "sent", providerMessageId: input.providerMessageId, providerThreadId: input.providerThreadId ?? null, sentAt }).where(eq(universityCommunications.id, input.communicationId));
  if (message[0].contactId) await db.update(universityContacts).set({ lastContactAt: sentAt, relationshipStage: "active" }).where(and(eq(universityContacts.id, message[0].contactId), eq(universityContacts.userId, userId)));
  await recordCommunicationAudit(userId, { communicationId: input.communicationId, eventType: "sent", eventJson: { provider: "gmail", providerMessageId: input.providerMessageId, sentAt: sentAt.toISOString() } });
  return listUniversityRelationshipWorkspace(userId);
}

export async function markUniversityCommunicationSendFailed(userId: number, communicationId: number, message: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(universityCommunications).set({ status: "send_failed" }).where(and(eq(universityCommunications.id, communicationId), eq(universityCommunications.userId, userId)));
  await recordCommunicationAudit(userId, { communicationId, eventType: "send_failed", eventJson: { provider: "gmail", message: message.slice(0, 500) } });
  return listUniversityRelationshipWorkspace(userId);
}

export async function listUniversityContactsForInboxSync(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: universityContacts.id, universityId: universityContacts.universityId, email: universityContacts.email }).from(universityContacts).where(and(eq(universityContacts.userId, userId), eq(universityContacts.contactPreference, "email")));
}

export async function importUniversityInboundCommunication(userId: number, input: { universityId: number; contactId: number; subject: string; body: string; providerMessageId: string; providerThreadId?: string; receivedAt: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const existing = await db.select({ id: universityCommunications.id }).from(universityCommunications).where(and(eq(universityCommunications.userId, userId), eq(universityCommunications.providerMessageId, input.providerMessageId))).limit(1);
  if (existing[0]) return { communicationId: existing[0].id, imported: false };
  const created = await db.insert(universityCommunications).values({ userId, universityId: input.universityId, contactId: input.contactId, direction: "inbound", status: "needs_review", subject: input.subject || "University reply", body: input.body, category: "needs_review", providerMessageId: input.providerMessageId, providerThreadId: input.providerThreadId ?? null, receivedAt: input.receivedAt }).returning({ id: universityCommunications.id });
  const communicationId = created[0].id;
  await db.update(universityContacts).set({ relationshipStage: "responded", lastContactAt: input.receivedAt }).where(and(eq(universityContacts.id, input.contactId), eq(universityContacts.userId, userId)));
  await recordCommunicationAudit(userId, { communicationId, eventType: "reply_imported", eventJson: { provider: "gmail", providerMessageId: input.providerMessageId } });
  return { communicationId, imported: true };
}

export async function categorizeUniversityInboundCommunication(userId: number, input: { communicationId: number; category: CommunicationCategory; nextStep: string; reviewNote: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(universityCommunications).set({ category: input.category, aiNextStep: input.nextStep, aiReviewNote: input.reviewNote }).where(and(eq(universityCommunications.id, input.communicationId), eq(universityCommunications.userId, userId), eq(universityCommunications.direction, "inbound")));
  await recordCommunicationAudit(userId, { communicationId: input.communicationId, eventType: "reply_categorized", eventJson: { category: input.category, reviewRequired: true } });
}

export async function searchGermanyProgrammeIndex(input: { query?: string; category?: string; language?: string; limit: number }) {
  const db = await getDb();
  if (!db) return [];
  const query = input.query?.trim();
  const conditions = [];
  const queryTerms = researchTerms(query);
  if (queryTerms.length) conditions.push(or(...queryTerms.flatMap((term) => [like(germanyProgrammeIndex.programmeName, `%${term}%`), like(germanyProgrammeIndex.officialName, `%${term}%`), like(germanyProgrammeIndex.city, `%${term}%`), like(germanyProgrammeIndex.broadSubjectCategories, `%${term}%`), like(germanyProgrammeIndex.fieldMatchBasis, `%${term}%`)])));
  if (input.category) conditions.push(like(germanyProgrammeIndex.broadSubjectCategories, `%${input.category}%`));
  if (input.language) conditions.push(like(germanyProgrammeIndex.programmeLanguage, `%${input.language}%`));
  return db.select().from(germanyProgrammeIndex).where(conditions.length ? and(...conditions) : undefined).limit(input.limit);
}

export async function listGermanyProgrammeCandidatesForFit(input: { studyDirection: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const directionTerms = researchTerms(input.studyDirection);
  const conditions = directionTerms.length ? [or(...directionTerms.flatMap((term) => [like(germanyProgrammeIndex.broadSubjectCategories, `%${term}%`), like(germanyProgrammeIndex.programmeName, `%${term}%`), like(germanyProgrammeIndex.fieldMatchBasis, `%${term}%`)]))] : [];
  return db.select().from(germanyProgrammeIndex).where(conditions.length ? and(...conditions) : undefined).limit(Math.min(input.limit ?? 240, 300));
}

function researchTerms(value?: string) {
  const ignored = new Set(["about", "after", "and", "are", "for", "from", "have", "into", "like", "need", "programme", "program", "study", "that", "the", "this", "want", "with", "would", "بدي", "بدي", "ال", "شو", "عن", "على", "في", "من"]);
  return [...new Set((value ?? "").toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu)?.map((term) => term.trim()).filter((term) => term.length >= 3 && !ignored.has(term)) ?? [])].slice(0, 8);
}

export async function listSavedGermanyProgrammes(userId: number, archived = false) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    programmeId: germanyProgrammeIndex.programmeId,
    officialName: germanyProgrammeIndex.officialName,
    city: germanyProgrammeIndex.city,
    region: germanyProgrammeIndex.region,
    programmeName: germanyProgrammeIndex.programmeName,
    broadSubjectCategories: germanyProgrammeIndex.broadSubjectCategories,
    programmeEvidenceUrl: germanyProgrammeIndex.programmeEvidenceUrl,
    officialProgrammeUrl: germanyProgrammeIndex.officialProgrammeUrl,
    programmeLanguage: germanyProgrammeIndex.programmeLanguage,
    admissionSemester: germanyProgrammeIndex.admissionSemester,
    admissionMode: germanyProgrammeIndex.admissionMode,
    sourceLayer: germanyProgrammeIndex.sourceLayer,
    reputationTier: germanyProgrammeIndex.reputationTier,
    securityInfrastructure: germanyProgrammeIndex.securityInfrastructure,
    feeRiskCategory: germanyProgrammeIndex.feeRiskCategory,
    syrianBaccalaureateAnabinCondition: germanyProgrammeIndex.syrianBaccalaureateAnabinCondition,
    isPinned: savedGermanyProgrammes.isPinned,
    priorityRank: savedGermanyProgrammes.priorityRank,
    priorityUpdatedAt: savedGermanyProgrammes.priorityUpdatedAt,
    archivedAt: savedGermanyProgrammes.archivedAt,
    decisionNotes: savedGermanyProgrammes.decisionNotes,
    savedAt: savedGermanyProgrammes.createdAt,
  }).from(savedGermanyProgrammes).innerJoin(germanyProgrammeIndex, eq(savedGermanyProgrammes.programmeId, germanyProgrammeIndex.programmeId)).where(and(eq(savedGermanyProgrammes.userId, userId), archived ? isNotNull(savedGermanyProgrammes.archivedAt) : isNull(savedGermanyProgrammes.archivedAt))).orderBy(sql`${savedGermanyProgrammes.priorityRank} IS NULL`, savedGermanyProgrammes.priorityRank, desc(savedGermanyProgrammes.isPinned), desc(savedGermanyProgrammes.createdAt));
}

export async function saveGermanyProgramme(userId: number, programmeId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const sourceProgramme = await db.select({ programmeId: germanyProgrammeIndex.programmeId }).from(germanyProgrammeIndex).where(eq(germanyProgrammeIndex.programmeId, programmeId)).limit(1);
  if (!sourceProgramme[0]) throw new Error("Programme is not available in the reviewed Germany research index");
  await db.insert(savedGermanyProgrammes).values({ userId, programmeId }).onConflictDoUpdate({ target: [savedGermanyProgrammes.userId, savedGermanyProgrammes.programmeId], set: { programmeId, archivedAt: null } });
  await recordApplicationEvent(userId, { programmeId, country: "germany", eventType: "programme_saved" });
  return listSavedGermanyProgrammes(userId);
}

export async function setGermanyProgrammePin(userId: number, programmeId: string, isPinned: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(savedGermanyProgrammes).set({ isPinned }).where(and(eq(savedGermanyProgrammes.userId, userId), eq(savedGermanyProgrammes.programmeId, programmeId), isNull(savedGermanyProgrammes.archivedAt)));
  return listSavedGermanyProgrammes(userId);
}

export async function setGermanyProgrammePriority(userId: number, programmeId: string, priorityRank: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  if (priorityRank !== null && (priorityRank < 1 || priorityRank > 12)) throw new Error("Choose a priority between 1 and 12");
  if (priorityRank !== null) {
    await db.update(savedGermanyProgrammes).set({ priorityRank: null }).where(and(eq(savedGermanyProgrammes.userId, userId), eq(savedGermanyProgrammes.priorityRank, priorityRank), isNull(savedGermanyProgrammes.archivedAt)));
  }
  await db.update(savedGermanyProgrammes).set({ priorityRank, priorityUpdatedAt: new Date() }).where(and(eq(savedGermanyProgrammes.userId, userId), eq(savedGermanyProgrammes.programmeId, programmeId), isNull(savedGermanyProgrammes.archivedAt)));
  await recordApplicationEvent(userId, { programmeId, country: "germany", eventType: priorityRank === null ? "programme_priority_cleared" : "programme_priority_set", eventJson: { priorityRank } });
  return listSavedGermanyProgrammes(userId);
}

export async function archiveGermanyProgramme(userId: number, programmeId: string, archived: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(savedGermanyProgrammes).set({ archivedAt: archived ? new Date() : null, isPinned: archived ? false : undefined }).where(and(eq(savedGermanyProgrammes.userId, userId), eq(savedGermanyProgrammes.programmeId, programmeId)));
  if (archived) await recordApplicationEvent(userId, { programmeId, country: "germany", eventType: "programme_archived" });
  return listSavedGermanyProgrammes(userId, archived);
}

export async function removeGermanyProgramme(userId: number, programmeId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.delete(savedGermanyProgrammes).where(and(eq(savedGermanyProgrammes.userId, userId), eq(savedGermanyProgrammes.programmeId, programmeId)));
  await db.delete(programmeResearchBriefings).where(and(eq(programmeResearchBriefings.userId, userId), eq(programmeResearchBriefings.programmeId, programmeId)));
  return { removed: true };
}

export async function saveGermanyProgrammeDecisionNotes(userId: number, programmeId: string, decisionNotes: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(savedGermanyProgrammes).set({ decisionNotes: decisionNotes.trim() || null }).where(and(eq(savedGermanyProgrammes.userId, userId), eq(savedGermanyProgrammes.programmeId, programmeId), isNull(savedGermanyProgrammes.archivedAt)));
  await recordApplicationEvent(userId, { programmeId, country: "germany", eventType: "decision_notes_updated" });
  return listSavedGermanyProgrammes(userId);
}

export async function searchItalyProgrammeIndex(input: { query?: string; region?: string; language?: string; publicOnly?: boolean; limit: number }) {
  const db = await getDb();
  if (!db) return [];
  const query = input.query?.trim();
  const conditions = [];
  if (query) conditions.push(or(like(italyProgrammeIndex.programmeNameDisplay, `%${query}%`), like(italyProgrammeIndex.institutionName, `%${query}%`), like(italyProgrammeIndex.city, `%${query}%`)));
  if (input.region) conditions.push(like(italyProgrammeIndex.region, `%${input.region}%`));
  if (input.language) conditions.push(like(italyProgrammeIndex.programmeLanguage, `%${input.language}%`));
  if (input.publicOnly) conditions.push(eq(italyProgrammeIndex.publicOnlyComparable, true));
  return db.select().from(italyProgrammeIndex).where(conditions.length ? and(...conditions) : undefined).limit(input.limit);
}

/**
 * Mirrors listGermanyProgrammeCandidatesForFit's shape for the matching engine.
 * Matches on programmeNameDisplay (not the IT-only field) since that's the
 * always-populated, student-facing name. Italy's data has no per-programme
 * fee field to retain — that boundary belongs in the matching/UI layer's
 * copy, not faked here as a zero or null that could be misread as "free."
 */
export async function listItalyProgrammeCandidatesForFit(input: { studyDirection: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const direction = input.studyDirection.trim();
  const conditions = direction ? [or(like(italyProgrammeIndex.programmeNameDisplay, `%${direction}%`), like(italyProgrammeIndex.healthCategory, `%${direction}%`), like(italyProgrammeIndex.technologyEngineeringCategory, `%${direction}%`))] : [];
  return db.select().from(italyProgrammeIndex).where(conditions.length ? and(...conditions) : undefined).limit(Math.min(input.limit ?? 240, 300));
}

export async function listSavedItalyProgrammes(userId: number, archived = false) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    programmeId: italyProgrammeIndex.programmeId,
    institutionName: italyProgrammeIndex.institutionName,
    city: italyProgrammeIndex.city,
    region: italyProgrammeIndex.region,
    legalStatus: italyProgrammeIndex.legalStatus,
    publicOnlyComparable: italyProgrammeIndex.publicOnlyComparable,
    programmeNameEn: italyProgrammeIndex.programmeNameEn,
    programmeNameIt: italyProgrammeIndex.programmeNameIt,
    programmeNameDisplay: italyProgrammeIndex.programmeNameDisplay,
    degreeLevelEn: italyProgrammeIndex.degreeLevelEn,
    degreeClassCode: italyProgrammeIndex.degreeClassCode,
    cunArea: italyProgrammeIndex.cunArea,
    durationYears: italyProgrammeIndex.durationYears,
    programmeLanguage: italyProgrammeIndex.programmeLanguage,
    admissionsAccessTypeEn: italyProgrammeIndex.admissionsAccessTypeEn,
    officialProgrammeUrl: italyProgrammeIndex.officialProgrammeUrl,
    universitalyReferenceUrl: italyProgrammeIndex.universitalyReferenceUrl,
    healthCategory: italyProgrammeIndex.healthCategory,
    technologyEngineeringCategory: italyProgrammeIndex.technologyEngineeringCategory,
    priorityScope: italyProgrammeIndex.priorityScope,
    feeBasis: italyProgrammeIndex.feeBasis,
    scholarshipStatus: italyProgrammeIndex.scholarshipStatus,
    internationalStudentNote: italyProgrammeIndex.internationalStudentNote,
    isPinned: savedItalyProgrammes.isPinned,
    priorityRank: savedItalyProgrammes.priorityRank,
    priorityUpdatedAt: savedItalyProgrammes.priorityUpdatedAt,
    archivedAt: savedItalyProgrammes.archivedAt,
    decisionNotes: savedItalyProgrammes.decisionNotes,
    savedAt: savedItalyProgrammes.createdAt,
  }).from(savedItalyProgrammes).innerJoin(italyProgrammeIndex, eq(savedItalyProgrammes.programmeId, italyProgrammeIndex.programmeId)).where(and(eq(savedItalyProgrammes.userId, userId), archived ? isNotNull(savedItalyProgrammes.archivedAt) : isNull(savedItalyProgrammes.archivedAt))).orderBy(sql`${savedItalyProgrammes.priorityRank} IS NULL`, savedItalyProgrammes.priorityRank, desc(savedItalyProgrammes.isPinned), desc(savedItalyProgrammes.createdAt));
}

export async function saveItalyProgramme(userId: number, programmeId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const sourceProgramme = await db.select({ programmeId: italyProgrammeIndex.programmeId }).from(italyProgrammeIndex).where(eq(italyProgrammeIndex.programmeId, programmeId)).limit(1);
  if (!sourceProgramme[0]) throw new Error("Programme is not available in the reviewed Italy research index");
  await db.insert(savedItalyProgrammes).values({ userId, programmeId }).onConflictDoUpdate({ target: [savedItalyProgrammes.userId, savedItalyProgrammes.programmeId], set: { programmeId, archivedAt: null } });
  await recordApplicationEvent(userId, { programmeId, country: "italy", eventType: "programme_saved" });
  return listSavedItalyProgrammes(userId);
}

export async function setItalyProgrammePin(userId: number, programmeId: string, isPinned: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(savedItalyProgrammes).set({ isPinned }).where(and(eq(savedItalyProgrammes.userId, userId), eq(savedItalyProgrammes.programmeId, programmeId), isNull(savedItalyProgrammes.archivedAt)));
  return listSavedItalyProgrammes(userId);
}

export async function setItalyProgrammePriority(userId: number, programmeId: string, priorityRank: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  if (priorityRank !== null && (priorityRank < 1 || priorityRank > 12)) throw new Error("Choose a priority between 1 and 12");
  if (priorityRank !== null) {
    await db.update(savedItalyProgrammes).set({ priorityRank: null }).where(and(eq(savedItalyProgrammes.userId, userId), eq(savedItalyProgrammes.priorityRank, priorityRank), isNull(savedItalyProgrammes.archivedAt)));
  }
  await db.update(savedItalyProgrammes).set({ priorityRank, priorityUpdatedAt: new Date() }).where(and(eq(savedItalyProgrammes.userId, userId), eq(savedItalyProgrammes.programmeId, programmeId), isNull(savedItalyProgrammes.archivedAt)));
  await recordApplicationEvent(userId, { programmeId, country: "italy", eventType: priorityRank === null ? "programme_priority_cleared" : "programme_priority_set", eventJson: { priorityRank } });
  return listSavedItalyProgrammes(userId);
}

export async function archiveItalyProgramme(userId: number, programmeId: string, archived: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(savedItalyProgrammes).set({ archivedAt: archived ? new Date() : null, isPinned: archived ? false : undefined }).where(and(eq(savedItalyProgrammes.userId, userId), eq(savedItalyProgrammes.programmeId, programmeId)));
  if (archived) await recordApplicationEvent(userId, { programmeId, country: "italy", eventType: "programme_archived" });
  return listSavedItalyProgrammes(userId, archived);
}

export async function removeItalyProgramme(userId: number, programmeId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.delete(savedItalyProgrammes).where(and(eq(savedItalyProgrammes.userId, userId), eq(savedItalyProgrammes.programmeId, programmeId)));
  await db.delete(programmeResearchBriefings).where(and(eq(programmeResearchBriefings.userId, userId), eq(programmeResearchBriefings.programmeId, programmeId)));
  return { removed: true };
}

export async function saveItalyProgrammeDecisionNotes(userId: number, programmeId: string, decisionNotes: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(savedItalyProgrammes).set({ decisionNotes: decisionNotes.trim() || null }).where(and(eq(savedItalyProgrammes.userId, userId), eq(savedItalyProgrammes.programmeId, programmeId), isNull(savedItalyProgrammes.archivedAt)));
  await recordApplicationEvent(userId, { programmeId, country: "italy", eventType: "decision_notes_updated" });
  return listSavedItalyProgrammes(userId);
}

export async function getGermanyProgrammeBriefingContext(userId: number, programmeId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const result = await db.select({
    programmeId: germanyProgrammeIndex.programmeId,
    officialName: germanyProgrammeIndex.officialName,
    city: germanyProgrammeIndex.city,
    region: germanyProgrammeIndex.region,
    programmeName: germanyProgrammeIndex.programmeName,
    broadSubjectCategories: germanyProgrammeIndex.broadSubjectCategories,
    fieldMatchBasis: germanyProgrammeIndex.fieldMatchBasis,
    programmeEvidenceUrl: germanyProgrammeIndex.programmeEvidenceUrl,
    officialProgrammeUrl: germanyProgrammeIndex.officialProgrammeUrl,
    programmeLanguage: germanyProgrammeIndex.programmeLanguage,
    admissionSemester: germanyProgrammeIndex.admissionSemester,
    admissionMode: germanyProgrammeIndex.admissionMode,
    feeRiskCategory: germanyProgrammeIndex.feeRiskCategory,
    syrianBaccalaureateAnabinCondition: germanyProgrammeIndex.syrianBaccalaureateAnabinCondition,
    lastVerified: germanyProgrammeIndex.lastVerified,
  }).from(savedGermanyProgrammes).innerJoin(germanyProgrammeIndex, eq(savedGermanyProgrammes.programmeId, germanyProgrammeIndex.programmeId)).where(and(eq(savedGermanyProgrammes.userId, userId), eq(savedGermanyProgrammes.programmeId, programmeId), isNull(savedGermanyProgrammes.archivedAt))).limit(1);
  return result[0] ?? null;
}

export async function getCachedGermanyProgrammeBriefing(userId: number, programmeId: string, locale: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(programmeResearchBriefings).where(and(eq(programmeResearchBriefings.userId, userId), eq(programmeResearchBriefings.programmeId, programmeId), eq(programmeResearchBriefings.locale, locale))).limit(1);
  return result[0] ?? null;
}

export async function listGermanyProgrammeBriefings(userId: number, locale: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(programmeResearchBriefings).where(and(eq(programmeResearchBriefings.userId, userId), eq(programmeResearchBriefings.locale, locale))).orderBy(desc(programmeResearchBriefings.generatedAt));
}

export async function saveGermanyProgrammeBriefing(userId: number, programmeId: string, locale: string, sourceUrl: string, contentHash: string, briefingJson: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const generatedAt = new Date();
  await db.insert(programmeResearchBriefings).values({ userId, programmeId, locale, sourceUrl, contentHash, briefingJson, generatedAt }).onConflictDoUpdate({ target: [programmeResearchBriefings.userId, programmeResearchBriefings.programmeId, programmeResearchBriefings.locale], set: { sourceUrl, contentHash, briefingJson, generatedAt } });
  return getCachedGermanyProgrammeBriefing(userId, programmeId, locale);
}

export async function listGermanyProgrammeDeadlineHandoffs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ programmeId: germanyProgrammeIndex.programmeId, programmeName: germanyProgrammeIndex.programmeName, officialName: germanyProgrammeIndex.officialName, deadlineAt: germanyProgrammeDeadlineHandoffs.deadlineAt, officialEvidenceUrl: germanyProgrammeDeadlineHandoffs.officialEvidenceUrl, reviewedAt: germanyProgrammeDeadlineHandoffs.reviewedAt }).from(germanyProgrammeDeadlineHandoffs).innerJoin(germanyProgrammeIndex, eq(germanyProgrammeDeadlineHandoffs.programmeId, germanyProgrammeIndex.programmeId)).where(eq(germanyProgrammeDeadlineHandoffs.userId, userId)).orderBy(germanyProgrammeDeadlineHandoffs.deadlineAt);
}

export async function handoffGermanyProgrammeDeadline(userId: number, programmeId: string, deadlineAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const programme = await db.select({ programmeId: germanyProgrammeIndex.programmeId, programmeEvidenceUrl: germanyProgrammeIndex.programmeEvidenceUrl }).from(savedGermanyProgrammes).innerJoin(germanyProgrammeIndex, eq(savedGermanyProgrammes.programmeId, germanyProgrammeIndex.programmeId)).where(and(eq(savedGermanyProgrammes.userId, userId), eq(savedGermanyProgrammes.programmeId, programmeId), isNull(savedGermanyProgrammes.archivedAt))).limit(1);
  if (!programme[0]) throw new Error("Only an active saved programme can be added to this student calendar");
  await db.insert(germanyProgrammeDeadlineHandoffs).values({ userId, programmeId, deadlineAt, officialEvidenceUrl: programme[0].programmeEvidenceUrl }).onConflictDoUpdate({ target: [germanyProgrammeDeadlineHandoffs.userId, germanyProgrammeDeadlineHandoffs.programmeId], set: { deadlineAt, officialEvidenceUrl: programme[0].programmeEvidenceUrl, reviewedAt: new Date() } });
  return listGermanyProgrammeDeadlineHandoffs(userId);
}

export async function removeGermanyProgrammeDeadlineHandoff(userId: number, programmeId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.delete(germanyProgrammeDeadlineHandoffs).where(and(eq(germanyProgrammeDeadlineHandoffs.userId, userId), eq(germanyProgrammeDeadlineHandoffs.programmeId, programmeId)));
  return { removed: true };
}

export async function addUniversity(userId: number, input: { university: string; location: string; program: string; sourceUrl?: string; scholarshipSourceUrl?: string; snapshotSummary?: string; imageUrl?: string; imageAttribution?: string; deadline?: string; tuition?: string; scholarshipInfo?: string; admissionRequirements?: string; eligibilityCriteria?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(savedUniversities).values({
    userId,
    ...input,
    deadline: input.deadline || null,
    tuition: input.tuition || null,
    scholarshipInfo: input.scholarshipInfo || null,
    admissionRequirements: input.admissionRequirements || null,
    eligibilityCriteria: input.eligibilityCriteria || null,
  });
  const result = await db.select().from(savedUniversities).where(and(eq(savedUniversities.userId, userId), eq(savedUniversities.university, input.university))).limit(1);
  if (result[0]) {
    await db.insert(applicationMilestones).values([
      { userId, universityId: result[0].id, title: "Explore the program", dueLabel: "A gentle first step" },
      { userId, universityId: result[0].id, title: "Collect your documents", dueLabel: "When you are ready" },
      { userId, universityId: result[0].id, title: "Review before you apply", dueLabel: input.deadline || "Before the deadline" },
    ]);
  }
  return result[0];
}

export async function listMilestones(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(applicationMilestones).where(eq(applicationMilestones.userId, userId));
}

export async function addMilestone(userId: number, input: { universityId: number; title: string; dueLabel?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(applicationMilestones).values({ userId, ...input, dueLabel: input.dueLabel || null });
}

export async function toggleMilestone(userId: number, milestoneId: number, completed: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(applicationMilestones).set({ completed }).where(and(eq(applicationMilestones.id, milestoneId), eq(applicationMilestones.userId, userId)));
}

export async function listReminders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(personalReminders).where(eq(personalReminders.userId, userId));
}

export async function addReminder(userId: number, input: { title: string; body?: string; dueLabel?: string; locale: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(personalReminders).values({ userId, ...input, body: input.body || null, dueLabel: input.dueLabel || null });
}

export async function toggleReminder(userId: number, reminderId: number, completed: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(personalReminders).set({ completed }).where(and(eq(personalReminders.id, reminderId), eq(personalReminders.userId, userId)));
}

export type ReminderPreferenceInput = {
  enabled: boolean;
  remindSevenDays: boolean;
  remindThreeDays: boolean;
  remindOneDay: boolean;
  preferredHourUtc: number;
};

const defaultReminderPreferences: ReminderPreferenceInput = {
  enabled: true,
  remindSevenDays: true,
  remindThreeDays: true,
  remindOneDay: true,
  preferredHourUtc: 8,
};

export async function getReminderPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(reminderPreferences).where(eq(reminderPreferences.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function saveReminderPreferences(userId: number, input: ReminderPreferenceInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(reminderPreferences).values({ userId, ...input }).onConflictDoUpdate({ target: reminderPreferences.userId, set: input });
  return getReminderPreferences(userId);
}

export async function ensureReminderPreferences(userId: number) {
  const existing = await getReminderPreferences(userId);
  if (existing) return existing;
  return saveReminderPreferences(userId, defaultReminderPreferences);
}

export async function setReminderScheduleTaskUid(userId: number, scheduleCronTaskUid: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await ensureReminderPreferences(userId);
  await db.update(reminderPreferences).set({ scheduleCronTaskUid }).where(eq(reminderPreferences.userId, userId));
  return getReminderPreferences(userId);
}

export async function getReminderPreferencesByScheduleTaskUid(scheduleCronTaskUid: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(reminderPreferences).where(eq(reminderPreferences.scheduleCronTaskUid, scheduleCronTaskUid)).limit(1);
  return result[0] ?? null;
}

export async function listDeadlineNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(deadlineNotifications).where(eq(deadlineNotifications.userId, userId)).orderBy(desc(deadlineNotifications.createdAt)).limit(24);
}

export async function markDeadlineNotificationRead(userId: number, notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(deadlineNotifications).set({ read: true }).where(and(eq(deadlineNotifications.id, notificationId), eq(deadlineNotifications.userId, userId)));
}

function parseUtcDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getDeadlineAlertKey(userId: number, universityId: number, deadline: string, daysBefore: number) {
  return `${userId}:${universityId}:${deadline}:${daysBefore}`;
}

export async function createDeadlineAlertsForPreferences(preferences: typeof reminderPreferences.$inferSelect, referenceDate = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [profile, universities] = await Promise.all([getStudentProfile(preferences.userId), listUniversities(preferences.userId)]);
  const reminders = [preferences.remindSevenDays ? 7 : null, preferences.remindThreeDays ? 3 : null, preferences.remindOneDay ? 1 : null].filter((value): value is number => value !== null);
  const referenceUtc = Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate());
  const locale = profile?.preferredLanguage === "ar" ? "ar" : "en";
  let created = 0;

  for (const university of universities) {
    const deadlineAt = parseUtcDate(university.deadline);
    if (!deadlineAt) continue;
    const daysBefore = Math.round((deadlineAt.getTime() - referenceUtc) / 86_400_000);
    if (!reminders.includes(daysBefore)) continue;
    const alertKey = getDeadlineAlertKey(preferences.userId, university.id, university.deadline ?? "", daysBefore);
    const title = locale === "ar" ? `${university.university} قربت` : `${university.university} is coming up`;
    const body = locale === "ar" ? `باقي ${daysBefore} ${daysBefore === 1 ? "يوم" : "أيام"} على آخر موعد. خُد دقيقة وراجع اللي جاهز.` : `${daysBefore} ${daysBefore === 1 ? "day" : "days"} until the deadline. Take a minute to review what is ready.`;
    await db.insert(deadlineNotifications).values({ userId: preferences.userId, universityId: university.id, alertKey, title, body, locale, deadlineAt, daysBefore }).onConflictDoUpdate({ target: deadlineNotifications.alertKey, set: { alertKey } });
    created += 1;
  }
  const followUpCreated = await createDueUniversityFollowUpNotifications(preferences.userId, locale, referenceDate);
  return { created: created + followUpCreated, deadlineCreated: created, followUpCreated, skipped: null };
}

export async function createDeadlineAlertsForSchedule(scheduleCronTaskUid: string, referenceDate = new Date()) {
  const preferences = await getReminderPreferencesByScheduleTaskUid(scheduleCronTaskUid);
  if (!preferences || !preferences.enabled) return { created: 0, skipped: "disabled-or-orphan" as const };
  return createDeadlineAlertsForPreferences(preferences, referenceDate);
}

export async function createDueUniversityFollowUpNotifications(userId: number, locale: "en" | "ar", referenceDate = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return deliverDueUniversityFollowUps({ userId, locale }, {
    listDuePlans: () => db.select({ id: universityFollowUpPlans.id, university: savedUniversities.university, reason: universityFollowUpPlans.reason }).from(universityFollowUpPlans).innerJoin(savedUniversities, eq(universityFollowUpPlans.universityId, savedUniversities.id)).where(and(eq(universityFollowUpPlans.userId, userId), eq(universityFollowUpPlans.status, "planned"), lte(universityFollowUpPlans.dueAt, referenceDate))),
    deliverNotification: (notification) => db.insert(universityFollowUpNotifications).values(notification).onConflictDoUpdate({ target: universityFollowUpNotifications.alertKey, set: { alertKey: notification.alertKey } }),
    promotePlan: (planId) => db.update(universityFollowUpPlans).set({ status: "draft_ready" }).where(eq(universityFollowUpPlans.id, planId)),
  });
}

export async function listUniversityFollowUpNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: universityFollowUpNotifications.id, followUpPlanId: universityFollowUpNotifications.followUpPlanId, title: universityFollowUpNotifications.title, body: universityFollowUpNotifications.body, locale: universityFollowUpNotifications.locale, read: universityFollowUpNotifications.read, createdAt: universityFollowUpNotifications.createdAt, university: savedUniversities.university, reason: universityFollowUpPlans.reason }).from(universityFollowUpNotifications).innerJoin(universityFollowUpPlans, eq(universityFollowUpNotifications.followUpPlanId, universityFollowUpPlans.id)).innerJoin(savedUniversities, eq(universityFollowUpPlans.universityId, savedUniversities.id)).where(eq(universityFollowUpNotifications.userId, userId)).orderBy(desc(universityFollowUpNotifications.createdAt)).limit(12);
}

export async function markUniversityFollowUpNotificationRead(userId: number, notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(universityFollowUpNotifications).set({ read: true }).where(and(eq(universityFollowUpNotifications.id, notificationId), eq(universityFollowUpNotifications.userId, userId)));
}

export async function createFamilyInvite(userId: number, input: { email: string; relationship: string; token: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(familyInvites).values({ userId, ...input });
  const result = await db.select().from(familyInvites).where(eq(familyInvites.token, input.token)).limit(1);
  return result[0];
}

export async function listFamilyInvites(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(familyInvites).where(eq(familyInvites.userId, userId));
}

export async function getFamilyView(token: string) {
  const db = await getDb();
  if (!db) return null;
  const invite = await db.select().from(familyInvites).where(eq(familyInvites.token, token)).limit(1);
  if (!invite[0]) return null;
  const userId = invite[0].userId;
  const [profile, universities, milestones, reminders] = await Promise.all([getStudentProfile(userId), listUniversities(userId), listMilestones(userId), listReminders(userId)]);
  return { invite: invite[0], profile, universities, milestones, reminders };
}

export async function listStudentDocuments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(studentDocuments).where(eq(studentDocuments.userId, userId));
}

export async function listStudentDocumentRequirementLinks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(studentDocumentRequirementLinks).where(eq(studentDocumentRequirementLinks.userId, userId)).orderBy(desc(studentDocumentRequirementLinks.createdAt));
}

export async function confirmStudentDocumentRequirementLink(userId: number, input: { documentId: number; programmeId: string; requirementKey: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const [document, programme] = await Promise.all([
    getStudentDocument(userId, input.documentId),
    db.select({ id: savedGermanyProgrammes.id }).from(savedGermanyProgrammes).where(and(eq(savedGermanyProgrammes.userId, userId), eq(savedGermanyProgrammes.programmeId, input.programmeId), isNull(savedGermanyProgrammes.archivedAt))).limit(1),
  ]);
  if (!document) throw new Error("This private document is no longer available.");
  if (!programme[0]) throw new Error("Save this Germany programme before linking a private document.");
  await db.insert(studentDocumentRequirementLinks).values({ userId, ...input }).onConflictDoNothing();
  const result = await db.select().from(studentDocumentRequirementLinks).where(and(eq(studentDocumentRequirementLinks.userId, userId), eq(studentDocumentRequirementLinks.documentId, input.documentId), eq(studentDocumentRequirementLinks.programmeId, input.programmeId), eq(studentDocumentRequirementLinks.requirementKey, input.requirementKey))).limit(1);
  return result[0] ?? null;
}

export async function removeStudentDocumentRequirementLink(userId: number, linkId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.delete(studentDocumentRequirementLinks).where(and(eq(studentDocumentRequirementLinks.id, linkId), eq(studentDocumentRequirementLinks.userId, userId)));
  return { removed: true } as const;
}

export async function getStudentDocument(userId: number, documentId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(studentDocuments).where(and(eq(studentDocuments.userId, userId), eq(studentDocuments.id, documentId))).limit(1);
  return result[0] ?? null;
}

export type TranscriptExtraction = {
  academicAverage: string | null;
  gradeScale: string | null;
  academicSummary: string | null;
  courses: Array<{ name: string; grade: string | null }>;
  confidenceNote: string;
};

export async function saveTranscriptExtraction(userId: number, documentId: number, extraction: TranscriptExtraction) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(studentDocuments).set({ extractionStatus: "complete", extractedGrades: JSON.stringify(extraction), extractedAt: new Date() }).where(and(eq(studentDocuments.id, documentId), eq(studentDocuments.userId, userId)));
  await db.update(studentProfiles).set({ academicAverage: extraction.academicAverage, gradeScale: extraction.gradeScale, academicSummary: extraction.academicSummary }).where(eq(studentProfiles.userId, userId));
  return getStudentDocument(userId, documentId);
}

export async function setTranscriptExtractionProcessing(userId: number, documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(studentDocuments).set({ extractionStatus: "processing" }).where(and(eq(studentDocuments.id, documentId), eq(studentDocuments.userId, userId)));
}

export async function setTranscriptExtractionFailed(userId: number, documentId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(studentDocuments).set({ extractionStatus: "needs_review" }).where(and(eq(studentDocuments.id, documentId), eq(studentDocuments.userId, userId)));
}

export async function uploadStudentTranscript(userId: number, input: { fileName: string; mimeType: string; dataBase64: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180) || "transcript.pdf";
  const bytes = Buffer.from(input.dataBase64, "base64");
  const { key, url } = await storagePut(`students/${userId}/transcripts/${safeName}`, bytes, input.mimeType);
  await db.insert(studentDocuments).values({ userId, fileName: input.fileName, mimeType: input.mimeType, storageKey: key, fileUrl: url });
  const result = await db.select().from(studentDocuments).where(and(eq(studentDocuments.userId, userId), eq(studentDocuments.storageKey, key))).limit(1);
  return result[0];
}

export type AdminIntakeProposedProfile = {
  preferredName: string | null;
  contactEmail: string | null;
  phoneNumber: string | null;
  nationality: string | null;
  highSchoolDiplomaOrigin: string | null;
  studyDirection: string | null;
  academicAverage: string | null;
  gradeScale: string | null;
  qualifications: string | null;
  sourceSummary: string | null;
};

export async function createAdminIntakeUpload(adminUserId: number, input: { sourceKind: "cv" | "spreadsheet"; fileName: string; mimeType: string; dataBase64: string; contentHash: string; extractedText: string; sourceRowCount: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const existing = await db.select().from(adminIntakeUploads).where(eq(adminIntakeUploads.contentHash, input.contentHash)).limit(1);
  if (existing[0]) return { upload: existing[0], duplicate: true };
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180) || "admin-intake";
  const bytes = Buffer.from(input.dataBase64, "base64");
  const { key, url } = await storagePut(`admin-intake/${adminUserId}/${input.contentHash.slice(0, 16)}-${safeName}`, bytes, input.mimeType);
  await db.insert(adminIntakeUploads).values({ uploadedByUserId: adminUserId, sourceKind: input.sourceKind, fileName: input.fileName, mimeType: input.mimeType, byteSize: bytes.byteLength, contentHash: input.contentHash, storageKey: key, fileUrl: url, status: "extracting", extractedText: input.extractedText, sourceRowCount: input.sourceRowCount });
  const uploads = await db.select().from(adminIntakeUploads).where(eq(adminIntakeUploads.contentHash, input.contentHash)).limit(1);
  return { upload: uploads[0]!, duplicate: false };
}

export async function saveAdminIntakeDrafts(_adminUserId: number, uploadId: number, drafts: Array<{ sourceRowNumber: number; sourceDigest: string; proposedProfile: AdminIntakeProposedProfile; extractionConfidence: "low" | "medium" | "high" }>) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  for (const draft of drafts) {
    await db.insert(adminIntakeRecords).values({ uploadId, sourceRowNumber: draft.sourceRowNumber, sourceDigest: draft.sourceDigest, proposedProfileJson: JSON.stringify(draft.proposedProfile), extractionConfidence: draft.extractionConfidence }).onConflictDoUpdate({ target: [adminIntakeRecords.uploadId, adminIntakeRecords.sourceRowNumber], set: { proposedProfileJson: JSON.stringify(draft.proposedProfile), extractionConfidence: draft.extractionConfidence, reviewStatus: "pending_review", reviewerUserId: null, reviewNote: null, reviewedAt: null, committedAt: null } });
  }
  await db.update(adminIntakeUploads).set({ status: "ready_for_review", aiInvocationCount: 1, extractionNote: "Structured drafts prepared. An administrator must review each row before it is committed." }).where(eq(adminIntakeUploads.id, uploadId));
  return listAdminIntakeRecords(uploadId);
}

export async function setAdminIntakeUploadFailed(uploadId: number, reason: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(adminIntakeUploads).set({ status: "failed", failureReason: reason.slice(0, 1600) }).where(eq(adminIntakeUploads.id, uploadId));
}

export async function listAdminIntakeUploads() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(adminIntakeUploads).orderBy(desc(adminIntakeUploads.createdAt)).limit(60);
}

export async function listAdminIntakeRecords(uploadId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(adminIntakeRecords).where(eq(adminIntakeRecords.uploadId, uploadId)).orderBy(adminIntakeRecords.sourceRowNumber);
}

export async function reviewAdminIntakeRecord(adminUserId: number, input: { recordId: number; status: "approved" | "rejected"; reviewNote?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(adminIntakeRecords).set({ reviewStatus: input.status, reviewerUserId: adminUserId, reviewNote: input.reviewNote?.trim() || null, reviewedAt: new Date() }).where(eq(adminIntakeRecords.id, input.recordId));
  const record = await db.select().from(adminIntakeRecords).where(eq(adminIntakeRecords.id, input.recordId)).limit(1);
  return record[0] ?? null;
}

export async function commitAdminIntakeRecord(adminUserId: number, recordId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const records = await db.select().from(adminIntakeRecords).where(eq(adminIntakeRecords.id, recordId)).limit(1);
  const record = records[0];
  if (!record || record.reviewStatus !== "approved") throw new Error("Review and approve this intake draft before committing it.");
  const profile = JSON.parse(record.proposedProfileJson) as AdminIntakeProposedProfile;
  await db.insert(prospectiveStudents).values({ sourceRecordId: record.id, preferredName: profile.preferredName, contactEmail: profile.contactEmail, phoneNumber: profile.phoneNumber, nationality: profile.nationality, highSchoolDiplomaOrigin: profile.highSchoolDiplomaOrigin, studyDirection: profile.studyDirection, academicAverage: profile.academicAverage, gradeScale: profile.gradeScale, qualifications: profile.qualifications, sourceSummary: profile.sourceSummary, createdByUserId: adminUserId });
  const prospect = await db.select().from(prospectiveStudents).where(eq(prospectiveStudents.sourceRecordId, record.id)).limit(1);
  await db.update(adminIntakeRecords).set({ reviewStatus: "committed", prospectiveStudentId: prospect[0]?.id ?? null, committedAt: new Date() }).where(eq(adminIntakeRecords.id, record.id));
  return prospect[0] ?? null;
}

// --- Email ownership codes (#163) ---

export async function insertEmailVerification(record: { email: string; purpose: string; codeHash: string; attempts: number; consumedAt: Date | null; expiresAt: Date; createdAt: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(emailVerifications).values(record);
}

export async function getLatestEmailVerification(email: string, purpose: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const rows = await db.select().from(emailVerifications).where(and(eq(emailVerifications.email, email), eq(emailVerifications.purpose, purpose))).orderBy(desc(emailVerifications.createdAt)).limit(1);
  return rows[0] ?? null;
}

export async function countEmailVerificationsSince(email: string, purpose: string, since: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const rows = await db.select({ id: emailVerifications.id }).from(emailVerifications).where(and(eq(emailVerifications.email, email), eq(emailVerifications.purpose, purpose), gte(emailVerifications.createdAt, since)));
  return rows.length;
}

export async function markEmailVerificationConsumed(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(emailVerifications).set({ consumedAt: new Date() }).where(eq(emailVerifications.id, id));
}

export async function saveEmailVerificationAttempts(id: number, attempts: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(emailVerifications).set({ attempts }).where(eq(emailVerifications.id, id));
}
