# Nightfall — Architecture Contract

> **Status: RATIFIED.** The rules in this document are contracts, not suggestions.
> All implementation work is judged against them. Changes require explicit re-ratification.

## 1. Constitutional Laws

**Law I — Proposal boundary.**
*The model may propose state transitions and actions; only domain services and
policy-controlled executors may perform them.*
The reasoner returns a structured proposal (zod-validated). It can never call tools,
touch the database, or trigger side effects. Tool definitions are visible only to the
Executor. Guardrail: a test asserts no module outside `server/domain/**` and
`server/agent/tools/write/**` performs mutations.

**Law II — Events are truth.**
*Application events are the authoritative history; derived scheduling fields are caches
and must never become sources of truth.*
`application_events` + `Application.status` are authoritative. `nextActionAt` /
`nextActionKind` are materialized scheduling caches with exactly one writer:
the deterministic `recomputeNextAction(applicationId)`, invoked on every event write.
Any corrupted cache value self-heals on the next event.

**Law III — Eligibility.**
*An Application exists only when the centralized eligibility predicate says it does.*
Saved programme ≠ Application. A row is created — by historical backfill and future
runtime alike, through the same exported predicate — only when a deliberate pursuit
signal exists (see §4). This keeps migration and runtime behavior from drifting apart.

## 2. Layer Map (target)

```text
                         NIGHTFALL
                              │
                    ┌─────────▼─────────┐
                    │     DOMAIN API    │   (tRPC; client never imports server internals)
                    └─────────┬─────────┘
                              │
      ┌───────────────────────┼────────────────────────┐
      ▼                       ▼                        ▼
 Applications            Communications            Documents
 Requirements            Application Events        Tasks
 (programmes = identity layer; DE/IT catalogues remain research/source tables)
                              │
                              ▼
                     Agent Orchestrator
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
         Context Builder   Reasoner        Policy Engine
              (proposal-only: classification + proposedAction + reason + confidence)
                              │
                              ▼
                     Policy Engine decision
                     allow / require_approval / deny
                              │
                              ▼
                           Executor
                              │
                    ┌─────────┼──────────┐
                    ▼         ▼          ▼
                  Gmail    Scheduler   Domain Services
              (integrations/ adapters; swappable providers)
```

## 3. Boundary Rules

1. `client/**` never imports `server/**` at runtime; it speaks tRPC only.
   Sole permitted exception: `import type { AppRouter } from server/routers`
   in `client/src/lib/trpc.ts` (type-only, erased at compile time — enforced by
   `server/architectureBoundaries.test.ts`).
2. `server/domain/**` never imports integration internals
   (`integrations/email/gmail/**`, `integrations/llm/gemini/**`). It consumes
   interfaces (`EmailProvider`, `LlmProvider`) resolved via factories.
3. LLM provider is selected by env (`getLlmProvider()`); swapping Gemini for
   another provider touches one adapter file, nothing else.
4. Every mutation flows through a domain service. Agent write-tools delegate;
   they contain no SQL.
5. `recomputeNextAction()` is the sole writer of `next_action_at` /
   `next_action_kind`.
6. Autonomous loop is claimable and idempotent: bounded batch (LIMIT 25),
   lease column (`processing_started_at`), DB-level idempotency key on agent
   runs. No external queue infrastructure in v1.
7. Outbound email remains approval-first: the existing status machine
   (`draft → ready_for_review → student_approved → provider_send_requested → sent`)
   is preserved; the Policy Engine may gate further, never less.

## 4. Application Eligibility Rule (Law III implementation)

Single exported predicate `isApplicationEligible(userId, programmeId)` used by BOTH
the backfill script and all runtime creation paths.

An application exists ONLY when at least one of:

1. **CONFIRMED DEADLINE** — a student-reviewed deadline handoff row exists for the
   programme (`germany_programme_deadline_handoffs`).
