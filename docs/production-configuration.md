# Nightfall Production Configuration

Add values through the Vercel project’s environment-variable settings, then redeploy after each configuration change. Gmail remains **approval-first**: enabling OAuth makes a student-owned Gmail connection available, but never authorizes autonomous outreach.

| Group | Variables | Required before public launch | Effect while absent |
|---|---|---:|---|
| Core persistence | `DATABASE_URL` | Yes | Account, journey, research, alert, and run-ledger operations cannot work. |
| Session security | `COOKIE_SECRET` | Yes | Student sessions cannot be signed safely. |
| Student-secret encryption | `MASTER_KEY` | Yes | The server refuses production startup, protecting sealed Gemini BYOK values and encrypted records. |
| External scheduler | `CRON_SECRET` | Yes | The protected scheduler endpoints cannot be invoked safely. |
| Private documents | `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Yes when uploads are live | Document upload/read operations remain unavailable. |
| Optional object-store details | `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE` | Provider-specific | Needed only for compatible non-AWS endpoints. |
| Gemini fallback | `GEMINI_API_KEY` | No | Students can still use their own Gemini-compatible BYOK keys; platform fallback is unavailable. |
| Google account sign-in | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | No when Gmail OAuth is configured | Dedicated values override the Gmail OAuth client. When absent, Nightfall uses the configured `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` for account sign-in only. |
| Gmail outreach | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_TOKEN_ENCRYPTION_KEY` | No | The Settings page shows Gmail as unavailable; no connection, sync, or send action is offered. |

## Supabase database connection

For Vercel/serverless traffic, `DATABASE_URL` must use Supabase’s **shared transaction pooler** rather than a direct database host or a session pooler. The required form is below; URL-encode any reserved character in the database password.

```text
postgresql://postgres.<project-ref>:<URL-ENCODED-password>@aws-<region>.pooler.supabase.com:6543/postgres?sslmode=require
```

Nightfall uses `postgres-js` with prepared statements disabled, which is required for transaction pooling. The current Nightfall project is in `eu-west-1`; operators should obtain the exact region-specific hostname from the project’s Supabase **Connect** panel instead of guessing it.

## Gmail configuration

When all three Gmail values are present, the Settings page automatically presents **Connect Gmail** to signed-in students. Each student must authorize their own inbox; Nightfall stores the resulting refresh connection encrypted. Email drafts remain subject to the existing explicit student-approval state before any send request reaches Gmail.

The current Google OAuth web client must include this callback:

```text
https://nightfall-university.vercel.app/api/gmail/callback
```

To enable **Sign in with Google**, add this separate authorised redirect URI to the same OAuth web client:

```text
https://nightfall-university.vercel.app/api/auth/google/callback
```

Nightfall uses OpenID Connect scopes (`openid`, `email`, and `profile`) for account sign-in. This is separate from the Gmail scopes used only after a signed-in student voluntarily connects their own inbox.

When `nightfall.dq.je` is connected and made canonical, add `https://nightfall.dq.je/api/gmail/callback` to the same OAuth web client before directing students to use that domain.

Do not change `MASTER_KEY` after real student BYOK values or encrypted records exist. Keep it in a password manager or secret-management system, not in the repository. Likewise, do not commit Gmail OAuth client secrets.

## Scheduler later

Create two cron-job.org HTTP jobs after deployment. Both use `POST`, run every 15 minutes, and send the header `Authorization: Bearer <CRON_SECRET>`. Use the current canonical public hostname and migrate the job URLs only after a custom domain becomes canonical.

| Endpoint | Purpose |
|---|---|
| `https://nightfall-university.vercel.app/api/cron/deadline-nudges` | Creates idempotent in-app deadline/follow-up review alerts for due student preferences. |
| `https://nightfall-university.vercel.app/api/cron/source-watches` | Checks due official university pages and creates review-only source-change alerts. |

Neither job sends university email. The run ledger makes duplicate HTTP triggers within the same fifteen-minute window safe.
