> **Snapshot bằng chứng theo ngày/head.** Môi trường, số liệu và các câu “Draft/chưa/chờ” trong thân thuộc thời điểm đã ghi; không là trạng thái hay quyền vận hành hiện tại. Xem [status](../PROJECT_STATUS.md) và [bản đồ tài liệu](../DOCUMENTATION_MAP.md). Không chạy lại lệnh lịch sử trên pilot đang dùng.

# Issue #33 — local / CI outbox validation, 2026-10-24

Refs #33 / [Draft PR #42](https://github.com/cfotel2604/html-share-platform/pull/42). Base fetched `origin/main` `40b0dd9f03d951ae8d98064e265f953e250b4a75` (PR39/41 merged; Issues32/35 closed). Implementation `9a0b1f6ec47de5b31b4a78a8469f0d3b64b136c2`; additional dispatch regression guard `004792a4c8326e6b24cbc8708cf7dc4b8ca5c352`. [Contract/runbook](../PUBLIC_PROJECTOR.md).

## Commands and exact revisions

| Revision / environment | Commands and result |
| --- | --- |
| `9a0b1f6`, local source | `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`: PASS,129tests. `npm run build`: PASS after retry; first attempt compiled then stopped on the inherited Next16.4.0 security nudge. Existing #40 remains separate; no runtime dependency upgraded. |
| `9a0b1f6`, local standalone | SQL SHA-256 source/bundle match `ff144dac0eefbcc8ddd2532368618992bb6c506eab8ceacd5777ce3664f99166`; packaged job with both execution flags0 exits1 with static `projector_stopped`, no provider/PG startup. `.next/BUILD_ID` present. |
| `9a0b1f6`, GitHub runner | [Foundation/application + public-outbox](https://github.com/cfotel2604/html-share-platform/actions/runs/40086080641), [security integration](https://github.com/cfotel2604/html-share-platform/actions/runs/40086080510), [docs](https://github.com/cfotel2604/html-share-platform/actions/runs/40086080530): SUCCESS. Security covers existing real PostgreSQL/MinIO auth, ownership, audit, policy locks, preview, link lifecycle and500file readback. New public-outbox job applies all additive PostgreSQL migrations to its empty disposable database and passes4integration groups. |
| `9a0b1f6`, local benchmark | `npm run bench:projection`: PASS; PGlite PostgreSQL + Miniflare D1 + synthetic S3 readback,12events/12RESTbatches at the production5second throttle. Values below. |
| `004792a`, dispatch guard | Existing admin source scan additionally rejects projector/D1 imports/config/table use; new runtime-script scan permits REST credentials/dispatch only in the separate projector. Local lint and130tests PASS. [Foundation: application130tests + public-outbox4groups](https://github.com/cfotel2604/html-share-platform/actions/runs/40086237194), [security integration](https://github.com/cfotel2604/html-share-platform/actions/runs/40086237483), [docs](https://github.com/cfotel2604/html-share-platform/actions/runs/40086237208): all SUCCESS at this exact head. |

CI uses new isolated GitHub runner services only. No local Docker/VM command or owner worktree/private file was used. Only a test-only PGlite dev dependency was added; production dependency versions are unchanged. `git diff origin/main -- db/migrations/0001* db/migrations/0002* db/migrations/0003* cloudflare/read-model` is empty: applied PostgreSQL and D1 contract/schema files are byte-unchanged.

## Evidence by acceptance

- Empty and legacy PostgreSQL fixtures apply the additive outbox migration. Legacy sites/versions remain byte-equivalent and queue starts empty. Source rollback also rolls back the outbox. Deferred snapshot coalesces final state, including transactions switching constraints to immediate mode.
- Real PostgreSQL competing connections prove site-row serialization and increasing revisions; uncommitted events are invisible. Separate projector connections contend on the advisory lock. No source transaction is held open across REST.
- Projector off: production Node upload/publish, unpublish and revoke commit to PostgreSQL with no D1 call. Restart drains each site's events in order; final state is revoked. Duplicate/older replay leaves the D1 row unchanged. Rotation produces one batch containing old revoked/new published codes.
- Lost D1 acknowledgment keeps a pending event; retry produces no duplicate effect.429 respects longer Retry-After, alerts, backs off the event and freezes other eligible sites via durable shared cooldown.401/403 retain the queue and emit an auth failure. Token-shaped custom error text is replaced by a static code.
- Site chains containing revokes outrank normal work, preserving per-site FIFO. Revoke-age warning uses actual tombstones, stays explicitly `proposal_only` and exposes no payload/identity. Different target fingerprints are refused after the first binding.
- Admin list/workspace DTO contains pending depth/age/static error, Employee DTO omits it. Studio changes only the pending label. Existing Node authorization and all lab security regression groups remain green.
- Source audit (`rg` for provider endpoint, `D1_PROJECTOR`, D1 table and projector imports) finds dispatch only in `scripts/lib/public-projector.mjs` and its separate CLI. Source/runtime scans fail regression tests if administration gains those paths. There is no rebuild tool yet (#34), no Worker writer added, and no handler dual-write.
- A published legacy manifest lacking a verified ETag cannot create an invalid public event: source COMMIT fails atomically. Unpublish/revoke still commit. Existing rows are not auto-projected/backfilled; use a verified Node reupload before later republish/rotation. Review this before any runtime PostgreSQL migration.

## Latency measurements

Nearest-rank percentiles, **6samples per group**, alternating1/500files,12events and exactly12RESTbatches per run. Clock: Node monotonic time after source COMMIT acknowledgment through projected-marker acknowledgment. Includes intentional persisted5second spacing. Synthetic conditional PUT/readback validates500files before COMMIT; live R2 upload/network latency is not measured. D1 is local Miniflare in both runs.

| Exact head / environment | Files | n | p50 (ms) | p95 (ms) |
| --- | --- | --- | --- | --- |
| `9a0b1f6`, Windows PGlite/local D1 | 1 | 6 | 4995.435 | 4997.553 |
| `9a0b1f6`, Windows PGlite/local D1 | 500 | 6 | 4951.957 | 4958.646 |
| `9a0b1f6`, CI PostgreSQL16/local D1 | 1 | 6 | 4989.143 | 5004.257 |
| `9a0b1f6`, CI PostgreSQL16/local D1 | 500 | 6 | 4914.590 | 4945.739 |
| `004792a`, CI PostgreSQL16/local D1 | 1 | 6 | 4989.780 | 4994.840 |
| `004792a`, CI PostgreSQL16/local D1 | 500 | 6 | 4914.006 | 4935.046 |

These small local/CI samples demonstrate code behavior under the selected throttle, **not pilot performance or Worker404 propagation**. Operational metrics use actual PostgreSQL commit time only when available; otherwise label the conservative enqueue upper bound. The60second default alert is still an owner-unconfirmed proposal. REST outage/429 cooldown can exceed it; no accepted revoke SLO is claimed.

## Authorized read-only pilot check

Owner explicitly allowed Cloudflare CLI read-only checks and preparation of a new private target config. Wrangler4.152.0 identity/database discovery was held in memory; private outputs/credential values were suppressed. A single constant `SELECT ? AS number_value, ? AS null_value` with `[7, null]` in a REST batch succeeded, returned exactly7/NULL and `meta.changed_db=false`. Target name was `hsp-pilot-desktop`, database metadata reported replication disabled. No public content, identities or legacy rows were read. This validates [REST batch shape/binding](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/), not an outbox projection.

A new task-owned ignored target file was created only after those assertions passed, with no token and both enable/remote-approval flags false. No projector token was created/retrieved, no projector called remotely, no D1 migration reapplied and no D1 write made. This check does not replace the private-receipt/target/schema/primary recheck required for a later explicitly approved remote step.

## Owner decisions and remaining work

Owner selected the existing account, dedicated `hsp-projector-pilot` token with D1 Read/Write only, Node VM secret-store injection only,90day/incident rotation and emergency dashboard revocation. Full sequence is in the runbook. No token value is in config, Git, logs, response, PR or this evidence.

Still **unverified / not authorized here**: real PostgreSQL migration on VM, Node secret installation/restart, actual projector batches to pilot, live R2 readback/IAM/latency, pilot p50/p95 and Worker revoke404 propagation. Remote projector execution needs a separate concrete owner approval. Worker #36 and rebuild #34 are not implemented here. No merge/deploy or applied-migration edits occurred.

Fast-track owner instruction: one Draft branch/PR per issue, #33 → #34 → #36 → #37, then prepare #38. Continue only after the owner merges the preceding PR; refresh main and live dependencies first. Never auto-merge/deploy or treat source merge as remote-execution approval. Official revoke SLO remains open; old stacked-PR disposition is a proposal for owner review in #37.
