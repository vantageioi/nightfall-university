import { createHash } from "node:crypto";
import { z } from "zod";

export const programmeBriefingSchema = z.object({
  keyFitSignals: z.array(z.string().trim().min(1).max(240)).min(1).max(4),
  languageRequirements: z.string().trim().min(1).max(520),
  costContext: z.string().trim().min(1).max(520),
  admissionContext: z.string().trim().min(1).max(620),
  nextResearchStep: z.string().trim().min(1).max(360),
  reviewNote: z.string().trim().min(1).max(360),
});

export type ProgrammeBriefing = z.infer<typeof programmeBriefingSchema>;

export const programmeBriefingJsonSchema = {
  type: "object",
  properties: {
    keyFitSignals: { type: "array", minItems: 1, maxItems: 4, items: { type: "string" } },
    languageRequirements: { type: "string" },
    costContext: { type: "string" },
    admissionContext: { type: "string" },
    nextResearchStep: { type: "string" },
    reviewNote: { type: "string" },
  },
  required: ["keyFitSignals", "languageRequirements", "costContext", "admissionContext", "nextResearchStep", "reviewNote"],
  additionalProperties: false,
} as const;

export function programmeBriefingSourceHash(source: Record<string, unknown>, language: "en" | "ar") {
  return createHash("sha256").update(JSON.stringify({ language, source })).digest("hex");
}

export function isProgrammeBriefingFresh(generatedAt: Date, storedHash: string, currentHash: string, now = new Date()) {
  return storedHash === currentHash && now.getTime() - generatedAt.getTime() < 7 * 24 * 60 * 60 * 1000;
}

export function parseProgrammeBriefing(value: string) {
  try {
    return programmeBriefingSchema.safeParse(JSON.parse(value));
  } catch {
    return programmeBriefingSchema.safeParse(null);
  }
}
