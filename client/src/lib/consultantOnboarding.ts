import { isMeaningfulStudyDirection } from "@shared/studyDirection";

export type ConsultantFitDraft = {
  studyDirection: string;
  studyLevel: string;
  academicAverage: string;
  gradeScale: string;
  qualifications: string;
  nationality: string;
  languageComfort: string;
  tuitionBudgetBand: "low" | "medium" | "flexible" | "unsure";
  fundingRoute: "self_funded" | "sponsor" | "scholarship" | "mixed" | "unsure";
  hasSponsor: boolean;
  priorities: string;
  consent: boolean;
};

export type WarmInterviewDraft = {
  preferredName: string;
  contactEmail: string;
  studyDirection: string;
  motivation: string;
  studyLevel: string;
  tuitionBudgetBand: ConsultantFitDraft["tuitionBudgetBand"];
  fundingRoute: ConsultantFitDraft["fundingRoute"];
  hasSponsor: boolean;
  nationality: string;
  academicAverage: string;
  gradeScale: string;
  highSchoolDiplomaOrigin: string;
  languageComfort: string;
  priorities: string;
  phoneNumber: string;
  destinationPreference: string;
  consent: boolean;
};

export const emptyConsultantFitDraft: ConsultantFitDraft = { studyDirection: "", studyLevel: "", academicAverage: "", gradeScale: "", qualifications: "", nationality: "", languageComfort: "", tuitionBudgetBand: "unsure", fundingRoute: "unsure", hasSponsor: false, priorities: "", consent: false };

export const emptyWarmInterviewDraft: WarmInterviewDraft = { preferredName: "", contactEmail: "", studyDirection: "", motivation: "", studyLevel: "", tuitionBudgetBand: "unsure", fundingRoute: "unsure", hasSponsor: false, nationality: "", academicAverage: "", gradeScale: "", highSchoolDiplomaOrigin: "", languageComfort: "", priorities: "", phoneNumber: "", destinationPreference: "", consent: false };

export function canAdvanceWarmInterview(step: number, draft: WarmInterviewDraft) {
  if (step === 0) return draft.preferredName.trim().length >= 2;
  if (step === 1) return isMeaningfulStudyDirection(draft.studyDirection);
  if (step === 2) return draft.tuitionBudgetBand !== "unsure" && draft.nationality.trim().length >= 2 && draft.highSchoolDiplomaOrigin.trim().length >= 2;
  if (step === 3) return draft.academicAverage.trim().length >= 1 && draft.gradeScale.trim().length >= 1;
  if (step === 4) return draft.phoneNumber.trim().length >= 7 && draft.consent;
  return false;
}

export type ConsultantInputQuality = "empty" | "needs_clarification" | "usable";

export function consultantInputQuality(kind: "name" | "direction" | "context" | "grades" | "phone", value: string): ConsultantInputQuality {
  const compact = value.trim().replace(/\s+/g, " ");
  if (!compact) return "empty";
  if (kind === "direction") return isMeaningfulStudyDirection(compact) ? "usable" : "needs_clarification";
  if (kind === "phone") return /^[+()\d\s.-]{7,}$/.test(compact) ? "usable" : "needs_clarification";
  if (kind === "grades") return compact.length >= 1 && /[\d\p{L}]/u.test(compact) ? "usable" : "needs_clarification";
  const letters = (compact.match(/[\p{L}]/gu) ?? []).length;
  return letters >= 2 && !/(.)\1\1\1/i.test(compact) ? "usable" : "needs_clarification";
}

export function fitProfileFromInterview(draft: WarmInterviewDraft): ConsultantFitDraft {
  return { ...emptyConsultantFitDraft, studyDirection: draft.studyDirection.trim(), studyLevel: draft.studyLevel.trim(), academicAverage: draft.academicAverage.trim(), gradeScale: draft.gradeScale.trim(), nationality: draft.nationality.trim(), languageComfort: draft.languageComfort.trim(), tuitionBudgetBand: draft.tuitionBudgetBand, fundingRoute: draft.fundingRoute, hasSponsor: draft.hasSponsor, priorities: draft.priorities.trim(), consent: draft.consent };
}

