import { describe, expect, it } from "vitest";
import { moveGraduationYearAtDigit } from "./graduationLock";

describe("graduation combination lock", () => {
  it("carries the tens wheel when the final digit rolls from 9 to 0", () => {
    expect(moveGraduationYearAtDigit("2019", 3, 1)).toBe("2020");
  });

  it("borrows correctly when the final digit rolls back from 0", () => {
    expect(moveGraduationYearAtDigit("2020", 3, -1)).toBe("2019");
  });

  it("wraps safely inside the supported graduation-year range", () => {
    expect(moveGraduationYearAtDigit("2038", 3, 1)).toBe("2019");
    expect(moveGraduationYearAtDigit("2019", 3, -1)).toBe("2038");
  });
});
