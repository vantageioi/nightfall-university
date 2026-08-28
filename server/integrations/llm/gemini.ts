import axios from "axios";
import { getStudentGeminiApiKey } from "../../db";
import type { LLMOptions, LLMResponse, LlmProvider } from "./types";

export type GeminiAvailability = { available: boolean; source: "student_key" | "platform_key" | "unavailable" };

export class GeminiUnavailableError extends Error {
  code = "GEMINI_UNAVAILABLE" as const;
  constructor() {
    super("Gemini is not available for this request. Add your own Gemini API key in Settings, or ask the Nightfall operator to configure the platform provider.");
    this.name = "GeminiUnavailableError";
  }
}

async function resolveApiKey(userId?: number): Promise<string> {
  if (userId) {
    const ownKey = await getStudentGeminiApiKey(userId).catch(() => null);
    if (ownKey) return ownKey;
  }
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
}

export async function getGeminiAvailability(userId?: number): Promise<GeminiAvailability> {
  if (userId && await getStudentGeminiApiKey(userId).catch(() => null)) return { available: true, source: "student_key" };
  if (process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim()) return { available: true, source: "platform_key" };
  return { available: false, source: "unavailable" };
}

export class GeminiLlmProvider implements LlmProvider {
  async complete(options: LLMOptions): Promise<LLMResponse> {
    const apiKey = await resolveApiKey(options.userId);
    if (!apiKey) throw new GeminiUnavailableError();

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          contents: options.messages.map((message) => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: typeof message.content === "string" ? message.content : JSON.stringify(message.content) }],
          })),
          generationConfig: {
            maxOutputTokens: options.max_tokens || 1000,
            responseMimeType: options.response_format?.type === "json_schema" ? "application/json" : "text/plain",
          },
        },
      );
      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== "string" || !text.trim()) throw new Error("Gemini returned no usable content for this request.");
      return { choices: [{ message: { content: text } }] };
    } catch (error) {
      console.error("LLM invocation error:", error instanceof Error ? error.message : "unknown provider error");
      throw new Error("Gemini could not complete this request right now. Please try again, or check the key in Settings.");
    }
  }
}
