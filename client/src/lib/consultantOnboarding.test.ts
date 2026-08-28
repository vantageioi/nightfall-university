import { describe, expect, it } from "vitest";
import { EXPLORING_STUDY_DIRECTION } from "@shared/studyDirection";
import { buildConsultationPriorities, canAdvanceWarmInterview, canPersistConsultantFit, consultantInputQuality, consultantSummaryGroups, emptyConsultantFitDraft, emptyWarmInterviewDraft, fitProfileFromInterview } from "./consultantOnboarding";

const completeInterview = { ...emptyWarmInterviewDraft, preferredName: "Rania", contactEmail: "rania@example.com", studyDirection: "Architecture", studyLevel: "Bachelor's", tuitionBudgetBand: "medium" as const, fundingRoute: "sponsor" as const, hasSponsor: true, nationality: "Syrian", highSchoolDiplomaOrigin: "Syria", academicAverage: "89", gradeScale: "out of 100", languageComfort: "English", priorities: "Cost and programme language", phoneNumber: "+96170123456", consent: true };

describe("warm consultant interview", () => {
  it("earns each interview step without showing a single cold all-fields form", () => {
    expect(canAdvanceWarmInterview(0, completeInterview)).toBe(true);
    expect(canAdvanceWarmInterview(0, { ...completeInterview, contactEmail: "" })).toBe(true);
    expect(canAdvanceWarmInterview(1, completeInterview)).toBe(true);
    expect(canAdvanceWarmInterview(1, { ...completeInterview, studyDirection: "hapafisjfafa" })).toBe(false);
    expect(canAdvanceWarmInterview(1, { ...completeInterview, studyDirection: "عمارة" })).toBe(true);
    expect(canAdvanceWarmInterview(1, { ...completeInterview, studyDirection: EXPLORING_STUDY_DIRECTION })).toBe(true);
    expect(canAdvanceWarmInterview(2, { ...completeInterview, tuitionBudgetBand: "unsure" })).toBe(false);
    expect(canAdvanceWarmInterview(3, { ...completeInterview, academicAverage: "" })).toBe(false);
    expect(canAdvanceWarmInterview(4, { ...completeInterview, consent: false })).toBe(false);
    expect(canAdvanceWarmInterview(4, completeInterview)).toBe(true);
  });

  it("maps every reviewed path-changing planning signal into a consented fit profile", () => {
    expect(fitProfileFromInterview(completeInterview)).toMatchObject({ studyDirection: "Architecture", studyLevel: "Bachelor's", academicAverage: "89", gradeScale: "out of 100", nationality: "Syrian", languageComfort: "English", tuitionBudgetBand: "medium", fundingRoute: "sponsor", hasSponsor: true, priorities: "Cost and programme language", consent: true });
  });

  it("never persists private fit context without direction and explicit consent", () => {
    expect(canPersistConsultantFit({ ...emptyConsultantFitDraft, studyDirection: "Medicine", consent: false })).toBe(false);
    expect(canPersistConsultantFit({ ...emptyConsultantFitDraft, studyDirection: "", consent: true })).toBe(false);
    expect(canPersistConsultantFit({ ...emptyConsultantFitDraft, studyDirection: "hapafisjfafa", consent: true })).toBe(false);
    expect(canPersistConsultantFit({ ...emptyConsultantFitDraft, studyDirection: "Medicine", consent: true })).toBe(true);
  });

  it("uses deterministic local input quality to request clarification for keyboard noise", () => {
    expect(consultantInputQuality("direction", "hapafisjfafa")).toBe("needs_clarification");
    expect(consultantInputQuality("direction", "Architecture")).toBe("usable");
    expect(consultantInputQuality("name", "aaaaaa")).toBe("needs_clarification");
    expect(consultantInputQuality("context", "Syrian")).toBe("usable");
  });

  it("retains ranked priorities and student language as reviewable research context", () => {
    const priorities = buildConsultationPriorities({ primary: "Keeping costs low", selected: ["Keeping costs low", "The programme itself"], custom: "I need somewhere I can feel at home", motivation: "Creative work" });
    expect(priorities).toContain("Primary priority: Keeping costs low");
    expect(priorities).toContain("Student wording: I need somewhere I can feel at home");
    expect(priorities).toContain("What draws them: Creative work");
  });

  it("splits the closing summary into research signals, preparation to check, and things Nightfall cannot decide", () => {
    const groups = consultantSummaryGroups(completeInterview, "en");
    expect(groups.signals.some((line) => line.includes("Architecture"))).toBe(true);
    expect(groups.signals.some((line) => line.includes("Bachelor"))).toBe(true);
    expect(groups.preparation.some((line) => line.includes("89") && line.includes("out of 100"))).toBe(true);
    expect(groups.preparation.some((line) => line.toLowerCase().includes("sponsor"))).toBe(true);
    expect(groups.cannotDecide).toContain("Final admission decisions");
    expect(groups.cannotDecide).toContain("Eligibility or visa outcomes");
    expect(groups.cannotDecide).toContain("Scholarship or funding results");
  });

  it("never presents admission, visa, or funding outcomes as decidable, even with a thin draft", () => {
    const thin = { ...emptyWarmInterviewDraft };
    const groups = consultantSummaryGroups(thin, "en");
    expect(groups.signals).toHaveLength(0);
    expect(groups.preparation.length).toBeGreaterThan(0);
    expect(groups.cannotDecide).toHaveLength(3);
  });

  it("keeps the three-category summary structure in Arabic", () => {
    const groups = consultantSummaryGroups(completeInterview, "ar");
    expect(groups.signals.some((line) => line.startsWith("الاتجاه:"))).toBe(true);
    expect(groups.cannotDecide).toHaveLength(3);
    expect(groups.cannotDecide).toContain("قرار القبول النهائي");
  });
});
