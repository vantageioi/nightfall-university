import { describe, expect, it } from "vitest";
import { comparisonEvidenceUrl, toggleProgrammeComparison, type ComparableProgramme } from "./programmeComparison";

describe("country-agnostic programme comparison", () => {
  const programme: ComparableProgramme = { providerId: "germany", programmeId: "de-1", institution: "Example University", programmeName: "Medicine", city: "Berlin", subjectAreas: "Medicine", teachingLanguage: "English", admissionContext: null, feeContext: null, evidenceUrl: "https://example.edu/evidence", officialProgrammeUrl: "https://example.edu/programme" };
  it("keeps comparison selection provider-neutral and prefers official evidence", () => {
    expect(toggleProgrammeComparison(["a", "b", "c"], "d")).toEqual(["a", "b", "c"]);
    expect(comparisonEvidenceUrl(programme)).toBe("https://example.edu/programme");
  });
});
