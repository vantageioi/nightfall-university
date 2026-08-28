import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProgrammeCalendarRowActions } from "./ProgrammeCalendarRowActions";

describe("ProgrammeCalendarRowActions", () => {
  const props = { date: new Date("2026-09-02T00:00:00.000Z"), officialEvidenceUrl: "https://example.edu/programme", isRemoving: false, onSave: vi.fn(), onRemove: vi.fn() };

  it("renders English programme date edit, official-source, and remove affordances", () => {
    const html = renderToStaticMarkup(<ProgrammeCalendarRowActions {...props} isArabic={false} />);
    expect(html).toContain('aria-label="Edit date"');
    expect(html).toContain('href="https://example.edu/programme"');
    expect(html).toContain(">Source<");
    expect(html).toContain(">Remove<");
  });

  it("renders Arabic programme date edit, official-source, and remove affordances", () => {
    const html = renderToStaticMarkup(<ProgrammeCalendarRowActions {...props} isArabic />);
    expect(html).toContain('aria-label="عدّل الموعد"');
    expect(html).toContain(">المصدر<");
    expect(html).toContain(">احذف<");
  });
});
