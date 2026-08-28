import { describe, expect, it } from "vitest";
import { documentRequirementLinkInput } from "./routers";

describe("document requirement link input", () => {
  it("accepts only a positive document identifier, a bounded saved programme identifier, and a displayed official requirement key", () => {
    expect(documentRequirementLinkInput.safeParse({ documentId: 7, programmeId: "daad-123", requirementKey: "qualification-route" }).success).toBe(true);
    expect(documentRequirementLinkInput.safeParse({ documentId: 7, programmeId: "daad-123", requirementKey: "uploaded-and-approved" }).success).toBe(false);
  });

  it("does not provide any input that could mark a document verified, submitted, or sufficient", () => {
    const fields = Object.keys(documentRequirementLinkInput.shape);
    expect(fields).toEqual(["documentId", "programmeId", "requirementKey"]);
    expect(fields).not.toContain("verified");
    expect(fields).not.toContain("submitted");
  });
});
