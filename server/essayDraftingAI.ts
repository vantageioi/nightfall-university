import { z } from "zod";

export const essayDraftInputSchema = z.object({
  language: z.enum(["en", "ar"]),
  university: z.string().trim().min(1).max(200),
  programme: z.string().trim().min(1).max(200),
  prompt: z.string().trim().min(5).max(2000),
  wordLimit: z.number().int().positive().max(2000).optional(),
  studentNotes: z.string().trim().max(4000).optional(),
});

export const essayDraftSchema = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(50).max(12000),
  wordCount: z.number().int().nonnegative(),
  category: z.enum(["personal_statement", "supplemental", "motivation_letter", "short_answer", "needs_review"]),
  reviewNote: z.string().min(20).max(500),
});

export const essayDraftJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    body: { type: "string" },
    wordCount: { type: "number" },
    category: { type: "string", enum: ["personal_statement", "supplemental", "motivation_letter", "short_answer", "needs_review"] },
    reviewNote: { type: "string" },
  },
  required: ["title", "body", "wordCount", "category", "reviewNote"],
  additionalProperties: false,
} as const;

export function essayDraftSystemPrompt(language: "en" | "ar") {
  return `You prepare a private first-draft application essay for a student, grounded only in their own Nightfall fit profile (study direction, level, grades, nationality, language comfort, budget, funding route, priorities) and the specific essay prompt and programme context supplied. This is a first draft only; the student must read, personalize, fact-check, and rewrite it in their own voice before using it anywhere. Do NOT invent specific personal stories, achievements, names, dates, awards, or experiences that were not supplied. Do NOT claim the essay is finished, final, or ready to submit. Do NOT determine eligibility, admission chances, or promise outcomes. If the supplied context is too thin to write a grounded draft, write a clearly labeled structural outline instead of inventing content, and set category to "needs_review". Keep the tone genuine and age-appropriate for a university applicant, matching the requested word limit as closely as possible. Write in ${language === "ar" ? "clear Shami Arabic" : "clear English"}. The reviewNote must tell the student this is a starting draft only and that they must personalize it with their own real details before submitting anything.`;
}