/** Keeps priority order and student wording inspectable without a separate form. */
export function buildConsultationPriorities(input: { primary?: string; selected: string[]; custom?: string; motivation?: string }) {
  const selected = [...new Set(input.selected.map((item) => item.trim()).filter(Boolean))];
  return [
    input.primary?.trim() ? `Primary priority: ${input.primary.trim()}` : "",
    selected.length ? `Other priorities: ${selected.filter((item) => item !== input.primary?.trim()).join(", ") || "None specified"}` : "",
    input.custom?.trim() ? `Student wording: ${input.custom.trim()}` : "",
    input.motivation?.trim() ? `What draws them: ${input.motivation.trim()}` : "",
  ].filter(Boolean).join(". ");
}

export function canPersistConsultantFit(draft: ConsultantFitDraft) {
  return Boolean(draft.consent && isMeaningfulStudyDirection(draft.studyDirection));
}

// Phase 2 — the assessment summary must distinguish three kinds of information
// rather than recap answers flatly: (1) research signals that shape the first
// options, (2) preparation items that may need checking or action, and
// (3) things Nightfall explicitly cannot decide (admission, visa, funding
// outcomes). This keeps the summary honest about what it is and is not.
export type ConsultantSummaryGroups = { signals: string[]; preparation: string[]; cannotDecide: string[] };

export function consultantSummaryGroups(draft: WarmInterviewDraft, language: "en" | "ar"): ConsultantSummaryGroups {
  const isArabic = language === "ar";
  const signals: string[] = [
    draft.studyDirection ? (isArabic ? `الاتجاه: ${draft.studyDirection}` : `Direction: ${draft.studyDirection}`) : "",
    draft.studyLevel ? (isArabic ? `المستوى: ${draft.studyLevel}` : `Level: ${draft.studyLevel}`) : "",
    draft.languageComfort ? (isArabic ? `اللغة: ${draft.languageComfort}` : `Language comfort: ${draft.languageComfort}`) : "",
    draft.tuitionBudgetBand !== "unsure" ? (isArabic ? `وضع الرسوم: ${draft.tuitionBudgetBand}` : `Tuition posture: ${draft.tuitionBudgetBand}`) : "",
    draft.priorities ? (isArabic ? `الأولويات: ${draft.priorities}` : `Priorities: ${draft.priorities}`) : "",
  ].filter(Boolean);
  const preparation: string[] = [
    draft.academicAverage && draft.gradeScale
      ? (isArabic ? `تأكيد المعدل (${draft.academicAverage} على ${draft.gradeScale}) مقابل مصدر رسمي` : `Confirm the average (${draft.academicAverage} on ${draft.gradeScale}) against an official source`)
      : (isArabic ? `لسه ما عندنا معدل واضح للتحقق منه` : `No clear grade average yet to verify`),
    draft.highSchoolDiplomaOrigin ? (isArabic ? `مطابقة شهادة ${draft.highSchoolDiplomaOrigin} مع متطلبات المعادلة` : `Check ${draft.highSchoolDiplomaOrigin} diploma against equivalence requirements`) : "",
    draft.fundingRoute === "sponsor" || draft.hasSponsor ? (isArabic ? `توثيق التزام الكفيل قبل التقديم` : `Document the sponsor commitment before applying`) : "",
  ].filter(Boolean);
  const cannotDecide: string[] = isArabic
    ? ["قرار القبول النهائي", "الأهلية أو التأشيرة", "نتيجة أي منحة أو تمويل"]
    : ["Final admission decisions", "Eligibility or visa outcomes", "Scholarship or funding results"];
  return { signals, preparation, cannotDecide };
}
