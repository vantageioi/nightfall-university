# Production Operations Log

## Supabase runtime credential recovery — 2026-08-27

The authenticated Supabase browser session opened the existing Nightfall project (`bcyrilmqfwilxozmjycz`) database settings. The official password-reset dialogue was opened after explicit user confirmation, and a new high-entropy database password was entered. The password itself is intentionally not recorded in this repository or this log.

The next confirmed action is to submit the reset, retrieve the project’s official **transaction-pooler** connection format for Vercel serverless traffic, and replace the invalid deployment environment value. This database uses the current self-hosted Nightfall backend access model, which relies on the privileged `postgres` runtime role because existing public tables enforce RLS without policies.

The Supabase UI confirmed **Successfully updated database password**. A subsequent Connect-panel click used a stale browser snapshot and was rejected locally; no additional database operation occurred. The next step is to refresh the page state and open Connect again.

No password value is recorded in this log.


The authenticated Supabase UI confirmed the database password reset succeeded. The refreshed Connect action opened the official connection panel state with session pooling selected in the URL, but the browser returned no interactive elements and no screenshot for that panel view. No database credential value was recorded.


The authenticated Supabase Connect panel was refreshed and switched to **Transaction pooler**. Supabase’s UI describes this method as intended for stateless serverless functions; it is now the selected connection method for the Vercel runtime.

No connection string or password is recorded in this log.


The Connect drawer remains on Transaction pooler. The first container scroll target was not recognized; the page fallback scrolled successfully, but the connection-string fields were not exposed in the returned text. No credential was copied or recorded.


The official transaction-pooler URI format in the authenticated Supabase panel uses host `aws-1-eu-west-1.pooler.supabase.com` (not `aws-0`). The complete runtime URI should be assembled only in Vercel with the reset password; no password is recorded here.

The authenticated Vercel Environment Variables page for `nightfall-university` opened successfully, confirming the account session is available. The browser extension timed out before the settings form could be read, so no Vercel setting was changed by this attempt and an alternate recovery path is required.

## Transaction-pooler runtime verification — 2026-08-27

The operator replaced `DATABASE_URL` through Vercel’s Production environment settings and redeployed the authoritative `nightfall-university` project. The final production value uses Supabase transaction pooling on the project’s `aws-1-eu-west-1.pooler.supabase.com` host and port `6543`; the password is intentionally not recorded here.

The non-sensitive public health check at `https://nightfall-university.vercel.app/api/health` returned HTTP 200 with `status: ok`, `database: connected`, and `gmail: configured`. A deliberately invalid sign-in attempt returned HTTP 401 without creating a student record. An unauthenticated request to start a Gmail connection returned its safe Settings redirect and did not initiate Google consent or email delivery.

Private S3-compatible document storage remains intentionally unconfigured, and cron-job.org jobs have not yet been created. Neither boundary affects the validated database-backed core runtime, but document upload/download and recurring deadline/source-watch sweeps must remain unavailable until their operator-owned setup steps are completed.

The protected `/onboarding` route was checked without submitting any form. As designed, a visitor without an active Nightfall session is redirected to the sign-in experience; no account, consent, Gmail connection, or email action was initiated during this check.

Google account sign-in was field-validated in production. After the user completed their own Google authorization and legal acceptance, the signed-in Settings surface loaded and correctly displayed Google as the account sign-in method. No Gmail connection, message, document, or student-profile content was changed during the validation.

After the card-based Consultation release, the signed-in route was checked without entering or changing any consultation answer. An already completed profile correctly bypassed the Consultation and reached the distinct first-research-set surface; recommendation content is therefore not rendered beneath an active question card.

The public `Meet the Consultant` entry was rechecked with an already completed profile after the first routing change. It still reached the first-research-set route, so the remaining investigation must distinguish a stale progressive-web-app client cache from another active redirect source before the entry fix can be called complete.

