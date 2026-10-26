> **Snapshot bằng chứng theo ngày/head.** Môi trường, số liệu và các câu “Draft/chưa/chờ” trong thân thuộc thời điểm đã ghi; không là trạng thái hay quyền vận hành hiện tại. Xem [status](../PROJECT_STATUS.md) và [bản đồ tài liệu](../DOCUMENTATION_MAP.md). Không chạy lại lệnh lịch sử trên pilot đang dùng.

# Issue #35 — Node/PostgreSQL administration validation

2026-10-24 (Asia/Saigon), [Draft PR #41](https://github.com/cfotel2604/html-share-platform/pull/41), `Refs #35`. Base `664e6c07af59b56fea421ec00cce639c7b3487d8`; implementation `da92385d4531d07884aafa228d7fec135c207891`. [Contract/runbook](../NODE_POSTGRES_ADMIN.md), [ADR-0006](../adr/0006-postgresql-source-of-truth-d1-public-read-model.md).

## Baseline and isolation

Fetched origin/pruned and inspected status/worktrees/remotes. Live GitHub verified PR39 MERGED at664e6c0, Issue32 CLOSED, Issue35 OPEN and old PR19/21–24/27/29 still Draft. The #32 handoff is historical. New managed worktree `35-node-postgres`, branch `feat/35-node-postgres-admin`; Draft41 opened early with scoped plan2ffcb26.

D1-primary/API Worker/token bridge code exists only in the unmerged old stack, which was not imported. Main already used Node/PostgreSQL and hostname preview; this change locks out legacy configuration and fills bootstrap/readback gaps.

No owner worktree/private env/receipt, live D1/R2/Worker, VM or local Docker was accessed. No remote migration0004/provision/deploy/merge command ran. PostgreSQL SQL0001–0003, Cloudflare read-model SQL/config, package manifests/lockfile, Dockerfile and Compose files match base. Existing read-model unit tests use disposable local D1 emulation, without credentials/remote APIs.

## Local evidence at da92385

Windows/Node24.20.0, synthetic data only:

| Command/check | Result |
| --- | --- |
| `npm ci --no-fund --no-audit` | PASS; dependencies unchanged |
| `npm run lint` / `npm run typecheck` | PASS |
| `npm test` | **113/113 PASS** |
| `npm run build` | Compile/types/pages PASS; initial inherited Next16.4.0 advisory stop, retry + standalone packaging PASS with warning still present |
| `python -B scripts/check_docs.py`, `python -B scripts/check_yaml.py`, `git diff --check` | PASS; repeat on docs follow-up |
| `rg` src/scripts for Worker origins, Cloudflare API/service keys, D1 REST and session mint/refresh functions | No administration match |
| Standalone bad-backend probe on ephemeral loopback | Startup guard observed, readiness500, never ready. Listener/process may remain until terminated; rejection does not promise process exit |

New tests cover backend rejection before clients, PostgreSQL-only readiness, one bootstrap/in-flight coalescing/retry without completed-auth cache, actual Node Clerk chain once plus local policy/listing, denied/guest/foreign-host behavior, no Worker/D1 call, actual500entry ZIP parsing with500conditional PUT/readback pairs before activation/COMMIT, size/ETag/hash/stream failures, rollback and preservation of uncertain/colliding keys. Existing RBAC/ZIP/CSRF/storage/COMMIT/share/viewer tests pass. Preview implementation and sandbox policy are unchanged. Unit storage transport is synthetic, not live R2.

## Exact-head GitHub CI

All three checks SUCCESS at `da92385d4531d07884aafa228d7fec135c207891`:

- [Documentation](https://github.com/cfotel2604/html-share-platform/actions/runs/40079567499), completed15:50:17 Asia/Saigon.
- [Application lint/typecheck/113tests/build](https://github.com/cfotel2604/html-share-platform/actions/runs/40079567505), completed15:50:55.
- [Auth/upload/origin](https://github.com/cfotel2604/html-share-platform/actions/runs/40079567676), completed15:52:10, disposable GitHub runner with real PostgreSQL/isolated MinIO. No Worker/D1 service/credential exists in that stack; no local Docker was invoked.

Integration confirms the workspace HTTP payload/no-store/guest-empty/viewer404 and a500-file Node ZIP finalize, committed PostgreSQL500-entry manifest/active pointer, then independent reads of all500 S3 objects matching bytes/size/SHA-256/pinned ETag. Conditional overwrite412 preserves original bytes. Existing suites also pass Employee A/B isolation, denied updates/status with no writes, Admin actor audit, policy row locks, unpublished preview site/version/TTL/revoke, rotate/revoke/reissue/tombstones and lost-COMMIT recovery. These are production Node functions/routes and real PostgreSQL transactions.

Follow-up changes documentation only; latest-head CI is recorded on PR41. Evidence at da92385 is not inferred for later heads.

## Acceptance and remaining gates

| #35 acceptance | Evidence |
| --- | --- |
| Admin create/upload/publish/unpublish/revoke/rotate commit without Workers/D1 | PASS PostgreSQL integration, existing auth/share suites and500file upload |
| No administration Worker/D1 path | PASS source scan, rejection boundaries, no-network regression; old stack not imported |
| Node RBAC/ownership/audit | PASS unit + PostgreSQL integration, including fresh policy/Admin audit |
| 500file finalize/readback without Worker limits | PASS Node pipeline + PostgreSQL/S3-compatible integration |

**Not verified:** live private R2/IAM/provider failures/500file latency, real Clerk/VM cutover, runtime, public projection or browser/mobile matrix. MinIO does not prove R2live; those require separate #38/#10 authorization. No owner private configuration/resource was accessed to fill them. Inherited Next/Zod remediation stays in Issue40.

Keep PR41 Draft/Issue35 OPEN for owner source review/merge. Outbox/projector33, publicWorker36 and D1 writes remain outside scope. Rollback retains schema/data/additive manifest fields; the runbook records confirmed-key cleanup and uncertain-write orphan limitations.
