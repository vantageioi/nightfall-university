# Nightfall Vercel Runtime Design

## Target

The Vercel deployment target is the original application at `/home/ubuntu/nightfall-ui-rework`, not the earlier managed-hosting scaffold. The target retains the original `drizzle-orm/pg-core` and `postgres-js` data layer, self-hosted scrypt/JWT sessions, encrypted student Gemini BYOK keys, Gmail approval gate, and existing bilingual UI routes.

## Function Topology

| Concern | Current runtime | Vercel-compatible replacement |
|---|---|---|
| API server | `startServer()` creates a listener with `server.listen(...)`. | Extract `createApp()` into `server/app.ts`; a Vercel `api/index.ts` adapter invokes the Express app without binding a port. Local `server/_core/index.ts` retains the listener only for `pnpm dev`. |
| Client | Vite emits `dist/public`; Express serves it. | Vercel builds the same Vite client output. A non-API SPA fallback returns `index.html`; API paths resolve to serverless functions. |
| tRPC | Mounted at `/api/trpc`. | Remains mounted at `/api/trpc` in the extracted Express app. |
| Credential auth | App-owned scrypt hashes and `app_session_id` JWT cookie. | Unchanged. `COOKIE_SECRET` remains server-side. The Vercel HTTPS origin satisfies the existing secure/Lax cookie settings. |
| Google/Gmail | Callbacks derive the current host. | Preserve the behavior, then register the final `https://<deployment>/api/auth/google/callback` and the Gmail callback URL with Google before testing. |

## Private Object Storage

`server/storage.ts` will preserve its public function signatures but replace `fs/promises` with `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`, which are already declared dependencies.

| Function | Vercel behavior |
|---|---|
| `storagePut()` | Writes owner-prefixed bytes to a private object bucket with a generated safe key and content type. |
| `storageRead()` | Fetches a private object only for server-side extraction; it must return `null` for an absent key. |
| `storageGetSignedUrl()` | Creates a short-lived signed GET URL. |
| `/files/*` | Continues to authenticate the requesting user and validate `students/<id>/` or `admin-intake/` ownership before redirecting to a short-lived signed URL; it must not expose bucket credentials or an unrestricted object URL. |

Required production variables are `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and optional `S3_ENDPOINT` for an S3-compatible service. `DATABASE_URL`, `COOKIE_SECRET`, `CRON_SECRET`, and optional fallback `GEMINI_API_KEY` remain server-only.

## External Cron Design

The scheduler is fully database-driven. The in-memory heartbeat module is removed from the production flow; setting reminder or watch preferences only persists the user’s enabled state and preferred UTC hour.

`cron-job.org` invokes two `POST` endpoints every fifteen minutes with `Authorization: Bearer <CRON_SECRET>`:

| Endpoint | Work | Database selection |
|---|---|---|
| `/api/cron/deadline-nudges` | Create in-app deadline cues. | Enabled `reminderPreferences` in the matching UTC-hour window. Existing unique alert keys remain the final duplicate boundary. |
| `/api/cron/source-watches` | Fetch official sources, compare hashes, and create review alerts. | Enabled `universityWatchPreferences` in the matching UTC-hour window and original Monday cadence. Gemini is invoked only after a real source change. |

Each endpoint must be secured, bounded, and idempotent. A new `scheduler_runs` table will store a unique job/window key, status, claimed timestamp, completion timestamp, and a compact aggregate. The job claims its window atomically before it handles a batch. Duplicate calls become no-op successes, and a stale claim may be retried after a controlled timeout. This protects against external retries and concurrent serverless function invocations.

The sweep functions will select due users directly from Postgres rather than resolving a user through the retired `scheduleCronTaskUid`. Existing preference fields stay in place to avoid a behavioral migration; the deprecated task UID fields can be removed only in a later schema cleanup after a successful production migration.

## Vercel Configuration

`vercel.json` will set the Vite build command, `dist/public` output directory, a single API function entry, and a static SPA fallback. It will intentionally omit Vercel Cron definitions because the authorized Hobby workspace cannot provide the required cadence. The two external scheduler jobs replace that capability.

## Test Strategy

The implementation will add Vitest coverage for the following contracts:

| Test | Expected result |
|---|---|
| S3 storage adapter | Safe keys are uploaded and a signed URL is issued without leaking credentials. |
| Private file route | Unauthenticated, cross-user, and non-admin access is rejected; the owner/admin path returns a short-lived redirect. |
| Cron authentication | Missing or incorrect bearer secrets return `401`; the correct secret reaches the dispatcher. |
| Run ledger | Concurrent or duplicate window claims execute work once. |
| Reminder sweep | Only enabled preferences due in the current window create notifications; repeated runs preserve unique alert keys. |
| Watch sweep | It preserves source hash, change-summary, and review-alert semantics while no longer depending on `scheduleCronTaskUid`. |
| API entry | Vercel function adapter mounts all existing auth and tRPC routes without calling `listen()`. |

## References

[1]: https://vercel.com/docs/functions/runtimes/node-js "Vercel Node.js Functions"
[2]: https://vercel.com/docs/cron-jobs/manage-cron-jobs "Vercel Cron Jobs"
[3]: https://cron-job.org/en/faq/ "cron-job.org Frequently Asked Questions"
