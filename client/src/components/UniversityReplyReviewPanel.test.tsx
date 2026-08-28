import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UniversityReplyReviewPanel } from "./UniversityReplyReviewPanel";

describe("UniversityReplyReviewPanel", () => {
  it("keeps the source message primary and makes the AI interpretation secondary", () => {
    const markup = renderToStaticMarkup(<UniversityReplyReviewPanel language="en" inboxConnected replies={[{ id: 1, direction: "inbound", university: "Example University", subject: "Additional document", body: "Please provide an updated transcript.", category: "document_request", aiNextStep: "Review your transcript before responding.", aiReviewNote: "This appears to be a document request.", receivedAt: new Date("2026-08-27") }]} isSyncing={false} onSync={() => {}} />);
    expect(markup.indexOf("SOURCE MESSAGE")).toBeLessThan(markup.indexOf("NIGHTFALL’S READING"));
    expect(markup).toContain("Please provide an updated transcript.");
    expect(markup).toContain("nothing replies automatically");
  });
});
