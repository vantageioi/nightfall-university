# Nightfall UI/UX Rework — Preservation Audit

## Scope and Intent

This rework will replace the current visual hierarchy, interaction affordances, responsive layout, and shared styling while retaining the existing routing, authentication, API calls, local state transitions, approval controls, data contracts, and bilingual English/Arabic experience. The application is a React 19, TypeScript, Vite, Tailwind CSS, Wouter, tRPC product with a fixed dark-theme shell and a client-side operations prototype.

## Existing Functional Contracts

| Area | Current contract that must remain unchanged | Primary implementation location |
| --- | --- | --- |
| Public site | Navigation to onboarding, sign-in, and waitlist; English/Arabic language state; ambient audio control; scroll-to-section controls | `client/src/pages/Home.tsx` |
| Access | Email-code request and verification, registration/sign-in, password validation, Google auth link, and routing after authentication | `client/src/pages/Access.tsx` |
| Onboarding | Fifteen-step conversational assessment, answer validation, local draft persistence, consent, account unlock, profile save, consultation initialization, and redirect to recommendations | `client/src/pages/ConsultantOnboarding.tsx` |
| Journey routing | Auth and onboarding gates; path/query-driven tool selection; `JourneyHome`, recommendations, and legacy-workspace selection; language behavior | `client/src/pages/JourneyTools.tsx`, `client/src/pages/JourneyToolsLegacy.tsx` |
| Consulting | Conversation state, `consult` mutation, new-consultation restart, remaining-use rules, and full-intake reset route | `client/src/pages/JourneyToolsLegacy.tsx` |
| Discovery | Catalogue filtering; local shortlist creation; Germany programme research, filtering, saved/archived/pinned lifecycle, priority ordering, decision notes, comparisons, briefings, and deadline handoffs | `client/src/pages/JourneyToolsLegacy.tsx`, `client/src/components/ProgrammeResearchPanel.tsx` |
| Comparison | Up-to-three saved university selection, query-string comparison selection, desktop table and mobile swipe behavior, last-viewed tracking | `client/src/pages/JourneyToolsLegacy.tsx` |
| Calendar | Month navigation, date displays, programme deadline update/removal, reminder cadence, notification read state | `client/src/pages/JourneyToolsLegacy.tsx` |
| University communication | Confirmed contacts, AI draft preparation, draft saving, approval-first sending, inbound Gmail sync/review, follow-up planning/completion, notification acknowledgment | `client/src/pages/JourneyToolsLegacy.tsx`, `client/src/components/UniversityRelationshipWorkspace.tsx` |
| Documents | Drag/drop and file-browser upload, type/size guard, transcript extraction, file opening, extraction review display | `client/src/pages/JourneyToolsLegacy.tsx` |
| Source watch | Official-source watch toggles, watch preferences, reviewed change alerts | `client/src/components/UniversityWatchPanel.tsx` |
| Operations | URL-derived section navigation, command palette, app filter views, local case drawer updates, local review/acknowledgment controls, toast feedback | `client/src/pages/Operations.tsx` |

## Current UX Constraints

The existing interface has a credible visual identity but relies on dense, near-monochrome panels, repeated low-contrast borders, very small metadata text, and several independently styled experiences. The dashboard’s legacy workspace is functionally dense yet lacks a consistently persistent navigation model, a shared page header pattern, and clear action prioritization. On smaller screens, several working areas become long sequential pages before the user can reorient themselves.

The rework should preserve the existing dark Nightfall mood while adding a richer indigo-and-aurora palette, more deliberate contrast and spacing, warmer editorial typography, clearer primary actions, accessible focus states, a unified responsive shell, and route-consistent feedback states. No backend route, mutation, data shape, or policy boundary should change.

## Baseline Validation

The initial TypeScript check completed successfully before tests began. The test run reached the suite and surfaced an existing configuration-dependent failure in `server/gmailConnection.test.ts`: `Gmail connection is not configured yet.` The runner then remained open after its output, so it was stopped. This failure is unrelated to frontend behavior and will be treated as a baseline environment limitation during final verification.

## Implementation Guardrails

1. Preserve every existing import-level data dependency and mutation callback.
2. Preserve English/Arabic text selection and RTL layout behavior.
3. Preserve query-string navigation semantics for dashboard tabs, comparison selection, and discovery mode.
4. Preserve all approval-first messaging boundaries, especially university sending and research-decision language.
5. Keep the server and domain layers untouched unless a frontend build failure proves a type-only adjustment is necessary.
6. Validate modified code with the TypeScript check, a production build, and focused tests not requiring Gmail configuration.
