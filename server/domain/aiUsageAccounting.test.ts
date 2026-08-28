import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeLLM, recordAiCall } = vi.hoisted(() => ({ invokeLLM: vi.fn(), recordAiCall: vi.fn() }));

vi.mock("../integrations/llm", () => ({ invokeLLM }));
vi.mock("./planLimits", () => ({ assertAiWithinPlan: vi.fn().mockResolvedValue(undefined), recordAiCall }));
vi.mock("../db", () => ({ getStudentFitProfile: vi.fn().mockResolvedValue({ studyDirection: "Nanotechnology" }) }));

import { prepareEssayDraft } from "./essayDraftingService";

describe("AI usage accounting", () => {
  beforeEach(() => { invokeLLM.mockReset(); recordAiCall.mockReset(); });

  it("does not count an essay request when Gemini fails before producing a result", async () => {
    invokeLLM.mockRejectedValue(new Error("Gemini unavailable"));
    await expect(prepareEssayDraft(7, { language: "en", university: "Example University", programme: "Nanotechnology", prompt: "Why this programme?" })).rejects.toThrow("Gemini unavailable");
    expect(recordAiCall).not.toHaveBeenCalled();
  });

  it("counts a validated essay only after Gemini produced a usable draft", async () => {
    invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ title: "Motivation", body: "I am interested in learning through this programme and will develop the details in my own voice.", wordCount: 17, category: "motivation_letter", reviewNote: "This is a private starting draft only; personalize it with your own real details before use." }) } }] });
    await prepareEssayDraft(7, { language: "en", university: "Example University", programme: "Nanotechnology", prompt: "Why this programme?" });
    expect(recordAiCall).toHaveBeenCalledTimes(1);
  });
});
