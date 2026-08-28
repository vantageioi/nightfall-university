import { and, eq, lt, or, sql } from "drizzle-orm";
import { reminderPreferences, schedulerRuns, universityWatchPreferences } from "../drizzle/schema";
import { createDeadlineAlertsForPreferences, getDb } from "./db";
import { runUniversityRequirementsWatchForUser } from "./requirementsWatchRunner";

const WINDOW_MINUTES = 15;
const STALE_RUN_MS = 10 * 60 * 1000;
const DEADLINE_BATCH_SIZE = 24;
// A source fetch may take up to 15 seconds. Keep only two students in flight
// so the scheduled serverless invocation remains bounded without a fan-out.
const WATCH_PREFERENCE_BATCH_SIZE = 2;

export function getSchedulerWindowKey(jobKey: string, now = new Date()) {
  const minute = Math.floor(now.getUTCMinutes() / WINDOW_MINUTES) * WINDOW_MINUTES;
  const stamp = [now.getUTCFullYear(), String(now.getUTCMonth() + 1).padStart(2, "0"), String(now.getUTCDate()).padStart(2, "0")].join("-");
  return `${jobKey}:${stamp}T${String(now.getUTCHours()).padStart(2, "0")}:${String(minute).padStart(2, "0")}Z`;
}

async function claimSchedulerWindow(jobKey: string, windowKey: string, now: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const inserted = await db.insert(schedulerRuns).values({ jobKey, windowKey, status: "running", startedAt: now, attempts: 1 }).onConflictDoNothing().returning({ id: schedulerRuns.id });
  if (inserted.length > 0) return inserted[0].id;

  const recovered = await db.update(schedulerRuns)
    .set({ status: "running", startedAt: now, completedAt: null, details: null, attempts: sql`${schedulerRuns.attempts} + 1` })
    .where(and(eq(schedulerRuns.jobKey, jobKey), eq(schedulerRuns.windowKey, windowKey), or(eq(schedulerRuns.status, "failed"), and(eq(schedulerRuns.status, "running"), lt(schedulerRuns.startedAt, new Date(now.getTime() - STALE_RUN_MS))))))
    .returning({ id: schedulerRuns.id });
  return recovered[0]?.id ?? null;
}

async function completeSchedulerWindow(runId: number, details: Record<string, unknown>) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(schedulerRuns).set({ status: "completed", completedAt: new Date(), details }).where(eq(schedulerRuns.id, runId));
}

async function failSchedulerWindow(runId: number, error: unknown) {
  const db = await getDb();
  if (!db) return;
  const message = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
  await db.update(schedulerRuns).set({ status: "failed", completedAt: new Date(), details: { error: message } }).where(eq(schedulerRuns.id, runId));
}

export async function runDueDeadlineNudges(now = new Date(), limit = DEADLINE_BATCH_SIZE) {
  const jobKey = "deadline-nudges";
  const windowKey = getSchedulerWindowKey(jobKey, now);
  const runId = await claimSchedulerWindow(jobKey, windowKey, now);
  if (!runId) return { skipped: "already-running-or-complete" as const, windowKey, processed: 0, created: 0 };
  try {
    const db = await getDb();
    if (!db) throw new Error("Database is unavailable");
    // Vercel Hobby invokes the production scheduler once daily, not hourly.
    // The preference remains an informational student setting; enabled users
    // are reconciled on every daily run rather than silently skipped.
    const duePreferences = await db.select().from(reminderPreferences).where(eq(reminderPreferences.enabled, true)).limit(limit);
    let created = 0;
    for (const preferences of duePreferences) {
      const result = await createDeadlineAlertsForPreferences(preferences, now);
      created += result.created;
    }
    const result = { skipped: null, windowKey, processed: duePreferences.length, created };
    await completeSchedulerWindow(runId, result);
    return result;
  } catch (error) {
    await failSchedulerWindow(runId, error);
    throw error;
  }
}

export async function runDueUniversityRequirementWatches(now = new Date(), limit = WATCH_PREFERENCE_BATCH_SIZE) {
  if (now.getUTCDay() !== 1) return { skipped: "not-watch-weekday" as const, windowKey: null, processed: 0, checked: 0, changed: 0, failures: [] as Array<{ userId: number; status: string }> };
  const jobKey = "source-watches";
  const windowKey = getSchedulerWindowKey(jobKey, now);
  const runId = await claimSchedulerWindow(jobKey, windowKey, now);
  if (!runId) return { skipped: "already-running-or-complete" as const, windowKey, processed: 0, checked: 0, changed: 0, failures: [] as Array<{ userId: number; status: string }> };
  try {
    const db = await getDb();
    if (!db) throw new Error("Database is unavailable");
    const duePreferences = await db.select().from(universityWatchPreferences).where(eq(universityWatchPreferences.enabled, true)).limit(limit);
    const results = await Promise.all(duePreferences.map((preferences) => runUniversityRequirementsWatchForUser(preferences.userId, 1)));
    let checked = 0;
    let changed = 0;
    const failures: Array<{ userId: number; status: string }> = [];
    for (const [index, result] of results.entries()) {
      const preferences = duePreferences[index];
      checked += result.checked;
      changed += result.changed;
      failures.push(...result.failures.map((failure) => ({ userId: preferences.userId, status: failure.status })));
    }
    const result = { skipped: null, windowKey, processed: duePreferences.length, checked, changed, failures };
    await completeSchedulerWindow(runId, result);
    return result;
  } catch (error) {
    await failSchedulerWindow(runId, error);
    throw error;
  }
}