The deployed production bundle was verified to contain the new Consultation entry code. With a fresh cache-busting navigation, an authenticated completed profile opened the intended private Consultation directly at its first question instead of the dashboard. No response was entered and no student state was changed during this check.

The normal production Consultant entry URL was then rechecked after the client refresh. It also loaded the first private Consultation question for the completed profile, confirming the public entry no longer redirects a returning student directly to the dashboard.

After the source-linked research and journey hierarchy release, the canonical dashboard correctly presented the student sign-in boundary when no session was available. The public Consultant entry was then opened without entering any answer; it reached the new release loading state and no data was submitted.

## First Research Set completion release — 2026-08-27

Production deployment `dpl_69aoZ5MEEmRedwzoezQ48xT9Myhg` reached `READY` and now owns the canonical `nightfall-university.vercel.app` alias. Its non-sensitive health response returned HTTP 200 with `status: ok`, `database: connected`, `googleSignIn: configured`, `gmail: configured`, and `documentStorage: not-configured`.

The release completes the First Research Set as a small source-linked editorial research set with an explicit Consultant context, visible research status, expandable rationale and verification gaps, a student-owned save gate before the Journey transition, and individual rejection reasons. Rejection reasons remain browser-local; when the student returns to the Consultant, only the local reasons are shown as optional conversation context and no profile field is changed implicitly. The public Consultant entry was visually checked without entering an answer and displayed the first “What should I call you?” conversation card.

Private S3-compatible document storage, external cron-job.org schedules, a user-controlled Gmail send field test, anonymous post-Consultation Google-unlock field validation, and truthful Gemini availability validation remain separate outstanding work.

## Journey operational notebook and preparation detail — 2026-08-27

The additive Postgres enum migration `add_application_preparation_started_event` was applied successfully. It supports an explicit, idempotent student action that starts a private programme-preparation path for an already saved Germany programme. The event is not an application submission, university contact, eligibility assessment, or admissions decision.

Production deployment `dpl_8s77paNTRPN64LwiY7DiToTDeg58` reached `READY` and owns the canonical `nightfall-university.vercel.app` alias. The canonical health endpoint returned HTTP 200 with the database connected, Google sign-in configured, Gmail configured, and document storage still not configured. A non-mutating signed-in browser check confirmed the new Journey Home client shell after the PWA policy was changed to claim open clients, skip waiting, and remove outdated precaches.

The release adds a calm Journey home driven by protected student queries, a source-linked programme-preparation detail for saved Germany programmes, and a simpler token-gated read-only Family View without percentage progress. The programme detail exposes only available source fields, reviewed dates, private document metadata, and durable student activity. It does not treat documents as programme requirements, create a submission, contact a university, or make a decision. Programme-specific communication context and full bilingual/mobile field verification remain outstanding.

## Application OS source-first refinement — 2026-08-27

Production deployment `dpl_FXtmNz48cz6eKzJJKTsB4tAmVca4` reached `READY` and took over the canonical `nightfall-university.vercel.app` alias. The non-sensitive canonical health endpoint returned HTTP 200 with `status: ok`, `database: connected`, `googleSignIn: configured`, `gmail: configured`, and `documentStorage: not-configured`.

The release strengthens the programme application detail with a state indicator, expandable official-evidence requirements, explicit private-profile context, reviewed-deadline provenance, and a durable history. It adds a Timeline above the existing Calendar, reframes Watch around student-controlled official-source changes and quiet states, and makes the inbound university-message view source-first with a visibly secondary Nightfall reading. A student may deliberately open the Consultant from a saved programme, which passes only that programme’s validated context when the student subsequently sends a question; no AI request happens on navigation.

Focused Application Detail, Timeline, Communications, Journey, and Consulting-context tests passed (16 tests). The canonical signed-in browser QA account had no saved programme, date, or preparation state. The deterministic journey guard therefore returned it to the first-research fallback in English and Shami Arabic rather than fabricating a live application detail or Timeline. No student record, document, date, AI request, email, or application state was changed during QA.

