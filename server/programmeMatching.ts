export type FitProfileForMatching = {
  studyDirection: string;
  languageComfort?: string | null;
  tuitionBudgetBand?: string | null;
  fundingRoute?: string | null;
  hasSponsor: boolean;
  qualifications?: string | null;
  nationality?: string | null;
};

export type ProgrammeResearchRecord = {
  programmeId: string; programmeName: string; officialName: string; city: string; broadSubjectCategories: string; fieldMatchBasis: string | null; programmeLanguage: string | null; feeRiskCategory: string | null; programmeEvidenceUrl: string; officialProgrammeUrl: string | null;
};

export type ProgrammeMatch = ProgrammeResearchRecord & { score: number; fitSignals: string[]; verificationGaps: string[]; sourceUrl: string };

/** Country modules implement this stable provider contract; matching UI does not depend on one database table. */
export interface ProgrammeResearchProvider {
  country: string;
  getCandidates(profile: FitProfileForMatching): Promise<ProgrammeResearchRecord[]>;
}

const terms = (value?: string | null) => [...new Set((value ?? "").toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu)?.map((item) => item.trim()).filter((item) => item.length > 1) ?? [])];

export function explainProgrammeMatch(profile: FitProfileForMatching, programme: ProgrammeResearchRecord): ProgrammeMatch {
  const direction = profile.studyDirection.trim().toLowerCase();
  const searchableField = `${programme.broadSubjectCategories} ${programme.fieldMatchBasis ?? ""} ${programme.programmeName}`.toLowerCase();
  const searchableLanguage = (programme.programmeLanguage ?? "").toLowerCase();
  const fitSignals: string[] = [];
  const verificationGaps: string[] = [];
  let score = 0;
  if (direction && searchableField.includes(direction)) { score += 60; fitSignals.push("Study direction appears in the programme’s supplied subject evidence."); }
  else if (terms(direction).some((term) => searchableField.includes(term))) { score += 42; fitSignals.push("Part of your study direction appears in the supplied subject evidence."); }
  const preferredLanguages = terms(profile.languageComfort);
  if (preferredLanguages.some((language) => searchableLanguage.includes(language))) { score += 20; fitSignals.push("A stated comfortable language appears in the programme record."); }
  else if (preferredLanguages.length) verificationGaps.push("Verify the programme’s current teaching and application language on its official page.");
  if (profile.tuitionBudgetBand && profile.tuitionBudgetBand !== "unsure") { fitSignals.push("Your budget preference is retained for review; current programme cost must be verified from official evidence."); score += 4; }
  if (profile.hasSponsor || (profile.fundingRoute && profile.fundingRoute !== "unsure")) fitSignals.push("Your funding route is retained for planning; visa and financial-proof rules require official confirmation.");
  if (profile.qualifications || profile.nationality) verificationGaps.push("Verify the programme’s current qualification recognition and nationality-specific requirements with the official provider or university.");
  if (!programme.feeRiskCategory) verificationGaps.push("No supplied fee context is available—verify tuition and semester contribution directly.");
  verificationGaps.push("This is a research fit signal, not an eligibility, visa, funding, or admission outcome.");
  return { ...programme, score, fitSignals, verificationGaps, sourceUrl: programme.officialProgrammeUrl || programme.programmeEvidenceUrl };
}

export function rankProgrammeMatches(profile: FitProfileForMatching, programmes: ProgrammeResearchRecord[]) {
  return programmes.map((programme) => explainProgrammeMatch(profile, programme)).sort((a, b) => b.score - a.score || a.programmeName.localeCompare(b.programmeName));
}

/**
 * Phase 3 — the Decision Room shows a small, honestly-sized first result, not a
 * quietly-truncated slice of a much larger ranked list. A match only counts as
 * "credible" here if it scored on something beyond the retained-context floor
 * (budget/funding retention alone adds a small constant score with no real
 * subject or language evidence behind it — see explainProgrammeMatch). This
 * keeps the "fewer than three" honesty case actually reachable from real data,
 * instead of only firing when literally nothing matches at all.
 */
const CREDIBLE_MATCH_FLOOR = 20;

export type DecisionRoomResult = { matches: ProgrammeMatch[]; isPartial: boolean; consideredCount: number };

export function topDecisionRoomMatches(ranked: ProgrammeMatch[], limit = 3): DecisionRoomResult {
  const credible = ranked.filter((match) => match.score >= CREDIBLE_MATCH_FLOOR);
  const matches = credible.slice(0, limit);
  return { matches, isPartial: matches.length < limit, consideredCount: credible.length };
}
