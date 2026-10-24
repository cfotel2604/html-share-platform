# Transactional public outbox / Node projector — Issue #33

Refs #33 / Epic #31, [ADR-0006](adr/0006-postgresql-source-of-truth-d1-public-read-model.md), [read-model contract](D1_PUBLIC_READ_MODEL.md). Base freshly fetched main `40b0dd9f03d951ae8d98064e265f953e250b4a75` (PR39/41 merged, Issues32/35 closed). Work is on `feat/33-transactional-outbox`.

## Implementation plan

- New additive PostgreSQL migration only. Capture public state/share-code changes in the source transaction; coalesce one event per site/transaction and finalize its public-only snapshot at commit. Serialize revision allocation under the site row lock. Rotation includes old-code tombstone and new-code snapshot in one event/batch. Applied PostgreSQL and D1 SQL remain immutable.
- A separate opt-in Node job reads pending events and sends one idempotent REST batch per event using the exact existing `project.sql`. Preserve per-site order; prioritize chains with pending revocations across sites. No D1 write or network dispatch in a request handler.
- Persist throttle/cooldown in PostgreSQL, serialize projector instances and leave substantial headroom under Cloudflare's shared1200requests/5minutes quota. Handle429 with alerts and shared cooldown; retry failed/uncertain events with backoff. No event loss on crash or lost acknowledgment.
- Log only sanitized operational metrics (depth/attempt/lag/error code). Lag must identify its clock basis: true commit timestamp when already available, otherwise conservative enqueue-to-project upper bound. Benchmarks record explicit COMMIT acknowledgment-to-projection samples. The proposed60second warning remains configurable and **not owner-approved acceptance**.
- Admin-only per-site pending status in the existing Studio/API; no other UI work. No Worker, rebuild, pilot D1 write, deployment, VM/local Docker or owner private-file/worktree change.

## Decisions and gates still open

Owner must decide the Cloudflare account containing the projector token and its rotation/revocation procedure. No account/token is selected or provisioned here. Token values must never be pasted into chat, logs, Git, responses or command arguments. Real `hsp-pilot-desktop` projection requires separate explicit remote approval after local tests. Pilot p50/p95 and revoke propagation remain unverified until that approved step; local/CI results will be labeled separately.

Implementation and validation are in progress. The Draft PR will record commands, exact tested heads, local rollback/replay/500-file measurements and remaining gates. PR stays Draft for owner source review/merge; no automatic deployment.
