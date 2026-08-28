# Free External Scheduler Decision

## Decision

Nightfall will use **cron-job.org** as the free external trigger for the Vercel deployment. It will invoke two authenticated application endpoints over HTTPS. This replaces both the original process-local `setInterval` scheduler and the paid UptimeRobot monitor approach.

cron-job.org documents that its service is free, supports arbitrary custom request headers, supports POST requests with a body, and can run jobs as often as once per minute. Its execution timeout is 30 seconds, so each Nightfall handler must use bounded, batched work and return a compact JSON result. [1]

## Trigger Contract

| Job | Endpoint | Method | Cadence | Secure request header |
|---|---|---:|---:|---|
| Deadline nudge sweep | `/api/cron/deadline-nudges` | `POST` | Every 15 minutes | `Authorization: Bearer <CRON_SECRET>` |
| Official-source watch sweep | `/api/cron/source-watches` | `POST` | Every 15 minutes | `Authorization: Bearer <CRON_SECRET>` |

The endpoints will accept no user-provided query parameters. `CRON_SECRET` must be set as a Vercel server-side environment variable and entered only in cron-job.org’s private custom-header configuration. It must never appear in an endpoint URL, a repository file, a client bundle, a response, or an execution log.

## Database-Driven Scheduler Design

The existing per-user `scheduleCronTaskUid` is an implementation detail of the in-memory heartbeat service and will be retired as the scheduling authority. On every external trigger, the server will derive due work from persisted preferences:

| Sweep | Due-selection rule | Preserved behavior |
|---|---|---|
| Deadline nudges | Enabled reminder preferences whose `preferredHourUtc` matches the current UTC hour; records are processed at most once in their hourly window. | User-enabled state, preferred time, and 7/3/1-day reminder settings remain authoritative. Existing stable alert keys prevent duplicate alerts. |
| Source watches | Enabled watch preferences whose `preferredHourUtc` matches the current UTC hour and whose weekday matches the original weekly Monday cadence. | Existing official-source cache, content hash, Gemini change explanation, and review-alert flow remain unchanged. Gemini runs only after a real source hash change. |

The 15-minute external cadence provides an execution window for each preferred hour while keeping the actual student settings authoritative. If a trigger is delayed or missed, the next successful invocation will reconcile the current window. No student-facing automation performs outreach or submits an application; the system continues to create reviewable in-app alerts only.

## Reliability and Safety

The migration will add a small database-backed run ledger. Each scheduler endpoint claims an idempotency key for its job type and time window before it processes a batch. Duplicate calls therefore return a successful no-op rather than creating duplicate work. Failed runs record a bounded diagnostic and remain eligible for a controlled retry; client-visible API responses will never include user, document, or Gemini content.

The handlers will paginate due students and source watches, enforce per-request work limits below the external scheduler’s 30-second timeout, and return a compact response such as `{ "ok": true, "processed": 12, "skipped": 3 }`. If production volume eventually exceeds that limit, a continuation marker will be stored in the database and the next trigger will resume the remaining work.

## Operational Ownership

The Nightfall operator will own the cron-job.org account and will create the two jobs after the Vercel deployment URL and `CRON_SECRET` are available. The jobs should enable failure notifications and keep response-history storage disabled or limited because the endpoints are operational controls, not a user-data channel. cron-job.org exposes recent execution history, but Nightfall’s responses will remain aggregate-only. [2]

## References

[1]: https://cron-job.org/en/faq/ "cron-job.org Frequently Asked Questions"
[2]: https://docs.cron-job.org/rest-api.html "cron-job.org REST API"
