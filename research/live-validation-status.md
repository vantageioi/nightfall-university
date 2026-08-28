# Nightfall live validation status

## Confirmed in an authenticated production session

The student dashboard rendered two saved universities in the comparison view. TU Berlin and the University of Bologna both showed their persisted tuition, named scholarship, admission-requirement, and eligibility evidence.

The deadline calendar rendered the saved TU Berlin deadline and the enabled daily deadline-nudge controls. Aggregate database checks confirmed that one enabled reminder preference has a scheduler task identifier. The deployed deadline callback rejects unauthenticated requests, and retry safety is enforced by a stable alert key plus a database unique index.

The transcript workspace rendered an existing private OCR review card, including a GPA/average, extracted academic summary, and course-grade chips. This validates the review-first presentation without uploading a new personal document.

The TU Berlin official-page watch was enabled with the student's approval. Its initial official-source cache and concise summary were created, and aggregate database checks confirmed one enabled weekly watch preference with a scheduler task identifier.

## Remaining boundary

Authenticated mobile captures were completed through the managed preview after direct tab links were added. `/dashboard?tab=compare&compare=all` showed the selected TU Berlin and University of Bologna cards with their evidence; `/dashboard?tab=calendar` showed the January 2027 deadline calendar, active reminder controls, and alert empty state; `/dashboard?tab=watch` showed the active TU Berlin watch, cached source state, and weekly rhythm; and `/dashboard?tab=documents` showed the private OCR review cards. The layouts remained legible at 375×812 without horizontal page overflow.
