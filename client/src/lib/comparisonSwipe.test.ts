import { describe, expect, it } from "vitest";
import { comparisonSwipeDelta, nextComparisonIndex } from "./comparisonSwipe";

describe("mobile comparison swipe navigation", () => {
  it("moves to the next choice on a left swipe in English and a right swipe in Arabic", () => {
    expect(comparisonSwipeDelta(-64, false)).toBe(1);
    expect(comparisonSwipeDelta(64, true)).toBe(1);
  });

  it("moves to the previous choice in the opposite direction and ignores small drags", () => {
    expect(comparisonSwipeDelta(64, false)).toBe(-1);
    expect(comparisonSwipeDelta(-64, true)).toBe(-1);
    expect(comparisonSwipeDelta(24, false)).toBe(0);
  });

  it("cycles safely across the available comparison cards", () => {
    expect(nextComparisonIndex(0, 2, 1)).toBe(1);
    expect(nextComparisonIndex(1, 2, 1)).toBe(0);
    expect(nextComparisonIndex(0, 2, -1)).toBe(1);
  });
});
