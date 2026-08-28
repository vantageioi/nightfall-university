// Central feature-tier gate. Payment wiring is deferred â€” plan changes are
// manual (set users.plan directly) until a provider is chosen.
import { and, eq, sql } from "drizzle-orm";
import { getDb, getStudentGeminiApiKey } from "../db";
import { aiUsageCounters, users } from "../../drizzle/schema";

export type Plan = "free" | "pro" | "premium";

export const PLAN_LIMITS: Record<Plan, {
  platformAiCallsPerDay: number; // calls on the PLATFORM Gemini key; BYO keys are not throttled by this
  savedProgrammesCap: number;
}> = {
  free: { platformAiCallsPerDay: 15, savedProgrammesCap: 10 },
  pro: { platformAiCallsPerDay: 150, savedProgrammesCap: 60 },
  premium: { platformAiCallsPerDay: 1000, savedProgrammesCap: 300 },
};

export function normalizePlan(plan: string | null | undefined): Plan {
  return plan === "pro" || plan === "premium" ? plan : "free";
}

export class LimitReachedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LimitReachedError";
  }
}

async function todayCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const usageDate = new Date().toISOString().slice(0, 10);
  const result = await db.select({ callCount: aiUsageCounters.callCount }).from(aiUsageCounters).where(and(eq(aiUsageCounters.userId, userId), eq(aiUsageCounters.usageDate, usageDate))).limit(1);
  return result[0]?.callCount ?? 0;
}

/** Gate for one AI invocation. */
export async function assertAiWithinPlan(userId: number): Promise<void> {
  const hasOwnKey = Boolean(await getStudentGeminiApiKey(userId));
  if (hasOwnKey) return;
  const limits = PLAN_LIMITS[await getPlan(userId)];
  const used = await todayCount(userId);
  if (used >= limits.platformAiCallsPerDay) {
    throw new LimitReachedError(`You have reached the ${await getPlan(userId)}-plan daily AI limit (${limits.platformAiCallsPerDay}). Add your own Gemini API key in Settings â†’ Connections for unlimited research, or upgrade your plan.`);
  }
}

async function getPlan(userId: number): Promise<Plan> {
  const db = await getDb();
  if (!db) return "free";
  const result = await db.select({ plan: users.plan }).from(users).where(eq(users.id, userId)).limit(1);
  return normalizePlan(result[0]?.plan);
}

export async function recordAiCall(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const usageDate = new Date().toISOString().slice(0, 10);
  await db.insert(aiUsageCounters).values({ userId, usageDate, callCount: 1 }).onConflictDoUpdate({ target: [aiUsageCounters.userId, aiUsageCounters.usageDate], set: { callCount: sql`${aiUsageCounters.callCount} + 1` } });
}
