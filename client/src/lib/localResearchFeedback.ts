export const FIRST_OPTION_REASONS_STORAGE_KEY = "nightfall-first-option-reasons";

export const localResearchFeedbackReasons = ["city", "cost", "programme", "language", "difficulty", "other"] as const;
export type LocalResearchFeedbackReason = (typeof localResearchFeedbackReasons)[number];

function isLocalResearchFeedbackReason(value: unknown): value is LocalResearchFeedbackReason {
  return typeof value === "string" && (localResearchFeedbackReasons as readonly string[]).includes(value);
}

export function readLocalResearchFeedback(): LocalResearchFeedbackReason[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const stored = JSON.parse(sessionStorage.getItem(FIRST_OPTION_REASONS_STORAGE_KEY) || "{}") as Record<string, unknown>;
    return [...new Set(Object.values(stored).filter(isLocalResearchFeedbackReason))].slice(0, 3);
  } catch {
    return [];
  }
}

export function writeLocalResearchFeedback(programmeId: string, reason: LocalResearchFeedbackReason) {
  if (typeof sessionStorage === "undefined") return;
  try {
    const stored = JSON.parse(sessionStorage.getItem(FIRST_OPTION_REASONS_STORAGE_KEY) || "{}") as Record<string, unknown>;
    sessionStorage.setItem(FIRST_OPTION_REASONS_STORAGE_KEY, JSON.stringify({ ...stored, [programmeId]: reason }));
  } catch {
    // Local feedback is optional and intentionally never becomes an automatic profile edit.
  }
}
