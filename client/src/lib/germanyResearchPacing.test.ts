import { describe, expect, it } from "vitest";
import { remainingGermanyResearchResultCount, visibleGermanyResearchResults } from "./germanyResearchPacing";

describe("Germany research pacing", () => {
  const records = Array.from({ length: 12 }, (_, index) => `programme-${index + 1}`);

  it("shows a calm initial set before the student opts into the full list", () => {
    expect(visibleGermanyResearchResults(records, false)).toEqual(records.slice(0, 6));
    expect(remainingGermanyResearchResultCount(records.length)).toBe(6);
  });

  it("returns the full result set only after the student asks to see more", () => {
    expect(visibleGermanyResearchResults(records, true)).toEqual(records);
    expect(remainingGermanyResearchResultCount(4)).toBe(0);
  });
});
