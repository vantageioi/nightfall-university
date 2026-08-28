import type { ComparableProgramme } from "./programmeComparison";

export type ProgrammeResearchPanelOption = { value: string; label: string };

export type ProgrammeResearchPanelPresentation = {
  kicker: string;
  title: string;
  body: string;
};

/** UI-facing contract country research providers implement before being passed to shared discovery and comparison surfaces. */
export interface ProgrammeResearchPanelContract<TSource> {
  providerId: string;
  countryLabel: string;
  toComparableProgramme(source: TSource): ComparableProgramme;
  sourceUrl(source: TSource): string;
  initialVisibleResultCount: number;
  presentation: {
    en: ProgrammeResearchPanelPresentation;
    ar: ProgrammeResearchPanelPresentation;
  };
  fieldOptions: ProgrammeResearchPanelOption[];
  languageOptions: ProgrammeResearchPanelOption[];
}
