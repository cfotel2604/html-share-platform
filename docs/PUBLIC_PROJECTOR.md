# Transactional public outbox / Node projector — Issue #33

Refs #33 / Epic #31, [ADR-0006](adr/0006-postgresql-source-of-truth-d1-public-read-model.md), [read-model contract](D1_PUBLIC_READ_MODEL.md). Base freshly fetched main `40b0dd9f03d951ae8d98064e265f953e250b4a75` (PR39/41 merged, Issues32/35 closed). Work is on `feat/33-transactional-outbox`.

## Source transaction and ordering

The new **PostgreSQL** migration `db/migrations/0004_public_projection_outbox.sql` is independent of the already applied **D1** migration0004. Neither applied SQL series changes. Apply the PostgreSQL migration with the existing checksum/transaction/advisory-lock runner only in an authorized environment; no VM migration has been run by this task.

PostgreSQL triggers capture site status, active-version and share-link changes in the same source transaction. The site row lock precedes revision allocation; `id` is a positive JavaScript-safe integer and the D1 `projection_version`. One row per site/source transaction coalesces its changed codes. A deferred constraint trigger snapshots the final public state before COMMIT, including the verified manifest written by Node. Snapshot failure rolls back the source change and audit together. There is no REST request, projector import or dispatch after COMMIT in a request handler.

`public_projection_outbox` retains payload, order, pending/projected state, attempt count, next attempt, sanitized last error and projected timestamp. Its payload has exactly the seven public fields and four asset fields in the [D1 contract](D1_PUBLIC_READ_MODEL.md). Share links remain permanent tombstones. Rotation captures the old-code tombstone and new code in **one event / one REST batch**. Per-site FIFO is mandatory; chains containing revocations outrank other sites, with denial chains next. An older failed publication can delay its revoke until REST recovers; priority never permits a later publication to follow a newer revoke.

The additive migration leaves existing site/version rows unchanged and does not enqueue/backfill them. **Existing published versions without verified ETags require a new verified Node upload before republish/rotation.** Those source transactions fail atomically; unpublish/revoke remain available. Do not invent ETags or read legacy R2 objects from a migration. A zero-depth outbox does not prove a historical database has been rebuilt; rebuild/reconciliation belongs to #34.

## Separate Node job and REST budget

`npm run project:public` starts the manual job, never the web server. It requires **both** `PROJECTOR_ENABLED=1` and `PROJECTOR_REMOTE_APPROVED=1`, an explicitly approved target and Node secrets. Defaults are disabled; do not enable the pilot using this document as authorization. The standalone build includes `scripts/` and the exact `project.sql`, with no Worker configuration or D1 migration bundled.

| Setting | Behavior |
| --- | --- |
| `D1_PROJECTOR_ACCOUNT_ID`, `D1_PROJECTOR_DATABASE_ID` | Explicit target; first startup pins its SHA-256 fingerprint in PostgreSQL. A later different target is refused. Rebuild/target replacement needs a separate plan. |
| `D1_PROJECTOR_API_TOKEN` | Read only from the Node process environment, supplied by its secret store. No CLI credential discovery. |
| `PROJECTOR_INTERVAL_MS` | Default/minimum5000ms, maximum300000ms; durable slot shared by all instances using this source database. |
| `PROJECTOR_REVOKE_ALERT_MS` | Default60000ms, configurable1000–86400000ms; owner confirmed pending>60s warning for #38. Keep60000 for this pilot gate; do not silently relax it. Healthy revoke SLO is separate from this detector. |

A PostgreSQL session advisory lock serializes job instances. Before sending, the job durably reserves its next slot and records the attempt. It makes one POST batch per event/attempt with the **unchanged** guarded SQL from `cloudflare/read-model/queries/project.sql`; rotation needs no preflight or per-file REST call. Each code is guarded independently in the atomic D1 batch, so duplicate/older events cannot overwrite newer state or resurrect tombstones. A lost D1 acknowledgment leaves the event pending for safe replay.

