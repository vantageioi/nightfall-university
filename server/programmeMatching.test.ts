import { describe, expect, it } from "vitest";
import { explainProgrammeMatch, topDecisionRoomMatches, type ProgrammeMatch } from "./programmeMatching";

describe("explainable programme matching", () => {
  const programme = { programmeId: "de-1", programmeName: "Medicine", officialName: "Example University", city: "Berlin", broadSubjectCategories: "Medicine and Health", fieldMatchBasis: "Medicine", programmeLanguage: "English", feeRiskCategory: null, programmeEvidenceUrl: "https://example.edu/evidence", officialProgrammeUrl: "https://example.edu/programme" };
  it("ranks a subject and language alignment while retaining review boundaries", () => {
    const match = explainProgrammeMatch({ studyDirection: "Medicine", languageComfort: "English", tuitionBudgetBand: "low", hasSponsor: true, nationality: "Jordanian" }, programme);
    expect(match.score).toBeGreaterThan(70);
    expect(match.fitSignals.join(" ")).toContain("subject evidence");
    expect(match.verificationGaps.join(" ")).toContain("not an eligibility");
    expect(match.sourceUrl).toBe(programme.officialProgrammeUrl);
  });

  it("adds an explicit 'no fee context supplied' verification gap when feeRiskCategory is null, rather than silently omitting cost review — this is the exact boundary Italy's no-per-programme-fee data relies on", () => {
    const match = explainProgrammeMatch({ studyDirection: "Medicine", languageComfort: "English", tuitionBudgetBand: null, hasSponsor: false, nationality: null }, programme);
    expect(programme.feeRiskCategory).toBeNull();
    expect(match.verificationGaps.some((gap) => gap.includes("No supplied fee context is available"))).toBe(true);
  });

  it("keeps an explicit consultation uncertainty answer neutral rather than inventing budget or funding fit signals", () => {
    const match = explainProgrammeMatch({ studyDirection: "Medicine", languageComfort: "", tuitionBudgetBand: "unsure", fundingRoute: "unsure", hasSponsor: false, nationality: null }, programme);
    expect(match.score).toBe(60);
    expect(match.fitSignals.join(" ")).not.toContain("budget preference");
    expect(match.fitSignals.join(" ")).not.toContain("funding route");
  });
});

describe("Decision Room honesty (Phase 3): at most three credible matches, never a silently truncated slice", () => {
  const credibleMatch = (id: string, score: number): ProgrammeMatch => ({
    programmeId: id, programmeName: id, officialName: "Example University", city: "Berlin",
    broadSubjectCategories: "Medicine", fieldMatchBasis: "Medicine", programmeLanguage: "English", feeRiskCategory: null,
    programmeEvidenceUrl: "https://example.edu/evidence", officialProgrammeUrl: "https://example.edu/programme",
    score, fitSignals: ["Study direction appears in the programme's supplied subject evidence."], verificationGaps: [], sourceUrl: "https://example.edu/programme",
  });

  it("returns exactly three matches and isPartial=false when three or more credible options exist", () => {
    const ranked = [credibleMatch("a", 60), credibleMatch("b", 55), credibleMatch("c", 50), credibleMatch("d", 45)];
    const result = topDecisionRoomMatches(ranked);
    expect(result.matches).toHaveLength(3);
    expect(result.isPartial).toBe(false);
    expect(result.consideredCount).toBe(4);
  });

  it("returns fewer than three and isPartial=true when only weak/uncredible matches exist beyond the floor", () => {
    const weak = [credibleMatch("weak-1", 8), credibleMatch("weak-2", 4)];
    const result = topDecisionRoomMatches(weak);
    expect(result.matches).toHaveLength(0);
    expect(result.isPartial).toBe(true);
    expect(result.consideredCount).toBe(0);
  });

  it("honestly reports isPartial=true with exactly the credible matches when there are 1 or 2, not zero and not padded to three", () => {
    const two = [credibleMatch("a", 60), credibleMatch("b", 50), credibleMatch("weak", 5)];
    const result = topDecisionRoomMatches(two);
    expect(result.matches).toHaveLength(2);
    expect(result.isPartial).toBe(true);
    expect(result.consideredCount).toBe(2);
  });
});
