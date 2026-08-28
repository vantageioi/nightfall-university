import { describe, expect, it } from "vitest";
import { familyInput, germanyProgrammeArchiveInput, germanyProgrammeDeadlineHandoffInput, germanyProgrammeDecisionNotesInput, germanyProgrammePinInput, germanyProgrammePriorityInput, germanyProgrammeSaveInput, germanyProgrammeSearchInput, lastViewedComparisonInput, reminderPreferenceInput, studentProfileInput, transcriptInput, universityInput } from "./routers";

describe("student journey input", () => {
  it("accepts an Arabic student onboarding baseline", () => {
    const result = studentProfileInput.safeParse({ preferredName: "رانية", contactEmail: "rania@example.com", phoneNumber: "+96170123456", destination: "هولندا", graduationYear: "٢٠٢٧", highSchoolDiplomaOrigin: "سوريا", preferredLanguage: "ar" });
    expect(result.success).toBe(true);
    expect(studentProfileInput.safeParse({ preferredName: "", contactEmail: "not-an-email", phoneNumber: "", destination: "Netherlands", graduationYear: "2027", highSchoolDiplomaOrigin: "", preferredLanguage: "en" }).success).toBe(false);
  });

  it("requires a valid family-view invitation boundary", () => {
    expect(familyInput.safeParse({ email: "guardian@example.com", relationship: "Parent" }).success).toBe(true);
    expect(familyInput.safeParse({ email: "not-an-email", relationship: "" }).success).toBe(false);
  });

  it("accepts permitted transcript metadata but rejects unsafe mime types", () => {
    expect(transcriptInput.safeParse({ fileName: "transcript.pdf", mimeType: "application/pdf", dataBase64: "dGVzdC1maWxlLWRhdGE=" }).success).toBe(true);
    expect(transcriptInput.safeParse({ fileName: "script.exe", mimeType: "application/octet-stream", dataBase64: "dGVzdC1maWxlLWRhdGE=" }).success).toBe(false);
  });

  it("bounds student-owned deadline timing preferences to a valid UTC hour", () => {
    const settings = { enabled: true, remindSevenDays: true, remindThreeDays: false, remindOneDay: true, preferredHourUtc: 8 };
    expect(reminderPreferenceInput.safeParse(settings).success).toBe(true);
    expect(reminderPreferenceInput.safeParse({ ...settings, preferredHourUtc: 24 }).success).toBe(false);
  });

  it("accepts a positive student-owned comparison university identifier", () => {
    expect(lastViewedComparisonInput.safeParse({ universityId: 42 }).success).toBe(true);
    expect(lastViewedComparisonInput.safeParse({ universityId: 0 }).success).toBe(false);
  });

  it("bounds the reviewed Germany programme search query", () => {
    expect(germanyProgrammeSearchInput.safeParse({ query: "Cybersecurity", category: "CYBERSECURITY", language: "English", limit: 20 }).success).toBe(true);
    expect(germanyProgrammeSearchInput.safeParse({ limit: 41 }).success).toBe(false);
  });

  it("accepts a bounded programme identifier for a student-owned Germany save", () => {
    expect(germanyProgrammeSaveInput.safeParse({ programmeId: "g2107045" }).success).toBe(true);
    expect(germanyProgrammeSaveInput.safeParse({ programmeId: "" }).success).toBe(false);
  });

  it("accepts explicit pin and archive lifecycle changes for a saved Germany programme", () => {
    expect(germanyProgrammePinInput.safeParse({ programmeId: "g2107045", isPinned: true }).success).toBe(true);
    expect(germanyProgrammeArchiveInput.safeParse({ programmeId: "g2107045", archived: true }).success).toBe(true);
  });

  it("keeps a student priority rank deliberately bounded and nullable for removal", () => {
    expect(germanyProgrammePriorityInput.safeParse({ programmeId: "g2107045", priorityRank: 1 }).success).toBe(true);
    expect(germanyProgrammePriorityInput.safeParse({ programmeId: "g2107045", priorityRank: null }).success).toBe(true);
    expect(germanyProgrammePriorityInput.safeParse({ programmeId: "g2107045", priorityRank: 13 }).success).toBe(false);
  });

  it("accepts a positive UTC timestamp for a student-confirmed deadline handoff", () => {
    expect(germanyProgrammeDeadlineHandoffInput.safeParse({ programmeId: "g2107045", deadlineAt: 1799712000000 }).success).toBe(true);
    expect(germanyProgrammeDeadlineHandoffInput.safeParse({ programmeId: "g2107045", deadlineAt: 0 }).success).toBe(false);
  });

  it("keeps private programme notes bounded to a student-owned entry", () => {
    expect(germanyProgrammeDecisionNotesInput.safeParse({ programmeId: "g2107045", decisionNotes: "Strong match for my German-language goals." }).success).toBe(true);
    expect(germanyProgrammeDecisionNotesInput.safeParse({ programmeId: "g2107045", decisionNotes: "x".repeat(3001) }).success).toBe(false);
  });

  it("accepts tuition, scholarship, requirement, and eligibility planning evidence", () => {
    expect(universityInput.safeParse({ university: "Leiden University", location: "Leiden, Netherlands", program: "International Studies", tuition: "Plan for EU / non-EU fee bands", scholarshipInfo: "Excellence routes may apply", admissionRequirements: "Relevant degree and transcript", eligibilityCriteria: "Check degree equivalency" }).success).toBe(true);
  });
});
