import { timingSafeEqual } from "node:crypto";
import type express from "express";
import { ENV } from "./_core/env";
import { runDueDeadlineNudges, runDueUniversityRequirementWatches } from "./schedulerRunner";

function equalSecrets(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

/** Exported separately so the bearer contract can be exercised without a live HTTP server. */
export function isCronRequestAuthorized(authorization: string | undefined, cronSecret = ENV.cronSecret) {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return Boolean(match?.[1] && cronSecret && equalSecrets(match[1], cronSecret));
}

function cronError(error: unknown, req: express.Request) {
  const message = error instanceof Error ? error.message : String(error);
  return { error: message, context: { url: req.originalUrl }, timestamp: new Date().toISOString() };
}

export function registerCronRoutes(app: express.Express) {
  app.post("/api/cron/deadline-nudges", async (req, res) => {
    if (!isCronRequestAuthorized(req.header("authorization"))) return res.status(403).json({ error: "cron-only" });
    try {
      return res.json({ ok: true, ...(await runDueDeadlineNudges()) });
    } catch (error) {
      return res.status(500).json(cronError(error, req));
    }
  });

  app.post("/api/cron/source-watches", async (req, res) => {
    if (!isCronRequestAuthorized(req.header("authorization"))) return res.status(403).json({ error: "cron-only" });
    try {
      return res.json({ ok: true, ...(await runDueUniversityRequirementWatches()) });
    } catch (error) {
      return res.status(500).json(cronError(error, req));
    }
  });

  // The old per-user in-memory scheduler callbacks cannot operate safely on a
  // serverless fleet. Returning Gone prevents a stale configuration from doing
  // surprise work while giving the external scheduler a clear failure signal.
  app.all("/api/scheduled/deadline-nudges", (_req, res) => res.status(410).json({ error: "Replaced by /api/cron/deadline-nudges" }));
  app.all("/api/scheduled/university-requirements", (_req, res) => res.status(410).json({ error: "Replaced by /api/cron/source-watches" }));
}
