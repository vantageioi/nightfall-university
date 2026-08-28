# Student Inbox Response Sync — Gmail Research Note

For a future Gmail-first inbox connection, Gmail supports server push notifications through Google Cloud Pub/Sub. Nightfall would need a Google Cloud project, a Pub/Sub topic, publish access for `gmail-api-push@system.gserviceaccount.com`, and a push or pull subscription that delivers mailbox changes to a Nightfall-controlled endpoint. The `users.watch` call returns a `historyId` and expiration; Google requires renewing the watch at least once every seven days and recommends daily renewal. The change event itself is not the message body: Nightfall must use `history.list` from the stored history ID to identify relevant changes and persist the new history ID.

The initial approval-first release should not implement this integration until the product has an approved Google OAuth configuration, consent copy, token encryption strategy, webhook verification, and a student-controlled disconnect path. Gmail push notifications may be delayed or dropped, so any later sync design needs an idempotent reconciliation fallback. A Gmail watch requires a suitable Gmail OAuth scope; choose the least-privileged scope compatible with the final approved draft/send and response-reading features.

## Sources

1. [Configure push notifications in Gmail API](https://developers.google.com/workspace/gmail/api/guides/push), Google Developers, accessed 2026-08-21.
2. [Gmail API `users.watch` reference](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/watch), Google Developers, accessed 2026-08-21.
