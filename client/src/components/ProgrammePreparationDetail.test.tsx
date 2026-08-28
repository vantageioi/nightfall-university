import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProgrammePreparationDetail } from "./ProgrammePreparationDetail";

const programme = { programmeId: "g-architecture", programmeName: "Architecture", officialName: "Example University", city: "Berlin", programmeLanguage: "English", admissionSemester: "Winter", admissionMode: "Restricted", qualificationNote: null, studentLanguageContext: "English B2 — student provided", sourceUrl: "https://example.edu/programme", isPreparationStarted: false };

describe("ProgrammePreparationDetail", () => {
  it("separates a saved option from a student-started preparation path and keeps official-source review primary", () => {
    const markup = renderToStaticMarkup(<ProgrammePreparationDetail language="en" programme={programme} documents={[]} documentLinks={[]} activity={[]} onBack={() => {}} onStartPreparation={() => {}} onOpenDocuments={() => {}} onOpenConsultant={() => {}} />);
    expect(markup).toContain("SAVED OPTION");
    expect(markup).toContain("Review language requirement");
    expect(markup).toContain("Start preparing this application");
    expect(markup).toContain("It does not submit an application");
    expect(markup).toContain("Open official programme source");
  });

  it("shows the preparation path only when the student explicitly started it", () => {
    const markup = renderToStaticMarkup(<ProgrammePreparationDetail language="en" programme={{ ...programme, isPreparationStarted: true }} documents={[]} documentLinks={[]} activity={[{ id: 1, eventType: "application_preparation_started", createdAt: new Date("2026-08-27") }]} onBack={() => {}} onStartPreparation={() => {}} onOpenDocuments={() => {}} onOpenConsultant={() => {}} />);
    expect(markup).toContain("PREPARING");
    expect(markup).toContain("Preparation path started");
    expect(markup).not.toContain("Start preparing this application");
  });
});
