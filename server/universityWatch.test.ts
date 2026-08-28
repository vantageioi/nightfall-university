import { describe, expect, it } from "vitest";
import { hashOfficialSourceText, normalizeOfficialSourceText } from "./universityWatch";

describe("official-page cache normalization", () => {
  it("normalizes incidental whitespace before hashing a source baseline", () => {
    const compact = normalizeOfficialSourceText("Deadline  31 January\nCEFR B2");
    const spaced = normalizeOfficialSourceText("Deadline\u00a0 31 January   CEFR B2");
    expect(compact).toBe("Deadline 31 January CEFR B2");
    expect(hashOfficialSourceText(compact)).toBe(hashOfficialSourceText(spaced));
  });

  it("changes the baseline hash when an official requirement actually changes", () => {
    const current = hashOfficialSourceText(normalizeOfficialSourceText("English CEFR B2 required"));
    const revised = hashOfficialSourceText(normalizeOfficialSourceText("English CEFR C1 required"));
    expect(current).not.toBe(revised);
  });
});
