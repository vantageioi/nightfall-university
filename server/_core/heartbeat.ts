// In-process scheduler replacing the external heartbeat service.
// Supports the cron shapes this app generates ("0 0 H * * *" daily,
// "0 0 H * * 1" weekly) by pinging the local scheduled endpoints with the
// shared CRON_SECRET. Schedules are in-memory: they reset on server restart,
// and each user's preferences row keeps its scheduleCronTaskUid so the next
// save re-registers the same job.
import { randomUUID } from "crypto";
import { ENV } from "./env";

type Job = { taskUid: string; name: string; cron: string; path: string; description: string; enabled: boolean };

const jobs = new Map<string, Job>();
let ticker: ReturnType<typeof setInterval> | null = null;
const lastFiredMinute = new Map<string, number>();

function fieldMatches(field: string, value: number): boolean {
  return field.split(",").some((part) => {
    const stepMatch = part.match(/^\*\/(\d+)$/);
    if (stepMatch) return value % Number(stepMatch[1]) === 0;
    if (part === "*") return true;
    return Number(part) === value;
  });
}

function cronMatchesNow(cron: string, now: Date): boolean {
  const fields = cron.trim().split(/\s+/);
  if (fields.length !== 6) return false;
  const [, min, hour, dom, mon, dow] = fields;
  // The seconds field is intentionally ignored: the ticker runs every ~20s and
  // would often miss an exact "second 0" match. Delivery is deduped per minute
  // via lastFiredMinute, so matching anywhere within the minute is safe.
  return (
    fieldMatches(min, now.getMinutes()) &&
    fieldMatches(hour, now.getHours()) &&
    fieldMatches(dom, now.getDate()) &&
    fieldMatches(mon, now.getMonth() + 1) &&
    fieldMatches(dow, now.getDay())
  );
}

async function fire(job: Job) {
  try {
    const port = process.env.PORT || "3000";
    await fetch(`http://127.0.0.1:${port}${job.path}?taskUid=${encodeURIComponent(job.taskUid)}`, { method: "POST", headers: { "x-cron-secret": ENV.cronSecret } });
  } catch (error) {
    console.error(`[Scheduler] Failed to run "${job.name}"`, error);
  }
}

function ensureTicker() {
  if (ticker) return;
  ticker = setInterval(() => {
    const now = new Date();
    const minuteKey = Math.floor(now.getTime() / 60_000);
    for (const job of jobs.values()) {
      if (!job.enabled) continue;
      if (!cronMatchesNow(job.cron, now)) continue;
      if (lastFiredMinute.get(job.taskUid) === minuteKey) continue;
      lastFiredMinute.set(job.taskUid, minuteKey);
      void fire(job);
    }
  }, 20_000);
  // Do not keep the event loop alive purely for the scheduler.
  ticker.unref?.();
}

export async function createHeartbeatJob(input: { name: string; cron: string; path: string; description?: string }, _sessionToken?: string): Promise<{ taskUid: string }> {
  const taskUid = randomUUID();
  jobs.set(taskUid, { taskUid, name: input.name, cron: input.cron, path: input.path, description: input.description ?? "", enabled: true });
  ensureTicker();
  return { taskUid };
}

export async function updateHeartbeatJob(taskUid: string, input: { cron?: string; path?: string; description?: string; enable?: boolean }, _sessionToken?: string): Promise<{ taskUid: string }> {
  const job = jobs.get(taskUid);
  if (job) {
    if (input.cron !== undefined) job.cron = input.cron;
    if (input.path !== undefined) job.path = input.path;
    if (input.description !== undefined) job.description = input.description;
    if (input.enable !== undefined) job.enabled = input.enable;
  } else if (input.path && input.cron && input.enable !== false) {
    return createHeartbeatJob({ name: taskUid, cron: input.cron, path: input.path });
  }
  ensureTicker();
  return { taskUid };
}
