/** Stable provider-neutral programme shape for research and comparison surfaces. */
export type ComparableProgramme = {
  providerId: string;
  programmeId: string;
  institution: string;
  programmeName: string;
  city: string;
  subjectAreas: string;
  teachingLanguage: string | null;
  admissionContext: string | null;
  feeContext: string | null;
  evidenceUrl: string;
  officialProgrammeUrl: string | null;
};

export interface ProgrammeComparisonProvider<TSource> {
  providerId: string;
  toComparableProgramme(source: TSource): ComparableProgramme;
}

export function toggleProgrammeComparison(current: string[], programmeId: string, maxSelections = 3) {
  if (current.includes(programmeId)) return current.filter((value) => value !== programmeId);
  return current.length < maxSelections ? [...current, programmeId] : current;
}

export function comparisonEvidenceUrl(programme: ComparableProgramme) {
  return programme.officialProgrammeUrl || programme.evidenceUrl;
}
