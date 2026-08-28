# Approval-First University Follow-Up Contract

Nightfall’s university relationship workspace is a **student-owned communication record**, not an autonomous outreach system. Each contact and thread belongs to one student. The only permitted outbound path is a send action explicitly initiated by that student from Nightfall after they review the final subject, recipients, and body. No scheduled job, AI completion, response classifier, or staff workflow may send email on the student’s behalf.

## Data model

| Entity | Purpose | Required safeguards |
| --- | --- | --- |
| `university_contacts` | Stores a student’s university-office contact, public portal URL, relationship stage, and contact preference. | Every row is scoped to `userId`; the university email must be entered or confirmed by the student. |
| `university_communications` | Stores local AI drafts, sent-message metadata, imported replies, review state, and a permanent action history. | A draft cannot become `sent` without a verified student approval event and provider confirmation. |
| `university_follow_up_plans` | Stores student-requested dates and reasons for a future check-in. | A due plan only creates an in-app reminder or draft suggestion; it can never dispatch email. |
| `student_inbox_connections` | Stores the minimum provider metadata and encrypted refresh credential needed for the student’s own inbox connection. | Connection is opt-in, can be disconnected by the student, and must never be exposed to the client. |

## Communication lifecycle

`draft` → `ready_for_review` → `student_approved` → `provider_send_requested` → `sent` / `send_failed`.

Inbound replies are recorded as `received` and categorized as `general`, `document_request`, `interview`, `decision`, `next_step`, or `needs_review`. AI may suggest a category and a next action but may not mark a university response as resolved, create commitments, change an application, or send a reply.

## Product safety boundaries

1. Every outbound delivery requires a visible, deliberate **Send from my inbox** action.
2. Follow-up dates create only an in-app cue. There are no pre-approved auto-send rules.
3. A send attempt requires a recipient, subject, body, student approval timestamp, and audit event. Provider success is recorded separately from approval.
4. Nightfall does not discover or enrich personal contact details automatically in this first release. Students add or confirm public admissions-contact details themselves.
5. A student can disconnect their inbox and delete an unsent draft. Historical activity records remain private to their journey.

## Gmail integration boundary

The production Gmail path requires a student OAuth connection, server-side token protection, and Google project configuration. Gmail’s `users.watch` supports inbox-change notifications through Google Cloud Pub/Sub, but a watch must be renewed before expiry (Google requires at least every seven days and recommends daily) and the resulting history IDs must be processed idempotently.[1] The initial CRM release may ship the approval workspace before OAuth credentials are available; it must visibly label inbox sending and reply sync as **not connected** rather than simulate delivery.

## References

[1]: https://developers.google.com/workspace/gmail/api/guides/push "Configure push notifications in Gmail API"
