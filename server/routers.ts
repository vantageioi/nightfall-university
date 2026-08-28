import { COOKIE_NAME } from "@shared/const";
import { nanoid } from "nanoid";
import { z } from "zod";
import { geminiApiKeySchema } from "@shared/geminiKey";
import { isGmailConfigured } from "./gmailConnection";
import { documentRequirementKeys } from "@shared/documentRequirements";
import { isExploringStudyDirections, isMeaningfulStudyDirection } from "@shared/studyDirection";
import { addMilestone, addReminder, addUniversity, acceptLegalVersion, addWaitlistEntry, approveUniversityCommunication, archiveGermanyProgramme, archiveItalyProgramme, bumpUserTokenVersion, clearGeminiApiKey, completeUniversityFollowUpPlan, confirmStudentDocumentRequirementLink, consumeStudentConsultation, createFamilyInvite, createUniversityCommunicationDraft, createUniversityFollowUpPlan, disconnectStudentGmail, ensureReminderPreferences, getFamilyView, getStudentConsultationCycle, getStudentFitProfile, getStudentProfile, getWorkspaceProfile, handoffGermanyProgrammeDeadline, listApplicationEvents, listDeadlineNotifications, listFamilyInvites, listGermanyProgrammeCandidatesForFit, listGermanyProgrammeDeadlineHandoffs, listItalyProgrammeCandidatesForFit, listMilestones, listReminders, listSavedGermanyProgrammes, listSavedItalyProgrammes, listStudentDocumentRequirementLinks, listStudentDocuments, listUniversities, listUniversityFollowUpNotifications, listUniversityRelationshipWorkspace, markDeadlineNotificationRead, markUniversityFollowUpNotificationRead, removeGermanyProgramme, removeGermanyProgrammeDeadlineHandoff, removeItalyProgramme, removeStudentDocumentRequirementLink, saveGermanyProgramme, saveGermanyProgrammeDecisionNotes, saveItalyProgramme, saveItalyProgrammeDecisionNotes, saveLastViewedComparisonUniversity, saveStudentFitProfile, saveStudentProfile, saveUniversityContact, saveWorkspaceProfile, searchGermanyProgrammeIndex, searchItalyProgrammeIndex, setGermanyProgrammePin, setGermanyProgrammePriority, setItalyProgrammePin, setItalyProgrammePriority, startGermanyProgrammePreparation, toggleMilestone, toggleReminder, updateUniversityCommunicationDraft, uploadStudentTranscript } from "./db";
import { commitAdminIntakeRecord, createAdminIntakeUpload, listAdminIntakeRecords, listAdminIntakeUploads, reviewAdminIntakeRecord, saveAdminIntakeDrafts, setAdminIntakeUploadFailed } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { essayDraftInputSchema } from "./essayDraftingAI";
import { consultingMessageSchema } from "./consultingGuidance";
import { rankProgrammeMatches, topDecisionRoomMatches } from "./programmeMatching";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { buildSourceDigest, classifyAdminIntakeFile, extractAdminIntakeSource, sha256 } from "./adminIntake";
import { extractAdminIntakeDrafts } from "./adminIntakeAI";
import { runStudentConsultation } from "./domain/consultingService";
import { prepareEssayDraft } from "./domain/essayDraftingService";
import { generateProgrammeBriefing, listParsedBriefings } from "./domain/programmeBriefingService";
import { generateAiFollowUpDraft, sendApprovedUniversityCommunication as deliverApprovedUniversityCommunication, syncUniversityRepliesFromInbox, triagePastedUniversityReply } from "./domain/universityCommunicationService";
import { syncRequirementWatch, updateReminderPreferencesWithSchedule, updateUniversityWatchPreferencesWithSchedule } from "./domain/schedulingService";
import { extractTranscriptSnapshot } from "./domain/transcriptService";
import { PLAN_LIMITS, normalizePlan } from "./domain/planLimits";
import { deleteStudentAccount, exportStudentData, getStudentGeminiApiKey, saveGeminiApiKey } from "./db";
import { isStorageConfigured } from "./storage";
import { getLlmAvailability } from "./integrations/llm";
import { ensureUniversityWatchPreferences, listUniversityRequirementAlerts, listUniversityRequirementWatches, listUniversityWatchSourceCaches, markUniversityRequirementAlertRead } from "./universityWatch";

