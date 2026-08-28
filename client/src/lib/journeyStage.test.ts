import { describe, expect, it } from "vitest";
import { resolveJourneyDestination, resolveJourneyHome, type JourneyContext } from "./journeyStage";

const base: JourneyContext = {
  hasMatchingContext: false,
  savedProgrammeCount: 0,
  priorityProgrammeCount: 0,
  confirmedDeadlineCount: 0,
  documentCount: 0,
  confirmedContactCount: 0,
  unreadReplyCount: 0,
  draftCount: 0,
  dueFollowUpCount: 0,
  activeWatchCount: 0,
  remainingConsultations: 3,
};

describe("guided student journey state", () => {
  it("sends an un-oriented student to the Consultant rather than a research catalogue", () => {
    const state = resolveJourneyHome(base);
    expect(state.stage).toBe("orient");
    expect(state.primaryAction).toEqual({ destination: "consult", reason: "needs_direction" });
    expect(state.enabledTools).toEqual(["consult"]);
  });

  it("treats discovery as a one-time review action after matching context exists", () => {
    const state = resolveJourneyHome({ ...base, hasMatchingContext: true });
    expect(state.stage).toBe("review_options");
    expect(state.primaryAction).toEqual({ destination: "discover", reason: "review_first_options" });
    expect(state.enabledTools).toEqual(["consult", "discover", "essays", "reach"]);
  });

  it("prioritizes comparison only after a student has two saved options, without losing the Consultant as a safety net", () => {
    const withOne = resolveJourneyHome({ ...base, hasMatchingContext: true, savedProgrammeCount: 1 });
    const withTwo = resolveJourneyHome({ ...base, hasMatchingContext: true, savedProgrammeCount: 2 });
    expect(withOne.stage).toBe("build_shortlist");
    expect(withOne.primaryAction.destination).toBe("discover");
    expect(withTwo.stage).toBe("choose");
    expect(withTwo.primaryAction.destination).toBe("compare");
    expect(withTwo.enabledTools).toContain("compare");
    expect(withTwo.enabledTools).toContain("consult");
  });

  it("treats Discover as a one-time reveal that steps aside once a shortlist exists, rather than a permanent browsing tab", () => {
    const oneItem = resolveJourneyHome({ ...base, hasMatchingContext: true, savedProgrammeCount: 1 });
    const twoItems = resolveJourneyHome({ ...base, hasMatchingContext: true, savedProgrammeCount: 2 });
    expect(oneItem.enabledTools).toContain("discover");
    expect(twoItems.enabledTools).not.toContain("discover");
  });

  it("keeps the Research Agent reachable even when a separate profile-refresh allowance is spent", () => {
    const laterStageWithBudget = resolveJourneyHome({ ...base, hasMatchingContext: true, savedProgrammeCount: 2, confirmedContactCount: 1, remainingConsultations: 1 });
    expect(laterStageWithBudget.enabledTools).toContain("consult");
    expect(laterStageWithBudget.secondaryAction).toEqual({ destination: "consult", reason: "needs_direction" });

    const laterStageNoBudget = resolveJourneyHome({ ...base, hasMatchingContext: true, savedProgrammeCount: 2, confirmedContactCount: 1, remainingConsultations: 0 });
    expect(laterStageNoBudget.enabledTools).toContain("consult");
    expect(resolveJourneyDestination({ ...base, hasMatchingContext: true, savedProgrammeCount: 2, remainingConsultations: 0 }, "consult")).toEqual({ destination: "consult" });
  });

  it("promotes actual communication work over unrelated browsing", () => {
    const state = resolveJourneyHome({ ...base, hasMatchingContext: true, savedProgrammeCount: 2, unreadReplyCount: 1, confirmedContactCount: 1 });
    expect(state.stage).toBe("communicate");
    expect(state.primaryAction).toEqual({ destination: "reach", reason: "review_communication" });
    expect(state.pulse.find((item) => item.kind === "attention")).toMatchObject({ value: 1, status: "attention" });
  });

  it("sends a student with an explicitly prioritized programme to source-backed requirement review before generic tools", () => {
    const state = resolveJourneyHome({ ...base, hasMatchingContext: true, savedProgrammeCount: 2, priorityProgrammeCount: 1, confirmedDeadlineCount: 1, documentCount: 2 });
    expect(state.stage).toBe("prepare");
    expect(state.primaryAction).toEqual({ destination: "home", reason: "review_programme_requirements" });
  });

  it("keeps private documents reachable for organization without pretending a programme requirement exists", () => {
    const state = resolveJourneyHome({ ...base, hasMatchingContext: true, documentCount: 1 });
    expect(state.stage).toBe("review_options");
    expect(state.enabledTools).toEqual(["consult", "discover", "essays", "reach", "documents"]);
    expect(resolveJourneyDestination({ ...base, hasMatchingContext: true, documentCount: 1 }, "documents")).toEqual({ destination: "documents" });
  });

  it("returns a clear preceding step for a premature direct tool link", () => {
    expect(resolveJourneyDestination({ ...base, hasMatchingContext: true, savedProgrammeCount: 1 }, "compare")).toEqual({
      destination: "discover",
      fallback: { destination: "discover", reason: "build_shortlist" },
    });
    expect(resolveJourneyDestination(base, "reach").destination).toBe("home");
  });
});
