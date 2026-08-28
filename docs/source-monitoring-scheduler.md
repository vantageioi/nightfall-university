# Source Monitoring Scheduler

Nightfall checks opt-in official programme-source watches through a production scheduler. The job only creates review alerts when the normalized official-page content hash changes; it never changes a programme plan, sends outreach, or claims a requirement is satisfied.

The production scheduler makes an authenticated **HTTP GET** request to the configured path. The route compares the incoming bearer token with `CRON_SECRET`, and the daily runner is idempotent through the `scheduler_runs` ledger. A once-daily UTC schedule is used so the same approach remains valid on Vercel Hobby, where cron jobs can run only once per day and may be invoked within the nominated hour.

The runner must tolerate missed or duplicated deliveries by reprocessing outstanding enabled watches and relying on content-hash and alert-key uniqueness rather than incrementing state blindly.

## Reference

- [Vercel Cron Jobs documentation](https://vercel.com/docs/cron-jobs), accessed 2026-08-28. Vercel documents GET invocation, UTC schedules, and Hobby daily-frequency limits.
- [Vercel Managing Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs), accessed 2026-08-28. Vercel documents `CRON_SECRET` bearer authorization and idempotent/reconciliation-oriented execution.
