import { describe, expect, it } from "vitest";
import { comparisonEvidenceUrl } from "./programmeComparison";
import { germanyProgrammeComparisonProvider, germanyProgrammeResearchPanelContract } from "./germanyProgrammeComparisonProvider";

describe("Germany programme comparison provider", () => {
  it("maps index fields into the provider-neutral comparison shape", () => {
    const comparable = germanyProgrammeComparisonProvider.toComparableProgramme({ programmeId: "de-1", officialName: "Example University", city: "Berlin", programmeName: "Medicine", broadSubjectCategories: "Medicine and Health", programmeLanguage: "English", admissionMode: "Restricted", feeRiskCategory: "Verify", programmeEvidenceUrl: "https://example.edu/evidence", officialProgrammeUrl: "https://example.edu/programme" });
    expect(comparable.providerId).toBe("germany-public-index");
    expect(comparable.subjectAreas).toBe("Medicine and Health");
    expect(comparisonEvidenceUrl(comparable)).toBe("https://example.edu/programme");
  });

  it("supplies reusable panel pacing, bilingual presentation, source resolution, and filters", () => {
    expect(germanyProgrammeResearchPanelContract.initialVisibleResultCount).toBe(6);
    expect(germanyProgrammeResearchPanelContract.presentation.en.kicker).toBe("GERMANY RESEARCH INDEX");
    expect(germanyProgrammeResearchPanelContract.presentation.ar.kicker).toBe("دليل ألمانيا");
    expect(germanyProgrammeResearchPanelContract.fieldOptions.map((option) => option.value)).toContain("COMPUTER_SCIENCE");
    expect(germanyProgrammeResearchPanelContract.languageOptions.map((option) => option.value)).toEqual(["English", "German"]);
    expect(germanyProgrammeResearchPanelContract.sourceUrl({ officialProgrammeUrl: null, programmeEvidenceUrl: "https://example.edu/evidence" } as Parameters<typeof germanyProgrammeResearchPanelContract.sourceUrl>[0])).toBe("https://example.edu/evidence");
  });
});
