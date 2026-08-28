# Guided My Journey Validation Notes

## Automated verification

The staged journey resolver is covered by focused tests for orientation, first-option review, shortlist building, comparison eligibility, communication precedence, and premature direct-tool fallbacks. The full suite passed with **34 test files and 82 tests**. The production build also passed after the guided shell, Decision Room, contextual tool menu, and saved-programme comparison handoff were introduced.

## Preview-session limitation

On 22 August 2026, desktop/mobile preview captures of `/dashboard` and `/dashboard?lang=ar` ran without an authenticated student session and therefore only showed the protected-route loading state. This does not verify the signed-in Application Progress Home visual composition.

The remaining field check requires a real signed-in student account to review the English and Shami Arabic flows across the following state transitions: Consultant result, first three options, save first option, save second option, compare saved programmes, set a priority, and enter a contextual preparation surface. No email should be sent during that validation.

## Consultant preview follow-up

Two 390px captures were attempted after the free-assessment refinement. The English route remained in the protected-route loader because the capture did not receive an active session. The Arabic route used an already-complete session and redirected to My Journey, as designed, rather than presenting a fresh Consultant. The build and focused Consultant contract tests passed, but a clean browser session is still required to visually validate the expanded first assessment from its initial prompt through its account-unlock boundary.
