# Field test #118 — Real Gmail follow-up send (human, one-click kit)

Goal: prove the full approval-first email path with a **real** Google OAuth
consent → confirmed university contact → AI draft → explicitly approved send
through a real Gmail inbox. Nothing in this flow may auto-send; the final
"Gmail send" click must be yours.

All env var names below are verified against `.env.example`,
`server/gmailRoutes.ts`, and `server/_core/index.ts`.

---

## 0. Preconditions

### Environment variables (`.env` — copy from `.env.example`)

| Variable | Why | Notes |
| --- | --- | --- |
| `DATABASE_URL` | App writes connections/drafts/audit rows | Postgres/Supabase reachable |
| `COOKIE_SECRET` | Session cookie signing | Generate per `.env.example` comment |
| `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` | Google OAuth client | From Google Cloud Console → APIs & Services → Credentials |
| `GMAIL_TOKEN_ENCRYPTION_KEY` | Refresh token encrypted at rest | 32+ characters (`server/gmailConnection.ts`) |
| `APP_URL` | Documented public deployment URL | The code builds the redirect URI from the request host (`server/gmailRoutes.ts:callbackUrl`), so make sure you browse the app via the same host you registered |
| `GEMINI_API_KEY` | Real AI drafts (without it `invokeLLM` returns mock JSON) | Optional for connect/send, required to test real AI drafting |
| `CRON_SECRET` | Only needed if also validating scheduled nudges | Not required for this test |

### Google Cloud Console checklist (test project)

1. Enable **Gmail API**.
2. OAuth consent screen: External, add your tester account under **Test users**.
3. Create an **OAuth client ID → Web application**.
4. Authorized redirect URI must include BOTH:
   - `http://localhost:3000/api/gmail/callback` (local run), and/or
   - `https://<your-deploy-host>/api/gmail/callback`
   (path is hardcoded as `/api/gmail/callback` in `server/gmailRoutes.ts`).
5. Scopes requested by the app (no manual scope entry needed, but be able to
   recognise them on the consent screen):
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.readonly`

### Test account

- A Gmail account you own (use a dedicated test inbox, not a personal one).
- Sign in to Nightfall as a **student** account first.

### Start the app

```powershell
pnpm install
pnpm run db:push      # if schema not applied yet
$env:NODE_ENV="development"; npx tsx watch server/_core/index.ts
```

---

## 1. Click-path (record everything)

### Step A — Connect Gmail (real consent)

1. Sign in at `/login`, open **/settings**.
2. In *Connections*, click **Connect Gmail** (`<a href="/api/gmail/connect">`).
3. Google consent screen appears → choose the test account → click **Allow**
   on both Gmail scopes. `prompt=consent` is forced, so you WILL see it.
4. You are redirected back to `/settings?gmail=connected`.

**Observe:** settings now shows the connected address
(`inboxConnection.emailAddress` from the relationship workspace query).
**Fail signs:** redirect to `/settings?gmail=unavailable` (config missing) or
`?gmail=error` (state/cookie mismatch or no refresh token — check server log
`[Gmail] Connection callback failed`).

### Step B — Confirm a university contact

5. Open **/my-journey → “Reach university”** tab.
6. Under *Confirmed contacts*, pick a saved university and enter its
   admissions email (use your own second test inbox so nothing external is
   emailed) → **Save after confirming**.

**Observe:** the contact appears with `studentConfirmedAt` set (drafting is
locked until a confirmed contact exists).

### Step C — AI draft

7. With the confirmed contact active, type a short purpose and click
   **“Start a draft with AI”** (needs `GEMINI_API_KEY`; otherwise expect a
   clearly mock-shaped draft).
8. Review subject/body, adjust if needed, click **Prepare for review**
   → status becomes **Ready for review**.

**Observe:** draft is editable before approval. **Fail sign:** error
“Connect your Gmail inbox…” (Step A failed) or plan-limit message (free plan =
15 platform AI calls/day).

### Step D — Explicit approval + real send

9. Click **Review & approve** → status **Approved**.
   The UI states approval does NOT send.
10. Click **Send from Gmail** → status passes **Sending**
    (`provider_send_requested`) → **Sent**.
11. Open the test recipient inbox: the email is there, sent **from your Gmail
    account**, threaded via the communication's `providerThreadId`.

**Rate-limit checks (by design):** max 5 student→university emails / 24h and
max 1 email per contact / 24h (`server/universityCommunicationPolicy.ts`). A
second immediate send to the same contact should be refused.

### Step E — Trail

12. Back in the Reach tab, the *Communication log* shows the message history;
    the relationship workspace exposes the audit events
    (`student_approved`, `provider_send_requested`, `sent`).

---

## 2. Pass/fail criteria

| # | Criterion | Pass |
| --- | --- | --- |
| P1 | Consent screen shown, redirect lands on `/settings?gmail=connected` with correct address | ✅ |
| P2 | Draft cannot be created without a confirmed contact | ✅ |
| P3 | Approval alone sends nothing (no email in recipient inbox after step 9) | ✅ |
| P4 | Email arrives only after the separate Send click, from the connected Gmail account | ✅ |
| P5 | Duplicate send within 24h to same contact is blocked by policy | ✅ |
| P6 | Audit/log entries exist for approve + send | ✅ |

## 3. Evidence capture

- Screenshot: Google consent screen (scopes visible).
- Screenshot: `/settings?gmail=connected`.
- Screenshot: draft in *Ready for review* and then *Approved* (timestamps).
- Screenshot: **Send from Gmail** click moment and resulting *Sent* status.
- Recipient inbox screenshot showing sender = your test Gmail, full headers
  if possible (shows Gmail API send, not SMTP spoofing).
- Export of the communication-log section (or DB row dump of
  `university_communications` + `university_communication_audit_events`).
- Note the date/time, commit hash, and any console/server errors.

Do **not** capture: refresh tokens, `.env` values, or the encrypted token
columns.