## Germany public-agency census and conversational recovery — 2026-08-27

The user-supplied `germany_public_state_funded_agency_census_v5_package.zip` was inspected and confirmed to be a Germany-only public-programme source. It was not placed in, relabelled as, or used to alter the Italy index. The inspected census records retain their HRK public-law (`öffentlich-rechtlich`) institutional-control signal, DAAD programme-detail URL, source provenance, confidence classification, and documented coverage limitations.

All 19,967 validated census programme rows were loaded into the protected Germany programme index through 40 idempotent batches of 500 or fewer rows. The post-import production verification returned 19,969 Germany rows in total—19,967 census rows plus two pre-existing local validation fixtures—with 19,969 unique programme identifiers, 99 Biotech-related records, and 43 Anthropology-related records. The package does not provide reliable structured programme-language, admission-semester, or fee values; those fields remain unset rather than inferred.

Production deployment `dpl_Cu33jUZgmBv5aWdqxRMr613YSR5P` reached `READY` and owns the canonical `nightfall-university.vercel.app` alias. Its non-sensitive canonical health endpoint returned HTTP 200 with `status: ok`, `database: connected`, `googleSignIn: configured`, `gmail: configured`, and `documentStorage: not-configured`. The release supplies bounded, source-labelled Germany catalogue evidence to the private Consulting context only when a student explicitly sends a Consulting question. It is research context, not an admissions, eligibility, fee, visa, funding, or application-submission decision.

The same release replaces the primary changed-direction and rejection path with a free-text, browser-session-local Consultant handoff. The Journey and Decision Room route students to that conversation rather than to a programme menu. The optional note and new direction do not change a profile or saved programme, and are cleared after the student completes the deliberate account-unlock step. Broad discovery remains a secondary research tool rather than a recovery recommendation.

## Requirement-first Documents and explicit review links — 2026-08-27

The additive migration `add_student_document_requirement_links` was applied successfully to the authorized Supabase project. It creates an owner-scoped `student_document_requirement_links` table with a unique key across the student, private document, saved Germany programme, and official-requirement category, plus a student/programme lookup index. A read-only post-migration check returned `link_count: 0`, confirming that the schema operation did not create a student record, document link, file, or application change.

Production deployment `dpl_D1wHtJmztEL7bneTmuiZsf8T7kDy` reached `READY` and owns the canonical `nightfall-university.vercel.app` alias. The canonical health endpoint returned HTTP 200 with `status: ok`, `database: connected`, `googleSignIn: configured`, `gmail: configured`, and `documentStorage: not-configured`.

The release adds a protected Documents workspace that groups existing private document metadata by its review state and lets a student deliberately place a document beside one of four displayed official programme-requirement categories for a currently saved, non-archived Germany programme. Every such link is review-only: it does not verify a document, conclude that a university will accept it, submit an application, send a document, or make an admissions decision. The document link can be removed by the student. Existing documents remain reachable even before a programme is saved, but the link action is unavailable until a student has chosen a saved Germany programme.

Private storage remains unconfigured, so the production workspace states that uploads are unavailable rather than offering a failing upload action. The release does not configure storage, invoke Gemini, send Gmail messages, or create scheduled jobs.

## Open-ended core AI workflows and PWA activation — 2026-08-27

Production deployment `dpl_5owMqQfoECpvm39N4rBwu9p94HB5` reached `READY` and owns the canonical `nightfall-university.vercel.app` alias. The non-sensitive canonical health endpoint returned HTTP 200 with `status: ok`, `database: connected`, `googleSignIn: configured`, `gmail: configured`, and `documentStorage: not-configured`.

The release removes the curated-subject validator from the protected fit-profile and Consultation path. A direction needs only meaningful human text, so Nanotechnology, interdisciplinary studies, Arabic directions, and other new or unusual subjects can enter private research instead of being refused because they do not appear in a preset list. Consulting retrieval now derives bounded safe terms from both the student’s saved direction and the latest free-text research question, then provides up to 12 source-labelled Germany-index records as private context for Gemini. The prompt does not transmit the full census or turn the resulting response into an admissions, eligibility, fee, visa, funding, or submission decision.