export const waitlistInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  destination: z.string().trim().min(2).max(200),
  journeyStage: z.string().trim().min(1).max(32).default("Instagram early list"),
  graduationYear: z.string().trim().min(2).max(120),
  note: z.string().trim().max(1000).optional(),
});

const workspaceInput = z.object({
  organization: z.string().trim().min(2).max(200),
  teamSize: z.string().trim().min(1).max(32),
  activeRegions: z.string().trim().min(2).max(255),
  applicantVolume: z.string().trim().min(1).max(32),
});

// The first consultation deliberately collects only path-changing context.
// Phone details and precise qualification provenance can be completed later
// from the private journey instead of blocking useful first research.
export const studentProfileInput = z.object({ preferredName: z.string().trim().min(2).max(120), contactEmail: z.string().trim().email().max(320), phoneNumber: z.string().trim().max(80), destination: z.string().trim().min(2).max(200), graduationYear: z.string().trim().min(2).max(32), highSchoolDiplomaOrigin: z.string().trim().max(200), preferredLanguage: z.enum(["en", "ar"]) });
export const universityInput = z.object({ university: z.string().trim().min(2).max(200), location: z.string().trim().min(2).max(200), program: z.string().trim().min(2).max(200), sourceUrl: z.string().url().max(600).optional(), scholarshipSourceUrl: z.string().url().max(600).optional(), snapshotSummary: z.string().trim().max(1600).optional(), imageUrl: z.string().trim().max(600).optional(), imageAttribution: z.string().trim().max(240).optional(), deadline: z.string().trim().max(80).optional(), tuition: z.string().trim().max(160).optional(), scholarshipInfo: z.string().trim().max(4000).optional(), admissionRequirements: z.string().trim().max(4000).optional(), eligibilityCriteria: z.string().trim().max(4000).optional() });
const milestoneInput = z.object({ universityId: z.number().int().positive(), title: z.string().trim().min(2).max(200), dueLabel: z.string().trim().max(100).optional() });
const reminderInput = z.object({ title: z.string().trim().min(2).max(200), body: z.string().trim().max(1000).optional(), dueLabel: z.string().trim().max(100).optional(), locale: z.enum(["en", "ar"]) });
export const familyInput = z.object({ email: z.string().trim().email().max(320), relationship: z.string().trim().min(2).max(80) });
export const transcriptInput = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  dataBase64: z.string().min(16).max(28_000_000),
});
export const documentRequirementLinkInput = z.object({ documentId: z.number().int().positive(), programmeId: z.string().trim().min(1).max(80), requirementKey: z.enum(documentRequirementKeys) });
export const lastViewedComparisonInput = z.object({ universityId: z.number().int().positive() });
export const germanyProgrammeSearchInput = z.object({ query: z.string().trim().max(160).optional(), category: z.string().trim().max(160).optional(), language: z.string().trim().max(120).optional(), limit: z.number().int().min(1).max(40).default(20) });
export const germanyProgrammeSaveInput = z.object({ programmeId: z.string().trim().min(1).max(80) });
export const germanyProgrammePinInput = germanyProgrammeSaveInput.extend({ isPinned: z.boolean() });
export const germanyProgrammePriorityInput = germanyProgrammeSaveInput.extend({ priorityRank: z.number().int().min(1).max(12).nullable() });
export const germanyProgrammeArchiveInput = germanyProgrammeSaveInput.extend({ archived: z.boolean() });
export const germanyProgrammeDeadlineHandoffInput = germanyProgrammeSaveInput.extend({ deadlineAt: z.number().int().positive() });
export const germanyProgrammeDecisionNotesInput = germanyProgrammeSaveInput.extend({ decisionNotes: z.string().trim().max(3000) });
export const germanyProgrammeBriefingInput = germanyProgrammeSaveInput.extend({ language: z.enum(["en", "ar"]) });

