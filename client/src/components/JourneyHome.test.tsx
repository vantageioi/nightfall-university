import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneyHome } from "./JourneyHome";
import type { JourneyHomeState } from "@/lib/journeyStage";

const state: JourneyHomeState = {
  stage: "prepare",
  pulse: [{ kind: "shortlist", value: 2, status: "clear" }, { kind: "deadline", value: 1, status: "clear" }, { kind: "attention", value: 0, status: "clear" }, { kind: "sources", value: 0, status: "waiting" }],
  primaryAction: { destination: "home", reason: "review_programme_requirements" },
  enabledTools: ["consult", "essays", "compare", "reach", "calendar", "documents", "watch"],
  unavailableToolFallbacks: {},
};

const actions = { onAction: () => {}, onOpenProgramme: () => {}, onOpenTools: () => {}, onRecover: () => {}, onOpenResearch: () => {}, onOpenEssays: () => {}, onOpenOutreach: () => {}, onOpenSettings: () => {} };

describe("JourneyHome", () => {
  it("puts research, essay drafting, and approval-first outreach in view without completion claims or a changed-direction menu", () => {
    const markup = renderToStaticMarkup(<JourneyHome language="en" name="Rania" state={state} programmes={[{ id: "g-architecture", programme: "Architecture", university: "Example University", city: "Berlin", isPriority: true, sourceUrl: "https://example.edu" }]} attentionItems={[]} preparingProgrammeIds={new Set()} {...actions} />);
    expect(markup).toContain("You have a direction.");
    expect(markup).toContain("Research with the Agent");
    expect(markup).toContain("Draft an essay");
    expect(markup).toContain("Prepare outreach");
    expect(markup).toContain("Settings");
    expect(markup).toContain("Gemini, Gmail, language, and privacy");
    expect(markup).toContain("Something changed? Talk it through");
    expect(markup).not.toMatch(/\d+%/);
    expect(markup).not.toContain("automatically submitted");
    expect(markup).not.toContain("Explore another option");
  });

  it("shows only explicitly started preparation paths under applications", () => {
    const markup = renderToStaticMarkup(<JourneyHome language="en" name="Rania" state={state} programmes={[{ id: "g-architecture", programme: "Architecture", university: "Example University", city: "Berlin", isPriority: true }]} attentionItems={[]} preparingProgrammeIds={new Set(["g-architecture"])} {...actions} />);
    expect(markup).toContain("ACTIVE PREPARATION");
    expect(markup).toContain("The paths you are actively preparing.");
    expect(markup).toContain("Nothing is submitted by Nightfall.");
  });
});