The hard5second spacing permits at most60 calls per5minute window per source database, leaving headroom under the [shared Cloudflare API limit](https://developers.cloudflare.com/fundamentals/api/reference/limits/) of1200 requests/5minutes. This does not reserve quota against other account clients or other source databases. Monitor the shared budget. REST errors retry with exponential backoff capped at5minutes;429 and401/403 alert and freeze the shared job for at least5minutes, respecting longer `Retry-After`. The fixed HTTPS endpoint rejects redirects and times out at15seconds. Provider errors/bodies, SQL, token and payload never enter logs/errors; only an allowlisted error code is persisted.

## Observation and Admin status

JSON events expose `projector.projected` (attempt, `lag_ms`, `lag_basis`), `projector.metrics` (pending depth, pending revocations, oldest revoke age), `projector.rate_limited`, `projector.auth_failed`, `projector.retry` and local DB/tick failures. A collector must route rate/auth failures and `projector.revoke_over_proposal` as operational alerts; this task adds no external notification destination. Metrics emit every60seconds while the job runs, including during cooldown. If the job itself stops, the external process/heartbeat monitor must detect missing metrics; queued state remains available in PostgreSQL/Admin.

Owner confirmed #38 (2026-10-24): healthy COMMIT-revoke→public404 p95≤60s; any revoke pending>60s warns/Admin shows pending. These thresholds are not a60s blocking guarantee during projector/REST outage. Report outage latency/depth/recovery/containment separately, never pool or hide them in healthy p95. The existing `projector.revoke_over_proposal` event name and local benchmark `proposal_only` field are inherited labels, not current policy. Keep them observable; record real alert emission/delivery latency, metrics cadence and missing-telemetry handling in the [pilot ledger](PILOT_APRIME_ACCEPTANCE.md). No remote collector/monitor was installed by this document.

Lag uses the actual PostgreSQL commit timestamp when `track_commit_timestamp` is already enabled and the timestamp is retained (`lag_basis=commit`). Otherwise the deferred snapshot timestamp gives a conservative enqueue-to-projected upper bound (`enqueue_upper_bound`), not an exact commit measurement. The job never changes PostgreSQL settings. Benchmarks separately use Node's monotonic clock after source COMMIT acknowledgment through projected-marker acknowledgment. [Validation and p50/p95](validation/2026-10-24-public-projector.md) distinguish local emulation, CI PostgreSQL and the still-unrun pilot.

Admin `SiteSummary` in `/api/sites` and `/api/workspace` gains `projection: { pending, pending_events, oldest_pending_at, last_error }`. Employee responses omit the field. Studio adds only the pending/retry label; explicit refresh/bootstrap/mutations retrieve it, with no new idle polling. Errors contain static codes only. The label reports pending work, not an independent proof that D1 matches every historical row.

## Owner-approved token policy — 2026-10-24

Use the **existing pilot account**, with a separate token named **`hsp-projector-pilot`**, D1 Read/Write only: no Workers, R2 or account administration; never shared with Wrangler/dashboard. D1 permission is account-scoped, so the explicit target pin is essential. Store the value only in Node's VM secret store and load at job startup; never Git/log/response/PR/chat, shell arguments or checked-in config. No projector token has been created or retrieved in this task.

Rotate every **90days**, and immediately on suspected disclosure, administrator change or suspected VM compromise:

1. Create a replacement with the same scope.
2. Update the Node secret store, restart the projector and verify normal outbox drain.
3. Revoke the old token on the dashboard.
4. Record only the rotation date and token name in validation documentation.

Emergency: revoke immediately on the dashboard. Projection fails closed, outbox accumulates/alerts and Admin shows pending status. The intended public D1+R2 reader does not use this token; already projected public state remains independently readable. Replace/verify before resuming. This task performs none of those token/VM operations.

## Remote gate and rollback

The owner authorized read-only Cloudflare CLI checks and preparation of a new ignored task-owned target file. A constant SELECT verified REST batch numeric/NULL binding, `changed_db=false`, and replication disabled; this is **not a projector run**. The prepared target file contains no token and keeps both execution gates false. No owner private config/worktree was read or changed.

Actual `hsp-pilot-desktop` projection, VM migration/secret installation/restart and Worker deployment still need separate authorization. Recheck target, read-model schema/ledger and primary/replication policy before proposing that concrete step; do not reapply D1 migration0004. Pilot p50/p95 and Worker404 revoke propagation are unverified. The healthy60second SLO/pending warning are now owner-confirmed for #38; no successful pilot measurement or outage guarantee follows from that decision.

Rollback: stop/disable the job, retain pending/projected events, source data, schema and tombstones. Fix and replay safely; do not reset sequences, delete history, reverse-write D1 into PostgreSQL, edit applied migrations or restore the removed Cloudflare administration backend. Existing source operations can continue queuing; public denial changes wait until projection recovers. Retention/purge/rebuild are outside #33. PR stays Draft for owner review/merge; no automatic merge/deploy.
