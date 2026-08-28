# Nightfall Validation Boundary

## Completed without a personal browser session

The public landing page, English onboarding handoff, and Arabic waitlist were visually checked at 1280px and 375px widths. The authenticated dashboard route resolved to the onboarding handoff in the managed preview session. Type checking, production build, and the full Vitest suite passed; the suite includes the source-backed university discovery contract.

The deployed deadline-nudge callback was checked from an unauthenticated request and correctly returned `403`, confirming the cron-protected endpoint is mounted and not publicly callable. A temporary platform scheduler smoke job was created only after deployment and removed after inspection; it did not record a dispatch during the observation window, so it cannot be claimed as a live end-to-end reminder-delivery verification.

## Remaining user-session boundary

Calendar preference saving, student-owned scheduler creation, in-app notification appearance, university comparison with saved data, and transcript OCR result review require an authenticated, onboarded student profile with a real uploaded transcript. The personal-browser connector was enabled, but the local browser extension returned a timeout and did not provide that session. These user-owned, data-bearing flows have not been asserted as completed.
