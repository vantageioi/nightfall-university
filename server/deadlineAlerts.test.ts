import { describe, expect, it } from "vitest";
import { getDeadlineAlertKey } from "./db";

describe("deadline alert key", () => {
  it("is stable for a retried scheduler run targeting the same deadline window", () => {
    const firstRun = getDeadlineAlertKey(7, 42, "2027-01-10", 3);
    const retry = getDeadlineAlertKey(7, 42, "2027-01-10", 3);
    expect(retry).toBe(firstRun);
  });

  it("changes when the student, university, deadline, or reminder window changes", () => {
    const base = getDeadlineAlertKey(7, 42, "2027-01-10", 3);
    expect(getDeadlineAlertKey(8, 42, "2027-01-10", 3)).not.toBe(base);
    expect(getDeadlineAlertKey(7, 43, "2027-01-10", 3)).not.toBe(base);
    expect(getDeadlineAlertKey(7, 42, "2027-01-11", 3)).not.toBe(base);
    expect(getDeadlineAlertKey(7, 42, "2027-01-10", 1)).not.toBe(base);
  });
});
