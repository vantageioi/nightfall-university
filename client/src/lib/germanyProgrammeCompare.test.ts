import { describe, expect, it } from "vitest";
import { toggleGermanyProgrammeComparison } from "./germanyProgrammeCompare";

describe("Germany programme comparison selection", () => {
  it("adds and removes saved programme identifiers", () => {
    expect(toggleGermanyProgrammeComparison(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleGermanyProgrammeComparison(["a", "b"], "a")).toEqual(["b"]);
  });

  it("holds a maximum of three programme selections", () => {
    expect(toggleGermanyProgrammeComparison(["a", "b", "c"], "d")).toEqual(["a", "b", "c"]);
  });
});
