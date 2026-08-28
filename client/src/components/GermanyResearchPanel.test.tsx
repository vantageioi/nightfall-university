import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// GermanyResearchPanel wires an AI briefing supplement through tRPC; the
// comparison flow under test never calls it, so stub the transport.
vi.mock("@/lib/trpc", () => ({
  trpc: {
    student: {
      germanyProgrammeBriefings: { useQuery: () => ({ data: [] }) },
      generateGermanyProgrammeBriefing: { useMutation: () => ({ isPending: false, variables: null, mutate: vi.fn() }) },
    },
    useUtils: () => ({ student: { germanyProgrammeBriefings: { invalidate: vi.fn() } } }),
  },
}));

import { GermanyResearchPanel } from "./GermanyResearchPanel";
import { toggleProgrammeComparison } from "@/lib/programmeComparison";
import type { ProgrammeResearchRecord } from "./ProgrammeResearchPanel";

const germanyRecords: ProgrammeResearchRecord[] = [
  {
    programmeId: "de-tub-101",
    officialName: "Technische Universität Berlin",
    city: "Berlin",
    region: "Berlin",
    programmeName: "Computer Science (MSc)",
    broadSubjectCategories: "Computer Science, Mathematics",
    programmeEvidenceUrl: "https://www.tu.berlin/en/study/programmes",
    officialProgrammeUrl: "https://www.tu.berlin/en/study/computer-science-msc",
    programmeLanguage: "English",
    admissionSemester: "Winter",
    admissionMode: "Restricted (NC)",
    sourceLayer: "official-directory",
    reputationTier: "public-university",
    securityInfrastructure: null,
    feeRiskCategory: "No tuition, semester fee only",
    syrianBaccalaureateAnabinCondition: null,
  },
  {
    programmeId: "de-lmu-202",
    officialName: "Ludwig-Maximilians-Universität München",
    city: "Munich",
    region: "Bavaria",
    programmeName: "Data Science (MSc)",
    broadSubjectCategories: "AI & Data Science",
    programmeEvidenceUrl: "https://www.lmu.de/en/study/programmes/data-science",
    officialProgrammeUrl: null,
    programmeLanguage: "German",
    admissionSemester: "Winter",
    admissionMode: "Open assessment",
    sourceLayer: "official-directory",
    reputationTier: "public-university",
    securityInfrastructure: null,
    feeRiskCategory: "No tuition, semester fee only",
    syrianBaccalaureateAnabinCondition: null,
  },
];

function baseProps() {
  return {
    records: germanyRecords,
    savedProgrammes: germanyRecords,
    archivedProgrammes: [],
    savedProgrammeIds: new Set(germanyRecords.map((r) => r.programmeId)),
    isLoading: false,
    query: "",
    category: "",
    language: "",
    isArabic: false,
    onQueryChange: vi.fn(),
    onCategoryChange: vi.fn(),
    onLanguageChange: vi.fn(),
    onSaveProgramme: vi.fn(),
    onPinProgramme: vi.fn(),
    onArchiveProgramme: vi.fn(),
    onRemoveProgramme: vi.fn(),
    onSaveNotes: vi.fn(),
  };
}

describe("GermanyResearchPanel two-programme comparison through the Germany adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a REAL two-programme selection through the provider-neutral shape", () => {
    // The Compare button in ProgrammeResearchPanel calls exactly this toggle,
    // once per click — select programme A then programme B.
    const selection = toggleProgrammeComparison(toggleProgrammeComparison([], "de-tub-101"), "de-lmu-202");
    expect(selection).toEqual(["de-tub-101", "de-lmu-202"]);

    const markup = renderToStaticMarkup(<GermanyResearchPanel {...baseProps()} initialComparisonIds={selection} />);

    // Comparable mapping survived the Germany adapter for both programmes.
    expect(markup).toContain("Computer Science (MSc)");
    expect(markup).toContain("Data Science (MSc)");
    expect(markup).toContain("Technische Universität Berlin");
    expect(markup).toContain("Ludwig-Maximilians-Universität München");
    expect(markup).toContain("Berlin");
    expect(markup).toContain("Munich");

    // Field mapping: teachingLanguage · admissionContext from the adapter.
    expect(markup).toContain("English");
    expect(markup).toContain("Restricted (NC)");
    expect(markup).toContain("German");
    expect(markup).toContain("Open assessment");

    // Source URL resolution: official URL preferred when present, evidence
    // fallback when not — rendered as the shared "Verify source" link.
    expect(markup).toContain("https://www.tu.berlin/en/study/computer-science-msc");
    expect(markup).toContain("https://www.lmu.de/en/study/programmes/data-science");
    expect(markup).toContain("Verify source");

    // The shared comparison renderer heading from the panel contract copy.
    expect(markup).toContain("QUIET COMPARISON");
  });

  it("keeps a single selection below the comparable threshold", () => {
    const single = toggleProgrammeComparison([], "de-tub-101");
    const markup = renderToStaticMarkup(<GermanyResearchPanel {...baseProps()} initialComparisonIds={single} />);
    expect(markup).toContain("Select two or more programmes to compare.");
    expect(markup).not.toContain("Verify source");
  });

  it("ignores comparison ids that are not in the saved shortlist", () => {
    const markup = renderToStaticMarkup(<GermanyResearchPanel {...baseProps()} initialComparisonIds={["de-not-saved"]} />);
    expect(markup).toContain("Select two or more programmes to compare.");
  });
});
