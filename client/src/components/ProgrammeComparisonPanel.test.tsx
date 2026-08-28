import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProgrammeComparisonPanel } from "./ProgrammeComparisonPanel";

describe("ProgrammeComparisonPanel", () => {
  const programmes = [
    { providerId: "germany", programmeId: "de-1", institution: "Example University", programmeName: "Medicine", city: "Berlin", subjectAreas: "Medicine", teachingLanguage: "English", admissionContext: "Restricted", feeContext: null, evidenceUrl: "https://example.edu/evidence", officialProgrammeUrl: "https://example.edu/programme" },
    { providerId: "germany", programmeId: "de-2", institution: "Example University", programmeName: "Pharmacy", city: "Munich", subjectAreas: "Medicine", teachingLanguage: "German", admissionContext: "Open", feeContext: null, evidenceUrl: "https://example.edu/evidence-2", officialProgrammeUrl: null },
  ];
  it("renders provider-neutral programme details and official evidence links", () => {
    const markup = renderToStaticMarkup(<ProgrammeComparisonPanel programmes={programmes} language="en" />);
    expect(markup).toContain("Medicine");
    expect(markup).toContain("Pharmacy");
    expect(markup).toContain("https://example.edu/programme");
    expect(markup).toContain("Verify source");
  });
});
