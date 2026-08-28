import { describe, expect, it } from "vitest";
import { isProgrammeCalendarDate, programmeDeadlineMonth, type CalendarDate } from "./calendarProgrammeDeadline";

describe("programme calendar deadline helpers", () => {
  const programmeDate: CalendarDate = { university: "Computer science", date: new Date("2026-09-02T00:00:00.000Z"), label: "Programme deadline", programmeId: "g2107045", officialEvidenceUrl: "https://example.edu/official" };
  const universityDate: CalendarDate = { university: "TU Berlin", date: new Date("2027-01-20T00:00:00.000Z"), label: "Application deadline" };

  it("identifies only programme handoff rows as eligible for inline source, edit, and remove actions", () => {
    expect(isProgrammeCalendarDate(programmeDate)).toBe(true);
    expect(isProgrammeCalendarDate(universityDate)).toBe(false);
  });

  it("focuses the Calendar on the first student-confirmed programme deadline when available", () => {
    expect(programmeDeadlineMonth([{ deadlineAt: new Date("2026-09-02T00:00:00.000Z") }])?.toISOString()).toBe("2026-09-02T00:00:00.000Z");
    expect(programmeDeadlineMonth([])).toBeNull();
  });
});
