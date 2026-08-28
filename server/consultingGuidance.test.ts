import { describe, expect, it } from "vitest";
import { consultingMessageSchema, consultingSystemPrompt } from "./consultingGuidance";

describe("Nightfall consulting guidance boundary", () => {
  it("accepts only bounded student chat messages and makes review limits explicit", () => {
    expect(consultingMessageSchema.safeParse({ role: "user", content: "What should I verify for my saved programme?" }).success).toBe(true);
    const prompt = consultingSystemPrompt("en");
    expect(prompt).toContain("Do NOT determine eligibility");
    expect(prompt).toContain("Do NOT submit applications");
    expect(prompt).toContain("official source or contact");
  });
});
