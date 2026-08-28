import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ getStudentGeminiApiKey: vi.fn().mockResolvedValue(null) }));

import { GeminiLlmProvider, GeminiUnavailableError, getGeminiAvailability } from "./gemini";

describe("GeminiLlmProvider", () => {
  it("fails closed rather than returning a mock completion when no student or platform key exists", async () => {
    const previousGemini = process.env.GEMINI_API_KEY;
    const previousGoogle = process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    await expect(new GeminiLlmProvider().complete({ userId: 44, messages: [{ role: "user", content: "Research nanotechnology." }] })).rejects.toBeInstanceOf(GeminiUnavailableError);
    await expect(getGeminiAvailability(44)).resolves.toEqual({ available: false, source: "unavailable" });
    if (previousGemini === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousGemini;
    if (previousGoogle === undefined) delete process.env.GOOGLE_API_KEY;
    else process.env.GOOGLE_API_KEY = previousGoogle;
  });
});
