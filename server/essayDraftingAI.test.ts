import { describe, expect, it } from "vitest";
import { essayDraftInputSchema, essayDraftSchema, essayDraftSystemPrompt } from "./essayDraftingAI";

describe("essay drafting AI guardrails", () => {
  it("accepts a bounded essay draft request scoped to a single programme and prompt", () => {
    expect(
      essayDraftInputSchema.safeParse({
        language: "en",
        university: "Technical University of Berlin",
        programme: "B.Sc. Architecture",
        prompt: "Why do you want to study architecture at our university?",
        wordLimit: 500,
      }).success,
    ).toBe(true);
  });

  it("requires a reviewable structured draft and keeps the personalize-before-submitting boundary in the system prompt", () => {
    expect(
      essayDraftSchema.safeParse({
        title: "Motivation for Architecture",
        body: "I am drawn to architecture because it sits between engineering and art, and this programme's studio-first curriculum matches how I want to learn.",
        wordCount: 24,
        category: "motivation_letter",
        reviewNote: "This is a starting draft only. Personalize it with your own real details before submitting anything.",
      }).success,
    ).toBe(true);
    const prompt = essayDraftSystemPrompt("en");
    expect(prompt).toContain("first draft only");
    expect(prompt).toContain("Do NOT invent specific personal stories");
    expect(prompt).toContain("Do NOT claim the essay is finished");
    expect(prompt).toContain("personalize it with their own real details before submitting");
  });

  it("falls back to a labeled outline instead of inventing content when context is thin", () => {
    const prompt = essayDraftSystemPrompt("en");
    expect(prompt).toContain("write a clearly labeled structural outline instead of inventing content");
    expect(prompt).toContain('set category to "needs_review"');
  });
});
