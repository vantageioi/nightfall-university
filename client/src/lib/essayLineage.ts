export type EssayVersion = { id: string; title: string; body: string; evidence: string; createdAt: string };
export const ESSAY_LINEAGE_KEY = "nightfall.essay-lineage.v1";

export function loadEssayLineage(raw: string | null): EssayVersion[] {
  if (!raw) return [];
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.filter((item) => typeof item?.body === "string" && typeof item?.title === "string") : []; } catch { return []; }
}

export function createEssayVersion(input: Omit<EssayVersion, "id" | "createdAt">): EssayVersion {
  return { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
}