2. **OUTREACH HAPPENED** — a communication in status `student_approved`,
   `provider_send_requested`, or `sent` tied to this student + university.
3. **LIFECYCLE EVENT** — an `application_events` row of type
   `application_submitted`, `deadline_confirmed`, or `follow_up_planned`.

NOT sufficient (remains a bookmark): pin, priority rank, decision notes,
research briefings, enabled watch, consultation mentions.

## 5. Status vs Next-Action Orthogonality

`Application.status` (lifecycle) and `nextActionKind` (scheduling) are distinct
unions/enums with zero shared members. Canonical legal pairs:

| status | nextActionKind | meaning |
|---|---|---|
| `awaiting_response` | `FOLLOW_UP` | waiting on university; agent may propose follow-up |
| `awaiting_response` | `NONE` | waiting; nothing due |
| `preparing` | `USER_REVIEW` | student action pending |

`nextActionKind` enum: `NONE | FOLLOW_UP | DOCUMENT_REQUEST | USER_REVIEW |
DEADLINE | APPLICATION_ACTION`. A unit test pins round-trip behavior for all pairs.

## 6. Identity Model

**Database platform: PostgreSQL (Supabase), ported in Phase 1.5.** Connection
uses the transaction pooler (`prepare:false` drivers); `updatedAt` is maintained
by trigger `nightfall_set_updated_at()` (migration `0001`), replacing MySQL's
`ON UPDATE CURRENT_TIMESTAMP`. Upserts use `onConflictDoUpdate` with explicit
per-table conflict targets matching the unique indexes below.

- `programmes` table = first-class identity resolution layer
  (`id`, `source: germany|italy`, `sourceProgrammeId`, `institutionNameSnapshot`
  — display snapshot ONLY, never a university identity; a future `universities`
  table will own that — `displayName`, `officialUrl`, `city`).
  `UNIQUE(source, sourceProgrammeId)`. Backfilled idempotently from both catalogues.
- Germany/Italy catalogue tables remain canonical research/source data.
- `applications`: `UNIQUE(userId, programmeId, intakeLabel)` — country is an
  attribute of the programme, never part of application identity.
  `intakeLabel varchar(40) NOT NULL DEFAULT ''` (empty string, not NULL — MySQL
  unique indexes treat NULLs as distinct). Intake concept present from day one.

## 7. Roadmap

| Phase | Scope | Exit criteria |
|---|---|---|
| 0 | Baseline + this contract | done (see baseline-2026-08-24.md) |
| 1a | `server/integrations/llm/` interface + Gemini adapter | call sites green through factory |
| 1b | `server/integrations/email/` EmailProvider + Gmail adapter; domain import fixed | no domain file imports Gmail directly |
| 1c | Boundary guardrail tests | tests pass |
| 2 | `programmes` registry + `applications` + requirements (+ comms additive cols) + eligibility predicate + backfill | unique constraints hold; backfill dry-run diff clean |
| 3 | Agent orchestrator (context/proposal/policy/executor/registry) + `agent_runs` | proposal→policy→executor path tested; Law I guardrail green |
| 4 | Autonomous loop (claim+lease+batch) wired to heartbeat | overlapping heartbeats provably idempotent |
| 5 | Context assembly refinement inside context builder (no new subsystem) | context covers profile+events+recent runs |
| 6 | Shim deletion, boundary grep enforcement, full validation | check/test/build gates defined vs baseline |

Known pre-existing debt carried into Phase 1 (from authoritative baseline capture 2):
`toggleLanguage` ×4, Date-vs-string types in `JourneyToolsLegacy.tsx` ×8,
tRPC transformer typing in `main.tsx`, handler misuse in `DashboardLayout.tsx`.
None block the build; scheduled as a standalone hygiene commit within Phase 1.
The uncommitted BYO-AI/planLimits workstream present in the tree during capture 1
was external concurrent work — not baseline truth (pristine `cc6ad26` builds green).
