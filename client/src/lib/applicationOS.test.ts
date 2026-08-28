import { describe, expect, it } from "vitest";
import { buildCalendarEvent, emptyApplicationOsState, loadApplicationOsState } from "./applicationOS";

describe("application OS local-first state", () => {
  it("falls back safely when local data is missing or malformed", () => {
    expect(loadApplicationOsState(null)).toEqual(emptyApplicationOsState);
    expect(loadApplicationOsState("not json")).toEqual(emptyApplicationOsState);
  });

  it("creates a date-only calendar handoff without claiming a timezone", () => {
    const calendar = buildCalendarEvent("Review deadline", "2026-09-08", "Confirm on the official source.");
    expect(calendar).toContain("DTSTART;VALUE=DATE:20260908");
    expect(calendar).toContain("SUMMARY:Review deadline");
  });
});
