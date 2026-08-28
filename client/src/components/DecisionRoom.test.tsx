import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DecisionRoom, type DecisionRoomMatch } from "./DecisionRoom";

const baseMatch: DecisionRoomMatch = {
  programmeId: "de-1",
  programmeName: "Medicine",
  officialName: "Example University",
  city: "Berlin",
  programmeLanguage: "English",
  fitSignals: ["Study direction appears in the programme's supplied subject evidence."],
  verificationGaps: ["This is a research fit signal, not an eligibility, visa, funding, or admission outcome."],
  sourceUrl: "https://example.edu/programme",
};

describe("DecisionRoom", () => {
  it("shows a justified role label when the top fit signal supports one", () => {
    const markup = renderToStaticMarkup(
      <DecisionRoom language="en" matches={[baseMatch]} savedProgrammeIds={new Set()} onKeep={() => {}} onExplore={() => {}} onAdjustDirection={() => {}} onBuildJourney={() => {}} />,
    );
    expect(markup).toContain("Close to your direction");
    expect(markup).toContain("WHY THIS?");
    expect(markup).toContain("How does this shortlist feel?");
    expect(markup).toContain("NIGHTFALL / CONSULTANT");
    expect(markup).toContain("RESEARCH STATUS");
  });

  it("omits the role label entirely rather than showing an unjustified default when the top signal doesn't support one", () => {
    const thinMatch: DecisionRoomMatch = { ...baseMatch, programmeId: "de-2", fitSignals: ["Your funding route is retained for planning; visa and financial-proof rules require official confirmation."] };
    const markup = renderToStaticMarkup(
      <DecisionRoom language="en" matches={[thinMatch]} savedProgrammeIds={new Set()} onKeep={() => {}} onExplore={() => {}} onAdjustDirection={() => {}} onBuildJourney={() => {}} />,
    );
    expect(markup).not.toContain("Close to your direction");
    expect(markup).not.toContain("Known cost context");
    expect(markup).not.toContain("Language to plan for");
    expect(markup).toContain("01");
    expect(markup).not.toMatch(/01\s*\/\s*<\/p>/);
  });

  it("shows the language-preparation role when a language verification gap is present", () => {
    const languageGapMatch: DecisionRoomMatch = { ...baseMatch, programmeId: "de-3", verificationGaps: ["Verify the programme's current teaching and application language on its official page."] };
    const markup = renderToStaticMarkup(
      <DecisionRoom language="en" matches={[languageGapMatch]} savedProgrammeIds={new Set()} onKeep={() => {}} onExplore={() => {}} onAdjustDirection={() => {}} onBuildJourney={() => {}} />,
    );
    expect(markup).toContain("Language to plan for");
  });

  it("never renders a percentage, score, or safe/target/reach fit label anywhere in the room", () => {
    const markup = renderToStaticMarkup(
      <DecisionRoom language="en" matches={[baseMatch]} savedProgrammeIds={new Set()} onKeep={() => {}} onExplore={() => {}} onAdjustDirection={() => {}} onBuildJourney={() => {}} />,
    );
    expect(markup).not.toMatch(/\d+\s*%/);
    expect(markup.toLowerCase()).not.toContain("safe option");
    expect(markup.toLowerCase()).not.toMatch(/\btarget\b(?!="_blank")/);
    expect(markup.toLowerCase()).not.toContain("reach option");
    expect(markup.toLowerCase()).not.toMatch(/safe\s*\/\s*target\s*\/\s*reach/);
  });

  it("shows an honest empty state instead of pretending a broad list is a recommendation when there are no credible matches", () => {
    const markup = renderToStaticMarkup(
      <DecisionRoom language="en" matches={[]} savedProgrammeIds={new Set()} onKeep={() => {}} onExplore={() => {}} onAdjustDirection={() => {}} onBuildJourney={() => {}} />,
    );
    expect(markup).toContain("There is not a useful three-option set to show yet.");
    expect(markup).toContain("Nightfall will not dress up a broad catalogue as a recommendation.");
  });

  it("offers an explicit journey transition only after the student has kept a real option", () => {
    const emptyMarkup = renderToStaticMarkup(<DecisionRoom language="en" matches={[baseMatch]} savedProgrammeIds={new Set()} onKeep={() => {}} onExplore={() => {}} onAdjustDirection={() => {}} onBuildJourney={() => {}} />);
    const savedMarkup = renderToStaticMarkup(<DecisionRoom language="en" matches={[baseMatch]} savedProgrammeIds={new Set([baseMatch.programmeId])} onKeep={() => {}} onExplore={() => {}} onAdjustDirection={() => {}} onBuildJourney={() => {}} />);
    expect(emptyMarkup).not.toContain("BUILD MY JOURNEY");
    expect(savedMarkup).toContain("BUILD MY JOURNEY");
    expect(savedMarkup).toContain("OPTIONS KEPT");
  });
});
