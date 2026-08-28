import type { WarmInterviewDraft } from "./consultantOnboarding";

export const PENDING_CONSULTANT_INTERVIEW_KEY = "nightfall.pending-consultant-interview";

export type PendingConsultantInterview = { draft: WarmInterviewDraft; language: "en" | "ar"; savedAt: number };

export function serializePendingConsultantInterview(draft: WarmInterviewDraft, language: "en" | "ar") {
  return JSON.stringify({ draft, language, savedAt: Date.now() } satisfies PendingConsultantInterview);
}

export function parsePendingConsultantInterview(value: string | null): PendingConsultantInterview | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<PendingConsultantInterview>;
    if (!parsed.draft || (parsed.language !== "en" && parsed.language !== "ar") || typeof parsed.savedAt !== "number") return null;
    return parsed as PendingConsultantInterview;
  } catch { return null; }
}

export function readPendingConsultantInterview() {
  if (typeof window === "undefined") return null;
  return parsePendingConsultantInterview(window.sessionStorage.getItem(PENDING_CONSULTANT_INTERVIEW_KEY));
}

export function storePendingConsultantInterview(draft: WarmInterviewDraft, language: "en" | "ar") {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_CONSULTANT_INTERVIEW_KEY, serializePendingConsultantInterview(draft, language));
}

export function clearPendingConsultantInterview() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_CONSULTANT_INTERVIEW_KEY);
}
