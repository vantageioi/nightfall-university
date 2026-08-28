import { describe, expect, it } from "vitest";
import { isProgrammeBriefingFresh, programmeBriefingSourceHash } from "./programmeBriefing";

describe("programme briefing cache contract", () => {
  const source = { programmeId: "daad-1", programmeName: "Computer Science", programmeLanguage: "English", sourceUrl: "https://example.edu/programme" };

  it("changes cache identity when source data or briefing language changes", () => {
    expect(programmeBriefingSourceHash(source, "en")).not.toBe(programmeBriefingSourceHash(source, "ar"));
    expect(programmeBriefingSourceHash(source, "en")).not.toBe(programmeBriefingSourceHash({ ...source, programmeLanguage: "German" }, "en"));
  });

  it("reuses only a matching briefing that is less than seven days old", () => {
    const now = new Date("2026-08-21T00:00:00.000Z");
    expect(isProgrammeBriefingFresh(new Date("2026-08-14T00:00:01.000Z"), "same", "same", now)).toBe(true);
    expect(isProgrammeBriefingFresh(new Date("2026-08-14T00:00:00.000Z"), "same", "same", now)).toBe(false);
    expect(isProgrammeBriefingFresh(new Date("2026-08-20T00:00:00.000Z"), "old", "new", now)).toBe(false);
  });
});
