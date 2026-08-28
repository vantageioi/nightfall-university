import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneyTimeline } from "./JourneyTimeline";

describe("JourneyTimeline", () => {
  it("makes the earliest source-reviewed deadline primary and preserves provenance", () => {
    const markup = renderToStaticMarkup(<JourneyTimeline language="en" dates={[{ id: "deadline-1", date: new Date("2099-10-18"), university: "Example University", title: "Application deadline", provenance: "official", sourceUrl: "https://example.edu", programmeId: "g-example" }]} reminders={[]} followUps={[]} alerts={[]} onOpenProgramme={() => {}} onShowCalendar={() => {}} />);
    expect(markup).toContain("Dates with meaning.");
    expect(markup).toContain("OFFICIAL SOURCE REVIEWED");
    expect(markup).toContain("Review application");
    expect(markup).not.toContain("automatically");
  });
});