// Italy mirrors Germany's save/pin/priority/archive/decision-notes surface.
// Deliberately no deadline-handoff or briefing input yet — those are
// separate features not requested for the ingestion pass.
export const italyProgrammeSearchInput = z.object({ query: z.string().trim().max(160).optional(), region: z.string().trim().max(160).optional(), language: z.string().trim().max(120).optional(), publicOnly: z.boolean().optional(), limit: z.number().int().min(1).max(40).default(20) });
export const italyProgrammeSaveInput = z.object({ programmeId: z.string().trim().min(1).max(80) });
export const italyProgrammePinInput = italyProgrammeSaveInput.extend({ isPinned: z.boolean() });
export const italyProgrammePriorityInput = italyProgrammeSaveInput.extend({ priorityRank: z.number().int().min(1).max(12).nullable() });
export const italyProgrammeArchiveInput = italyProgrammeSaveInput.extend({ archived: z.boolean() });
export const italyProgrammeDecisionNotesInput = italyProgrammeSaveInput.extend({ decisionNotes: z.string().trim().max(3000) });
export const applicationEventsInput = z.object({ programmeId: z.string().trim().max(80).optional(), limit: z.number().int().min(1).max(200).optional() });
export const reminderPreferenceInput = z.object({ enabled: z.boolean(), remindSevenDays: z.boolean(), remindThreeDays: z.boolean(), remindOneDay: z.boolean(), preferredHourUtc: z.number().int().min(0).max(23) });
export const universityWatchPreferenceInput = z.object({ enabled: z.boolean(), preferredHourUtc: z.number().int().min(0).max(23) });
export const universityWatchInput = z.object({ universityId: z.number().int().positive(), enabled: z.boolean(), sourceUrl: z.string().url().max(600).optional(), sourceLabel: z.string().trim().min(2).max(240).optional() });
const universityContactInput = z.object({ universityId: z.number().int().positive(), contactName: z.string().trim().max(160).optional(), contactRole: z.string().trim().max(160).optional(), email: z.string().trim().email().max(320), phone: z.string().trim().max(80).optional(), portalUrl: z.string().url().max(700).optional(), relationshipStage: z.enum(["cold", "warm", "active", "responded", "paused"]), contactPreference: z.enum(["email", "portal", "do_not_contact"]) });
const universityCommunicationDraftInput = z.object({ universityId: z.number().int().positive(), contactId: z.number().int().positive().optional(), subject: z.string().trim().min(2).max(998), body: z.string().trim().min(2).max(12000), category: z.enum(["general", "document_request", "interview", "decision", "next_step", "needs_review"]) });
const universityCommunicationUpdateInput = universityCommunicationDraftInput.omit({ universityId: true, contactId: true }).extend({ communicationId: z.number().int().positive() });
const universityFollowUpPlanInput = z.object({ universityId: z.number().int().positive(), contactId: z.number().int().positive().optional(), dueAt: z.number().int().positive(), reason: z.string().trim().min(2).max(240) });
const universityAiDraftInput = z.object({ universityId: z.number().int().positive(), contactId: z.number().int().positive().optional(), purpose: z.string().trim().min(2).max(600), language: z.enum(["en", "ar"]) });
const pastedUniversityReplyTriageInput = z.object({ language: z.enum(["en", "ar"]), subject: z.string().trim().max(998).optional(), body: z.string().trim().min(10).max(6000) });
export const consultingInput = z.object({ language: z.enum(["en", "ar"]), messages: z.array(consultingMessageSchema).min(1).max(10), focusedProgrammeId: z.string().trim().min(1).max(180).optional() });
export const studentFitProfileInput = z.object({ studyDirection: z.string().trim().min(2).max(240), studyLevel: z.string().trim().max(80).optional(), academicAverage: z.string().trim().max(80).optional(), gradeScale: z.string().trim().max(120).optional(), qualifications: z.string().trim().max(2400).optional(), nationality: z.string().trim().max(120).optional(), languageComfort: z.string().trim().max(320).optional(), tuitionBudgetBand: z.enum(["low", "medium", "flexible", "unsure"]).optional(), fundingRoute: z.enum(["self_funded", "sponsor", "scholarship", "mixed", "unsure"]).optional(), hasSponsor: z.boolean(), priorities: z.string().trim().max(2400).optional(), consent: z.boolean() }).superRefine((value, context) => {
  if (!isMeaningfulStudyDirection(value.studyDirection)) context.addIssue({ code: "custom", path: ["studyDirection"], message: "Choose a recognised study direction or select that you are still exploring." });
});
const adminIntakeUploadInput = z.object({ fileName: z.string().trim().min(1).max(255), mimeType: z.string().trim().min(1).max(120), dataBase64: z.string().min(16).max(12_000_000) });

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: protectedProcedure.mutation(async ({ ctx }) => {
      // Server-side session revocation, not just a cookie delete: bump the
      // tokenVersion so this user's every issued JWT stops verifying.
      // Best-effort: the cookie is always cleared, and a revocation failure
      // is logged rather than blocking the sign-out.
      try {
        await bumpUserTokenVersion(ctx.user.id);
      } catch (error) {
        console.error("[Auth] Session revocation failed during logout:", error);
      }
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  waitlist: router({
    join: publicProcedure.input(waitlistInput).mutation(async ({ input }) => addWaitlistEntry(input)),
  }),
  adminIntake: router({
    uploads: adminProcedure.query(() => listAdminIntakeUploads()),
    records: adminProcedure.input(z.object({ uploadId: z.number().int().positive() })).query(({ input }) => listAdminIntakeRecords(input.uploadId)),
    ingest: adminProcedure.input(adminIntakeUploadInput).mutation(async ({ ctx, input }) => {
      const bytes = Buffer.from(input.dataBase64, "base64");
      const sourceKind = classifyAdminIntakeFile(input.fileName, input.mimeType);
      if (!sourceKind) throw new Error("Use a PDF, DOCX, TXT, or XLSX file for admin intake.");
      const source = await extractAdminIntakeSource({ fileName: input.fileName, mimeType: input.mimeType, bytes, sourceKind });
      const contentHash = sha256(bytes);
      const created = await createAdminIntakeUpload(ctx.user.id, { sourceKind, fileName: input.fileName, mimeType: input.mimeType, dataBase64: input.dataBase64, contentHash, extractedText: source.extractedText, sourceRowCount: source.rows.length });
      if (created.duplicate) return { upload: created.upload, duplicate: true, records: await listAdminIntakeRecords(created.upload.id) };
      try {
        const drafts = await extractAdminIntakeDrafts(source.rows);
        const records = await saveAdminIntakeDrafts(ctx.user.id, created.upload.id, drafts.map((draft) => ({ ...draft, sourceDigest: buildSourceDigest(contentHash, draft.sourceRowNumber, source.rows.find((row) => row.sourceRowNumber === draft.sourceRowNumber)?.sourceText ?? "") })));
        return { upload: created.upload, duplicate: false, records };
      } catch (error) {
        await setAdminIntakeUploadFailed(created.upload.id, error instanceof Error ? error.message : "Structured extraction failed.");
        throw error;
      }
    }),
    review: adminProcedure.input(z.object({ recordId: z.number().int().positive(), status: z.enum(["approved", "rejected"]), reviewNote: z.string().trim().max(1600).optional() })).mutation(({ ctx, input }) => reviewAdminIntakeRecord(ctx.user.id, input)),
    commit: adminProcedure.input(z.object({ recordId: z.number().int().positive() })).mutation(({ ctx, input }) => commitAdminIntakeRecord(ctx.user.id, input.recordId)),
  }),
  workspace: router({
    get: protectedProcedure.query(async ({ ctx }) => getWorkspaceProfile(ctx.user.id)),
    completeOnboarding: protectedProcedure.input(workspaceInput).mutation(async ({ ctx, input }) => saveWorkspaceProfile(ctx.user.id, input)),
  }),
  student: router({
    profile: protectedProcedure.query(({ ctx }) => getStudentProfile(ctx.user.id)),
    acceptLegal: protectedProcedure.input(z.object({ version: z.string().trim().min(4).max(16) })).mutation(({ ctx, input }) => acceptLegalVersion(ctx.user.id, input.version)),
    // Settings → Connections: BYO Gemini. The key is sealed under the user's
    // DEK and is never returned to any client after save — only a boolean.
    saveGeminiApiKey: protectedProcedure.input(z.object({ apiKey: geminiApiKeySchema })).mutation(({ ctx, input }) => saveGeminiApiKey(ctx.user.id, input.apiKey)),
    clearGeminiApiKey: protectedProcedure.mutation(({ ctx }) => clearGeminiApiKey(ctx.user.id)),
    geminiKeyStatus: protectedProcedure.query(async ({ ctx }) => ({ hasKey: Boolean(await getStudentGeminiApiKey(ctx.user.id)) })),
    llmAvailability: protectedProcedure.query(({ ctx }) => getLlmAvailability(ctx.user.id)),
    planUsage: protectedProcedure.query(({ ctx }) => {
      const plan = normalizePlan(String((ctx.user as { plan?: string }).plan ?? "free"));
      return { plan, limits: PLAN_LIMITS[plan], googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID), geminiPlatformConfigured: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) };
    }),
    // Settings → Privacy & data: full erasure. Hard-deletes every personal
    // row, crypto-shreds the user's DEK (backups become unreadable), then
    // revokes all sessions and clears the cookie in one irreversible action.
    deleteAccount: protectedProcedure.input(z.object({ confirmText: z.literal("DELETE MY ACCOUNT") })).mutation(async ({ ctx, input }) => {
      if (input.confirmText !== "DELETE MY ACCOUNT") throw new Error("Type DELETE MY ACCOUNT to confirm.");
      try {
        await deleteStudentAccount(ctx.user.id);
      } catch (error) {
        console.error("[Auth] Account deletion error:", error);
        throw new Error("Deletion failed partway. Contact support — do not re-register with this email.");
      }
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { deleted: true };
    }),
    // GDPR data portability: everything we hold, as downloadable JSON.
    exportData: protectedProcedure.query(({ ctx }) => exportStudentData(ctx.user.id)),
    completeOnboarding: protectedProcedure.input(studentProfileInput).mutation(({ ctx, input }) => saveStudentProfile(ctx.user.id, input)),
    consultationCycle: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getStudentProfile(ctx.user.id);
      return getStudentConsultationCycle(ctx.user.id, profile?.graduationYear || "current");
    }),
    beginConsultation: protectedProcedure.mutation(async ({ ctx }) => {
      const profile = await getStudentProfile(ctx.user.id);
      if (!profile?.onboardingComplete) throw new Error("Complete your private introduction before opening a consultation.");
      return consumeStudentConsultation(ctx.user.id, profile.graduationYear || "current");
    }),
    universities: protectedProcedure.query(({ ctx }) => listUniversities(ctx.user.id)),
    fitProfile: protectedProcedure.query(({ ctx }) => getStudentFitProfile(ctx.user.id)),
    saveFitProfile: protectedProcedure.input(studentFitProfileInput).mutation(({ ctx, input }) => saveStudentFitProfile(ctx.user.id, input)),
    germanyProgrammeMatches: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getStudentFitProfile(ctx.user.id);
      if (!profile?.matchingConsentAt) return { needsProfile: true, matches: [], decisionRoom: { matches: [], isPartial: true, consideredCount: 0 } };
      const exploring = isExploringStudyDirections(profile.studyDirection);
      const candidates = await listGermanyProgrammeCandidatesForFit({ studyDirection: exploring ? "" : profile.studyDirection, limit: 240 });
      const ranked = rankProgrammeMatches({ ...profile, studyDirection: exploring ? "" : profile.studyDirection }, candidates);
      // decisionRoom is the honest first-result surface (Phase 3): at most 3
      // credible matches, with isPartial telling the UI when there were not
      // enough credible options to fill three, rather than the client silently
      // slicing a much larger uncapped list.
      return { needsProfile: false, exploring, matches: ranked.slice(0, 18), decisionRoom: topDecisionRoomMatches(ranked) };
    }),
    italyProgrammeMatches: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getStudentFitProfile(ctx.user.id);
      if (!profile?.matchingConsentAt) return { needsProfile: true, matches: [], decisionRoom: { matches: [], isPartial: true, consideredCount: 0 } };
      const exploring = isExploringStudyDirections(profile.studyDirection);
      const rows = await listItalyProgrammeCandidatesForFit({ studyDirection: exploring ? "" : profile.studyDirection, limit: 240 });
      // Adapts italyProgrammeIndex's richer, differently-named columns onto the
      // provider-neutral ProgrammeResearchRecord shape the matching engine
      // already expects (see programmeMatching.ts). feeRiskCategory is
      // deliberately always null here — Italy's source data has no
      // per-programme fee field (feeBasis is a free-text "not collected"
      // note, not a comparable risk category) — which is exactly the
      // already-tested "no supplied fee context" verification-gap path, not
      // a special case that needed new matching logic.
      const candidates = rows.map((row) => ({
        programmeId: row.programmeId,
        programmeName: row.programmeNameDisplay,
        officialName: row.institutionName,
        city: row.city,
        broadSubjectCategories: [row.healthCategory, row.technologyEngineeringCategory].filter(Boolean).join(", ") || row.programmeNameDisplay,
        fieldMatchBasis: row.degreeClassCode,
        programmeLanguage: row.programmeLanguage,
        feeRiskCategory: null,
        programmeEvidenceUrl: row.universitalyReferenceUrl,
        officialProgrammeUrl: row.officialProgrammeUrl,
      }));
      const ranked = rankProgrammeMatches({ ...profile, studyDirection: exploring ? "" : profile.studyDirection }, candidates);
      return { needsProfile: false, exploring, matches: ranked.slice(0, 18), decisionRoom: topDecisionRoomMatches(ranked) };
    }),
    consult: protectedProcedure.input(consultingInput).mutation(({ ctx, input }) => runStudentConsultation(ctx.user.id, input)),
    addUniversity: protectedProcedure.input(universityInput).mutation(({ ctx, input }) => addUniversity(ctx.user.id, input)),
    germanyProgrammeIndex: protectedProcedure.input(germanyProgrammeSearchInput).query(({ input }) => searchGermanyProgrammeIndex(input)),
    savedGermanyProgrammes: protectedProcedure.query(({ ctx }) => listSavedGermanyProgrammes(ctx.user.id)),
    archivedGermanyProgrammes: protectedProcedure.query(({ ctx }) => listSavedGermanyProgrammes(ctx.user.id, true)),
    saveGermanyProgramme: protectedProcedure.input(germanyProgrammeSaveInput).mutation(({ ctx, input }) => saveGermanyProgramme(ctx.user.id, input.programmeId)),
    startGermanyProgrammePreparation: protectedProcedure.input(germanyProgrammeSaveInput).mutation(({ ctx, input }) => startGermanyProgrammePreparation(ctx.user.id, input.programmeId)),
    pinGermanyProgramme: protectedProcedure.input(germanyProgrammePinInput).mutation(({ ctx, input }) => setGermanyProgrammePin(ctx.user.id, input.programmeId, input.isPinned)),
    setGermanyProgrammePriority: protectedProcedure.input(germanyProgrammePriorityInput).mutation(({ ctx, input }) => setGermanyProgrammePriority(ctx.user.id, input.programmeId, input.priorityRank)),
    archiveGermanyProgramme: protectedProcedure.input(germanyProgrammeArchiveInput).mutation(({ ctx, input }) => archiveGermanyProgramme(ctx.user.id, input.programmeId, input.archived)),
    removeGermanyProgramme: protectedProcedure.input(germanyProgrammeSaveInput).mutation(({ ctx, input }) => removeGermanyProgramme(ctx.user.id, input.programmeId)),
    germanyProgrammeDeadlineHandoffs: protectedProcedure.query(({ ctx }) => listGermanyProgrammeDeadlineHandoffs(ctx.user.id)),
    handoffGermanyProgrammeDeadline: protectedProcedure.input(germanyProgrammeDeadlineHandoffInput).mutation(({ ctx, input }) => handoffGermanyProgrammeDeadline(ctx.user.id, input.programmeId, new Date(input.deadlineAt))),
    removeGermanyProgrammeDeadlineHandoff: protectedProcedure.input(germanyProgrammeSaveInput).mutation(({ ctx, input }) => removeGermanyProgrammeDeadlineHandoff(ctx.user.id, input.programmeId)),
    saveGermanyProgrammeDecisionNotes: protectedProcedure.input(germanyProgrammeDecisionNotesInput).mutation(({ ctx, input }) => saveGermanyProgrammeDecisionNotes(ctx.user.id, input.programmeId, input.decisionNotes)),
    // Italy mirrors Germany's save/pin/priority/archive/decision-notes surface.
    // No deadline-handoff or briefing procedures yet — separate features not
    // requested for this ingestion pass.
    italyProgrammeIndex: protectedProcedure.input(italyProgrammeSearchInput).query(({ input }) => searchItalyProgrammeIndex(input)),
    savedItalyProgrammes: protectedProcedure.query(({ ctx }) => listSavedItalyProgrammes(ctx.user.id)),
    archivedItalyProgrammes: protectedProcedure.query(({ ctx }) => listSavedItalyProgrammes(ctx.user.id, true)),
    saveItalyProgramme: protectedProcedure.input(italyProgrammeSaveInput).mutation(({ ctx, input }) => saveItalyProgramme(ctx.user.id, input.programmeId)),
    pinItalyProgramme: protectedProcedure.input(italyProgrammePinInput).mutation(({ ctx, input }) => setItalyProgrammePin(ctx.user.id, input.programmeId, input.isPinned)),
    setItalyProgrammePriority: protectedProcedure.input(italyProgrammePriorityInput).mutation(({ ctx, input }) => setItalyProgrammePriority(ctx.user.id, input.programmeId, input.priorityRank)),
    archiveItalyProgramme: protectedProcedure.input(italyProgrammeArchiveInput).mutation(({ ctx, input }) => archiveItalyProgramme(ctx.user.id, input.programmeId, input.archived)),
    removeItalyProgramme: protectedProcedure.input(italyProgrammeSaveInput).mutation(({ ctx, input }) => removeItalyProgramme(ctx.user.id, input.programmeId)),
    saveItalyProgrammeDecisionNotes: protectedProcedure.input(italyProgrammeDecisionNotesInput).mutation(({ ctx, input }) => saveItalyProgrammeDecisionNotes(ctx.user.id, input.programmeId, input.decisionNotes)),
    // The application-lifecycle event log (see applicationEvents in
    // drizzle/schema.ts). Read-only from the client — every write happens
    // as a side effect of the mutation it documents, never a direct write
    // the client can trigger itself, so the history stays trustworthy.
    applicationEvents: protectedProcedure.input(applicationEventsInput).query(({ ctx, input }) => listApplicationEvents(ctx.user.id, input)),
    germanyProgrammeBriefings: protectedProcedure.input(z.object({ language: z.enum(["en", "ar"]) })).query(({ ctx, input }) => listParsedBriefings(ctx.user.id, input.language)),
    generateGermanyProgrammeBriefing: protectedProcedure.input(germanyProgrammeBriefingInput).mutation(({ ctx, input }) => generateProgrammeBriefing(ctx.user.id, input)),
    saveLastViewedComparisonUniversity: protectedProcedure.input(lastViewedComparisonInput).mutation(({ ctx, input }) => saveLastViewedComparisonUniversity(ctx.user.id, input.universityId)),
    milestones: protectedProcedure.query(({ ctx }) => listMilestones(ctx.user.id)),
    addMilestone: protectedProcedure.input(milestoneInput).mutation(({ ctx, input }) => addMilestone(ctx.user.id, input)),
    toggleMilestone: protectedProcedure.input(z.object({ id: z.number().int().positive(), completed: z.boolean() })).mutation(({ ctx, input }) => toggleMilestone(ctx.user.id, input.id, input.completed)),
    reminders: protectedProcedure.query(({ ctx }) => listReminders(ctx.user.id)),
    addReminder: protectedProcedure.input(reminderInput).mutation(({ ctx, input }) => addReminder(ctx.user.id, input)),
    toggleReminder: protectedProcedure.input(z.object({ id: z.number().int().positive(), completed: z.boolean() })).mutation(({ ctx, input }) => toggleReminder(ctx.user.id, input.id, input.completed)),
    reminderPreferences: protectedProcedure.query(({ ctx }) => ensureReminderPreferences(ctx.user.id)),
    updateReminderPreferences: protectedProcedure.input(reminderPreferenceInput).mutation(({ ctx, input }) => updateReminderPreferencesWithSchedule(ctx.user.id, input)),
    deadlineNotifications: protectedProcedure.query(({ ctx }) => listDeadlineNotifications(ctx.user.id)),
    markDeadlineNotificationRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => markDeadlineNotificationRead(ctx.user.id, input.id)),
    universityFollowUpNotifications: protectedProcedure.query(({ ctx }) => listUniversityFollowUpNotifications(ctx.user.id)),
    markUniversityFollowUpNotificationRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => markUniversityFollowUpNotificationRead(ctx.user.id, input.id)),
    universityRequirementWatches: protectedProcedure.query(({ ctx }) => listUniversityRequirementWatches(ctx.user.id)),
    universityWatchSourceCaches: protectedProcedure.query(({ ctx }) => listUniversityWatchSourceCaches(ctx.user.id)),
    updateUniversityRequirementWatch: protectedProcedure.input(universityWatchInput).mutation(({ ctx, input }) => syncRequirementWatch(ctx.user.id, input)),
    universityWatchPreferences: protectedProcedure.query(({ ctx }) => ensureUniversityWatchPreferences(ctx.user.id)),
    updateUniversityWatchPreferences: protectedProcedure.input(universityWatchPreferenceInput).mutation(({ ctx, input }) => updateUniversityWatchPreferencesWithSchedule(ctx.user.id, input)),
    universityRequirementAlerts: protectedProcedure.query(({ ctx }) => listUniversityRequirementAlerts(ctx.user.id)),
    markUniversityRequirementAlertRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => markUniversityRequirementAlertRead(ctx.user.id, input.id)),
    universityRelationshipWorkspace: protectedProcedure.query(({ ctx }) => listUniversityRelationshipWorkspace(ctx.user.id)),
    gmailAvailability: protectedProcedure.query(() => ({ configured: isGmailConfigured() })),
    saveUniversityContact: protectedProcedure.input(universityContactInput).mutation(({ ctx, input }) => saveUniversityContact(ctx.user.id, input)),
    createUniversityCommunicationDraft: protectedProcedure.input(universityCommunicationDraftInput).mutation(({ ctx, input }) => createUniversityCommunicationDraft(ctx.user.id, input)),
    generateUniversityCommunicationDraft: protectedProcedure.input(universityAiDraftInput).mutation(({ ctx, input }) => generateAiFollowUpDraft(ctx.user.id, input)),
    triagePastedUniversityReply: protectedProcedure.input(pastedUniversityReplyTriageInput).mutation(({ ctx, input }) => triagePastedUniversityReply(ctx.user.id, input)),
    generateEssayDraft: protectedProcedure.input(essayDraftInputSchema).mutation(({ ctx, input }) => prepareEssayDraft(ctx.user.id, input)),
    updateUniversityCommunicationDraft: protectedProcedure.input(universityCommunicationUpdateInput).mutation(({ ctx, input }) => updateUniversityCommunicationDraft(ctx.user.id, input)),
    approveUniversityCommunication: protectedProcedure.input(z.object({ communicationId: z.number().int().positive() })).mutation(({ ctx, input }) => approveUniversityCommunication(ctx.user.id, input.communicationId)),
    sendApprovedUniversityCommunication: protectedProcedure.input(z.object({ communicationId: z.number().int().positive() })).mutation(({ ctx, input }) => deliverApprovedUniversityCommunication(ctx.user.id, input.communicationId)),
    syncUniversityGmailReplies: protectedProcedure.input(z.object({ language: z.enum(["en", "ar"]) })).mutation(({ ctx, input }) => syncUniversityRepliesFromInbox(ctx.user.id, input.language)),
    createUniversityFollowUpPlan: protectedProcedure.input(universityFollowUpPlanInput).mutation(({ ctx, input }) => createUniversityFollowUpPlan(ctx.user.id, { ...input, dueAt: new Date(input.dueAt) })),
    completeUniversityFollowUpPlan: protectedProcedure.input(z.object({ followUpPlanId: z.number().int().positive() })).mutation(({ ctx, input }) => completeUniversityFollowUpPlan(ctx.user.id, input.followUpPlanId)),
    disconnectStudentGmail: protectedProcedure.mutation(({ ctx }) => disconnectStudentGmail(ctx.user.id)),
    documents: protectedProcedure.query(({ ctx }) => listStudentDocuments(ctx.user.id)),
    documentStorageAvailability: protectedProcedure.query(() => ({ configured: isStorageConfigured() })),
    documentRequirementLinks: protectedProcedure.query(({ ctx }) => listStudentDocumentRequirementLinks(ctx.user.id)),
    confirmDocumentRequirementLink: protectedProcedure.input(documentRequirementLinkInput).mutation(({ ctx, input }) => confirmStudentDocumentRequirementLink(ctx.user.id, input)),
    removeDocumentRequirementLink: protectedProcedure.input(z.object({ linkId: z.number().int().positive() })).mutation(({ ctx, input }) => removeStudentDocumentRequirementLink(ctx.user.id, input.linkId)),
    uploadTranscript: protectedProcedure.input(transcriptInput).mutation(({ ctx, input }) => uploadStudentTranscript(ctx.user.id, input)),
    extractTranscript: protectedProcedure.input(z.object({ documentId: z.number().int().positive() })).mutation(({ ctx, input }) => extractTranscriptSnapshot(ctx.user.id, input.documentId)),
  }),
  family: router({
    list: protectedProcedure.query(({ ctx }) => listFamilyInvites(ctx.user.id)),
    invite: protectedProcedure.input(familyInput).mutation(({ ctx, input }) => createFamilyInvite(ctx.user.id, { ...input, token: nanoid(36) })),
    view: publicProcedure.input(z.object({ token: z.string().min(12).max(80) })).query(({ input }) => getFamilyView(input.token)),
  }),
});

export type AppRouter = typeof appRouter;
