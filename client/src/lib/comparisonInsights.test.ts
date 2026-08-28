import { describe, expect, it } from "vitest";
import { keyDifferenceFromEvidence, programmeDeadlineAlert, programmeLanguageAlert } from "./comparisonInsights";

describe("comparison key differences", () => {
  it("prefers a concrete named funding route", () => {
    expect(keyDifferenceFromEvidence({ tuition: "€1,000", scholarshipInfo: "ER.GO regional scholarship is available.", admissionRequirements: null, eligibilityCriteria: null })).toBe("Named funding route: ER.GO");
  });

  it("surfaces a no-tuition route before generic requirements", () => {
    expect(keyDifferenceFromEvidence({ tuition: "No tuition fee for this programme; semester fee applies.", scholarshipInfo: null, admissionRequirements: "Relevant degree", eligibilityCriteria: null })).toContain("No tuition fee");
  });

  it("keeps language and deadline status explicitly review-first", () => {
    expect(programmeLanguageAlert({ admissionRequirements: "English CEFR B2 evidence", eligibilityCriteria: null })).toContain("English-language evidence");
    expect(programmeDeadlineAlert("2027-01-20")).toContain("Confirm the current official deadline");
    expect(programmeDeadlineAlert(null)).toContain("No deadline is stored");
  });
});
