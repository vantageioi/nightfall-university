import { z } from "zod";

export const universityDraftSchema = z.object({
  subject: z.string().min(2).max(998),
  body: z.string().min(20).max(8000),
  category: z.enum(["general", "document_request", "interview", "decision", "next_step", "needs_review"]),
  reviewNote: z.string().min(20).max(500),
});

export const universityDraftJsonSchema = {
  type: "object",
  properties: {
    subject: { type: "string" },
    body: { type: "string" },
    category: { type: "string", enum: ["general", "document_request", "interview", "decision", "next_step", "needs_review"] },
    reviewNote: { type: "string" },
  },
  required: ["subject", "body", "category", "reviewNote"],
  additionalProperties: false,
} as const;

export function universityDraftSystemPrompt(language: "en" | "ar") {
  return `You prepare a respectful university follow-up email for a student. This is a private draft only; the student must edit, approve, and explicitly send it from their own inbox. Do NOT send email, claim an application was submitted, invent an attachment, invent personal details, determine eligibility or admissions chances, promise outcomes, or make commitments. Use only the supplied student, university, and contact context. If a fact is missing, leave it out rather than guessing. Keep the tone concise, professional, and warm. Write in ${language === "ar" ? "clear Shami Arabic" : "clear English"}. The reviewNote must tell the student to verify the recipient, facts, and tone before saving or sending.`;
}

export const universityReplyClassificationSchema = z.object({
  category: z.enum(["general", "document_request", "interview", "decision", "next_step", "needs_review"]),
  nextStep: z.string().min(10).max(500),
  reviewNote: z.string().min(20).max(500),
});

export const universityReplyClassificationJsonSchema = {
  type: "object",
  properties: { category: { type: "string", enum: ["general", "document_request", "interview", "decision", "next_step", "needs_review"] }, nextStep: { type: "string" }, reviewNote: { type: "string" } },
  required: ["category", "nextStep", "reviewNote"], additionalProperties: false,
} as const;

export function universityReplyClassificationPrompt(language: "en" | "ar") {
  return `You classify a university email reply for a student’s private review queue. Do NOT send a response, decide eligibility, predict admission chances, interpret legal consequences, or mark work as complete. Identify only the most likely practical category from the supplied reply. The reviewNote must say that the student should read the original email and confirm every action, deadline, and attachment request. Write in ${language === "ar" ? "clear Shami Arabic" : "clear English"}.`;
}
