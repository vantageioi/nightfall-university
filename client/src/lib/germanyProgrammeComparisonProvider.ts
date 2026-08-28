import type { ComparableProgramme, ProgrammeComparisonProvider } from "./programmeComparison";
import type { ProgrammeResearchPanelContract } from "./programmeResearchPanel";

export type GermanyProgrammeComparisonSource = {
  programmeId: string; officialName: string; city: string; programmeName: string; broadSubjectCategories: string; programmeLanguage: string | null; admissionMode: string | null; feeRiskCategory: string | null; programmeEvidenceUrl: string; officialProgrammeUrl: string | null;
};

export const germanyProgrammeComparisonProvider: ProgrammeComparisonProvider<GermanyProgrammeComparisonSource> = {
  providerId: "germany-public-index",
  toComparableProgramme(source): ComparableProgramme {
    return { providerId: "germany-public-index", programmeId: source.programmeId, institution: source.officialName, programmeName: source.programmeName, city: source.city, subjectAreas: source.broadSubjectCategories, teachingLanguage: source.programmeLanguage, admissionContext: source.admissionMode, feeContext: source.feeRiskCategory, evidenceUrl: source.programmeEvidenceUrl, officialProgrammeUrl: source.officialProgrammeUrl };
  },
};

export const germanyProgrammeResearchPanelContract: ProgrammeResearchPanelContract<GermanyProgrammeComparisonSource> = {
  providerId: germanyProgrammeComparisonProvider.providerId,
  countryLabel: "Germany",
  toComparableProgramme: germanyProgrammeComparisonProvider.toComparableProgramme,
  sourceUrl: (source) => source.officialProgrammeUrl || source.programmeEvidenceUrl,
  initialVisibleResultCount: 6,
  presentation: {
    en: { kicker: "GERMANY RESEARCH INDEX", title: "Browse slowly. Decide clearly.", body: "A reviewed public directory with a source behind every programme. The interface stays quiet so the next useful detail can surface." },
    ar: { kicker: "دليل ألمانيا", title: "فتّش بهدوء. قرّر على مهل.", body: "دليل عام موثّق مع مصدر كل برنامج. خففنا الواجهة حتى تركّز على الخطوة اللي قدامك." },
  },
  fieldOptions: [
    { value: "COMPUTER_SCIENCE", label: "Computer Science" },
    { value: "CYBERSECURITY", label: "Cybersecurity" },
    { value: "AI_DATA_SCIENCE", label: "AI & Data Science" },
    { value: "ECONOMICS_BUSINESS", label: "Economics & Business" },
  ],
  languageOptions: [
    { value: "English", label: "English" },
    { value: "German", label: "German" },
  ],
};
