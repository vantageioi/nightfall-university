import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DocumentsWorkspace } from "./DocumentsWorkspace";

describe("DocumentsWorkspace", () => {
  it("presents private document links as student review context, not as proof of a met requirement", () => {
    const markup = renderToStaticMarkup(<DocumentsWorkspace language="en" documents={[{ id: 8, documentType: "Transcript", fileName: "grades.pdf", mimeType: "application/pdf", extractionStatus: "complete", createdAt: new Date("2026-08-27") }]} programmes={[{ programmeId: "de-1", programmeName: "Biotechnology", officialName: "Example University", city: "Berlin" }]} links={[{ id: 4, documentId: 8, programmeId: "de-1", requirementKey: "qualification-route", createdAt: new Date("2026-08-27") }]} storageConfigured={false} isLinking={false} isRemoving={false} onBack={vi.fn()} onOpenProgramme={vi.fn()} onLink={vi.fn()} onRemoveLink={vi.fn()} onUploadTranscript={vi.fn()} />);
    expect(markup).toContain("Linked by you for review");
    expect(markup).toContain("does not prove a document is accepted or complete");
    expect(markup).not.toContain("Meets requirement");
    expect(markup).not.toContain("Submit document");
  });
});
