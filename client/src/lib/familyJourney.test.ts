import { describe, expect, it } from "vitest";
import { familyJourneySummary } from "./familyJourney";

describe("family Journey summary", () => {
  it("shows the earliest outstanding student-owned requirement before a reminder and never derives a percentage", () => {
    const summary = familyJourneySummary([{ id: 1, universityId: 1, title: "Review language requirement", dueLabel: "Before the deadline", completed: false }], [{ id: 1, title: "Deadline", body: null, dueLabel: "18 Oct", completed: false }]);
    expect(summary).toEqual({ activeRequirementCount: 1, upcomingDateCount: 1, next: { kind: "requirement", title: "Review language requirement", detail: "Before the deadline" } });
  });
});
