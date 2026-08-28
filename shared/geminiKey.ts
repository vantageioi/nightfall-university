import { z } from "zod";

/**
 * Google Gemini supports legacy AIza traffic keys and newer AQ authorization
 * keys. This validates the credential family only; provider-side authorization
 * is still verified by Gemini when a real request is made.
 */
export const geminiApiKeySchema = z
  .string()
  .trim()
  .min(10)
  .max(200)
  .refine((value) => value.startsWith("AIza") || value.startsWith("AQ."), {
    message: "Use a Gemini API key that starts with AIza or AQ.",
  });
