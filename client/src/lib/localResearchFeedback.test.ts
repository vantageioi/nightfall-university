import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FIRST_OPTION_REASONS_STORAGE_KEY, readLocalResearchFeedback, writeLocalResearchFeedback } from "./localResearchFeedback";

let entries: Record<string, string>;

beforeEach(() => {
  entries = {};
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => entries[key] ?? null,
    setItem: (key: string, value: string) => { entries[key] = value; },
    clear: () => { entries = {}; },
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("local First Research Set feedback", () => {
  it("keeps individual rejection reasons in browser storage and returns distinct valid reasons only", () => {
    writeLocalResearchFeedback("programme-a", "city");
    writeLocalResearchFeedback("programme-b", "city");
    writeLocalResearchFeedback("programme-c", "cost");
    expect(readLocalResearchFeedback()).toEqual(["city", "cost"]);
    expect(sessionStorage.getItem(FIRST_OPTION_REASONS_STORAGE_KEY)).toContain("programme-a");
  });

  it("discards malformed and unknown locally stored values rather than treating them as consultation context", () => {
    sessionStorage.setItem(FIRST_OPTION_REASONS_STORAGE_KEY, JSON.stringify({ one: "city", two: "untrusted-value", three: 7 }));
    expect(readLocalResearchFeedback()).toEqual(["city"]);
  });
});
