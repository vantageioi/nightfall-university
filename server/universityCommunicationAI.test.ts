import { describe, expect, it } from "vitest";
import { universityDraftSchema, universityDraftSystemPrompt, universityReplyClassificationPrompt, universityReplyClassificationSchema } from "./universityCommunicationAI";

describe("university follow-up AI guardrails", () => {
  it("requires a reviewable structured draft and keeps the student approval boundary in the system prompt", () => {
    expect(universityDraftSchema.safeParse({ subject: "Application question", body: "Hello admissions team, I am writing with a short question about the programme timeline.", category: "general", reviewNote: "Verify the recipient, facts, and tone before saving or sending." }).success).toBe(true);
    const prompt = universityDraftSystemPrompt("en");
    expect(prompt).toContain("must edit, approve, and explicitly send");
    expect(prompt).toContain("Do NOT send email");
    expect(prompt).toContain("determine eligibility or admissions chances");
  });

  it("keeps imported university replies in a student review queue rather than resolving or replying automatically", () => {
    expect(universityReplyClassificationSchema.safeParse({ category: "document_request", nextStep: "Review the requested documents and compare them with your uploaded files.", reviewNote: "Read the original email and confirm every action, deadline, and attachment request before responding." }).success).toBe(true);
    expect(universityReplyClassificationPrompt("en")).toContain("Do NOT send a response");
    expect(universityReplyClassificationPrompt("en")).toContain("should read the original email");
  });
});