The previous Gemini mock response was removed. All AI workflows now fail closed with a clear non-secret availability state when neither a student key nor platform provider is configured, and successful usage accounting occurs only after a usable validated result. The Journey presents a first-class Research Agent and Essay Studio, while the primary Journey home directly opens the existing student-owned Gmail outreach and follow-up workspace. Gmail still requires the student’s connected mailbox, a confirmed contact, a separate review/approval action, and a distinct deliberate send click; this release does not perform a live Gemini call, Gmail send, or follow-up.

The service worker now registers explicitly on production client start with immediate update handling while retaining skip-waiting, clients-claim, and obsolete-precache cleanup. A non-mutating canonical browser check confirmed that an existing authenticated client activated the new Journey bundle and exposed the three core-workflow entry points. Focused tests passed (25 tests across 10 files), TypeScript passed, and the production client/server build completed successfully.

## Gemini authorization-key compatibility — 2026-08-27

Google’s current Gemini documentation confirms that the API accepts legacy standard keys and newer authorization keys, and that new AI Studio keys are created as authorization keys.[1] Google’s Gemini developer forum identifies the newer `AQ.` prefix as the Gemini authorization-key form.[2]

Nightfall deployment `dpl_1vizV7CBbL8FyLX3LwrJiEfFr35a` reached `READY` and owns the canonical `nightfall-university.vercel.app` alias. Its canonical health endpoint returned HTTP 200 with the database connected, Google sign-in configured, Gmail configured, and document storage not configured. The encrypted student BYOK procedure now explicitly accepts both documented Gemini key families: legacy `AIza` and current `AQ.` authorization keys. It still rejects unrelated secret formats and still receives the key only at the server boundary.

The production platform key could not be added from the current sandbox because the available browser has no authenticated Vercel account session and the configured Vercel integration does not expose environment-variable writes. No supplied secret was placed in source code, logs, a local `.env`, or a deployed file. Production Gemini availability therefore remains unconfigured until an authorized Vercel session stores a key as `GEMINI_API_KEY`; no live Gemini request, email, application submission, or student-data mutation was performed during this work.

## Google account sign-in trigger repair — 2026-08-27

Production callback logs showed that Google account sign-in was reaching the Nightfall callback but failed while updating an existing `users` record. The underlying PostgreSQL error was caused by the existing generic `trg_users_updated_at` trigger assigning `NEW.updated_at` even though the users table stores its timestamp as quoted `"updatedAt"`.

The additive migration `fix_users_updated_at_trigger` replaced only that trigger with `nightfall_set_users_updated_at()`, which updates `NEW."updatedAt"`. A read-only database query confirmed `trg_users_updated_at` now executes the repaired function. The Google OAuth redirect entrypoint was separately confirmed to use the canonical callback, and the user reported a successful normal Google sign-in after the repair. No account was fabricated, no Gmail authorization was changed, and no user-provided secret was viewed or stored.

## Direct Journey Settings control — 2026-08-27

Production deployment `dpl_9b4zvJbNgUmQNpzYpceEJS43XB5o` reached `READY` and acquired the canonical `nightfall-university.vercel.app` alias. It adds an immediately visible, keyboard-accessible Settings control in the Journey hero, immediately beside the private-account context. It links directly to the protected Settings route and identifies the four areas students use there: Gemini, Gmail, language, and privacy. This is a navigation-only change; it neither alters account settings nor changes the unresolved production Gemini-key configuration.

## References

[1] [Using Gemini API keys — Google AI for Developers](https://ai.google.dev/gemini-api/docs/api-key)

[2] [Gemini API key start from AQ — Google AI Developers Forum](https://discuss.ai.google.dev/t/gemini-api-key-start-from-aq/171575)
