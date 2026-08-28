import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { savedUniversities, universityRequirementAlerts, universityRequirementWatches, universitySourceCaches, universityWatchPreferences } from "../drizzle/schema";
import { getDb } from "./db";

export type UniversityWatchPreferenceInput = { enabled: boolean; preferredHourUtc: number };
const defaultPreferences: UniversityWatchPreferenceInput = { enabled: false, preferredHourUtc: 10 };

export function normalizeOfficialSourceText(value: string) {
  return value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim().slice(0, 28_000);
}

export function hashOfficialSourceText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function upsertUniversitySourceCache(input: { sourceUrl: string; sourceLabel: string; rawText: string; summary?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const normalizedText = normalizeOfficialSourceText(input.rawText);
  const contentHash = hashOfficialSourceText(normalizedText);
  const existing = (await db.select().from(universitySourceCaches).where(eq(universitySourceCaches.sourceUrl, input.sourceUrl)).limit(1))[0] ?? null;
  const changed = Boolean(existing && existing.contentHash !== contentHash);
  const now = new Date();
  if (existing?.contentHash === contentHash) {
    await db.update(universitySourceCaches).set({ lastFetchedAt: now }).where(eq(universitySourceCaches.id, existing.id));
    return { cache: { ...existing, lastFetchedAt: now }, changed: false, previousText: existing.normalizedText };
  }
  const values = { sourceUrl: input.sourceUrl, sourceLabel: input.sourceLabel, contentHash, normalizedText, summary: input.summary ?? existing?.summary ?? null, lastFetchedAt: now, lastChangedAt: now };
  await db.insert(universitySourceCaches).values(values).onConflictDoUpdate({ target: universitySourceCaches.sourceUrl, set: values });
  const cache = (await db.select().from(universitySourceCaches).where(eq(universitySourceCaches.sourceUrl, input.sourceUrl)).limit(1))[0];
  return { cache, changed, previousText: existing?.normalizedText ?? null };
}

export async function setUniversitySourceCacheSummary(sourceUrl: string, summary: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(universitySourceCaches).set({ summary }).where(eq(universitySourceCaches.sourceUrl, sourceUrl));
  return (await db.select().from(universitySourceCaches).where(eq(universitySourceCaches.sourceUrl, sourceUrl)).limit(1))[0] ?? null;
}

export async function listUniversityRequirementAlerts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(universityRequirementAlerts).where(eq(universityRequirementAlerts.userId, userId)).orderBy(desc(universityRequirementAlerts.createdAt)).limit(24);
}

export async function markUniversityRequirementAlertRead(userId: number, alertId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(universityRequirementAlerts).set({ read: true }).where(and(eq(universityRequirementAlerts.id, alertId), eq(universityRequirementAlerts.userId, userId)));
}

export async function listUniversityRequirementWatches(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(universityRequirementWatches).where(eq(universityRequirementWatches.userId, userId));
}

export async function listUniversityWatchSourceCaches(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const watches = await listUniversityRequirementWatches(userId);
  const caches = await Promise.all(watches.map(async (watch) => (await db.select().from(universitySourceCaches).where(eq(universitySourceCaches.sourceUrl, watch.sourceUrl)).limit(1))[0] ?? null));
  return caches.filter((cache): cache is NonNullable<typeof cache> => Boolean(cache));
}

export async function saveUniversityRequirementWatch(userId: number, input: { universityId: number; enabled: boolean; sourceUrl?: string; sourceLabel?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const university = (await db.select().from(savedUniversities).where(and(eq(savedUniversities.id, input.universityId), eq(savedUniversities.userId, userId))).limit(1))[0];
  if (!university) throw new Error("Saved university not found.");
  const sourceUrl = university.sourceUrl || input.sourceUrl;
  if (!sourceUrl) throw new Error("This university does not have an official programme source to watch yet.");
  const sourceLabel = input.sourceLabel || `${university.university} · ${university.program}`;
  if (!university.sourceUrl && input.sourceUrl) await db.update(savedUniversities).set({ sourceUrl: input.sourceUrl }).where(eq(savedUniversities.id, university.id));
  await db.insert(universityRequirementWatches).values({ userId, universityId: university.id, sourceUrl, sourceLabel, enabled: input.enabled }).onConflictDoUpdate({ target: [universityRequirementWatches.userId, universityRequirementWatches.universityId], set: { sourceUrl, sourceLabel, enabled: input.enabled } });
  return (await db.select().from(universityRequirementWatches).where(and(eq(universityRequirementWatches.userId, userId), eq(universityRequirementWatches.universityId, university.id))).limit(1))[0] ?? null;
}

export async function getUniversityWatchPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;
  return (await db.select().from(universityWatchPreferences).where(eq(universityWatchPreferences.userId, userId)).limit(1))[0] ?? null;
}

export async function ensureUniversityWatchPreferences(userId: number) {
  const existing = await getUniversityWatchPreferences(userId);
  if (existing) return existing;
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(universityWatchPreferences).values({ userId, ...defaultPreferences });
  return getUniversityWatchPreferences(userId);
}

export async function saveUniversityWatchPreferences(userId: number, input: UniversityWatchPreferenceInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(universityWatchPreferences).values({ userId, ...input }).onConflictDoUpdate({ target: universityWatchPreferences.userId, set: input });
  return getUniversityWatchPreferences(userId);
}

export async function setUniversityWatchScheduleTaskUid(userId: number, scheduleCronTaskUid: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await ensureUniversityWatchPreferences(userId);
  await db.update(universityWatchPreferences).set({ scheduleCronTaskUid }).where(eq(universityWatchPreferences.userId, userId));
  return getUniversityWatchPreferences(userId);
}

export async function getUniversityWatchPreferencesByScheduleTaskUid(scheduleCronTaskUid: string) {
  const db = await getDb();
  if (!db) return null;
  return (await db.select().from(universityWatchPreferences).where(eq(universityWatchPreferences.scheduleCronTaskUid, scheduleCronTaskUid)).limit(1))[0] ?? null;
}

export async function recordUniversityWatchObservation(userId: number, watchId: number, contentHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const watch = (await db.select().from(universityRequirementWatches).where(and(eq(universityRequirementWatches.id, watchId), eq(universityRequirementWatches.userId, userId))).limit(1))[0];
  if (!watch) return { changed: false, watch: null };
  const changed = Boolean(watch.lastKnownHash && watch.lastKnownHash !== contentHash);
  await db.update(universityRequirementWatches).set({ lastKnownHash: contentHash, lastCheckedAt: new Date() }).where(eq(universityRequirementWatches.id, watch.id));
  return { changed, watch };
}

export async function createUniversityRequirementAlert(input: { userId: number; universityId: number; contentHash: string; sourceUrl: string; title: string; body: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const changeKey = `${input.userId}:${input.universityId}:${input.contentHash}`;
  await db.insert(universityRequirementAlerts).values({ ...input, changeKey }).onConflictDoUpdate({ target: universityRequirementAlerts.changeKey, set: { changeKey } });
  return changeKey;
}
