import { describe, expect, it } from "vitest";
import { geminiApiKeySchema } from "@shared/geminiKey";

describe("geminiApiKeySchema", () => {
  it("accepts both documented Gemini credential families", () => {
    expect(geminiApiKeySchema.safeParse("AIzaSyExampleKeyWithEnoughLength123").success).toBe(true);
    expect(geminiApiKeySchema.safeParse("AQ.example-auth-key-with-enough-length").success).toBe(true);
  });

  it("rejects unrelated or malformed secret formats", () => {
    expect(geminiApiKeySchema.safeParse("AQwithout-the-required-dot").success).toBe(false);
    expect(geminiApiKeySchema.safeParse("sk-unrelated-provider-token").success).toBe(false);
  });
});
