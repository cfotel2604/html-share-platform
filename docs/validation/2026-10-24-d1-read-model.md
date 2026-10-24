# Issue #32 — D1 public read model validation

2026-10-24 (Asia/Saigon), Issue #32 / Epic #31 / [Draft PR #39](https://github.com/cfotel2604/html-share-platform/pull/39). Base `origin/main` is PR #30 merge `8ce25b1eacb69ee6b9d938b80a04033920f8c71f`; branch `feat/32-d1-public-read-model`, implementation `b18d2a23d5ee9de4b55b195daf1d96fbb8215ea4`. [Contract/migration](../D1_PUBLIC_READ_MODEL.md), [ADR-0006](../adr/0006-postgresql-source-of-truth-d1-public-read-model.md).

## Sources and scope

Startup verified primary checkout `main` at `78cb7ca`, 55 commits behind freshly fetched `origin/main`; status clean. Implementation uses a new managed worktree from `8ce25b1`, preserving the owner's checkout, other worktrees and untracked/private data. PR #30 is MERGED with its application/docs checks successful. Live GitHub still has Draft PRs #19, #21–#24, #27 and #29; Issues #10/#20/#25/#26/#28 and A' #31–#38 remain open. Historical 22 October lab/handoff records are not current provider evidence.

ADR-0005 serving context was read from PR #21 branch `codex/cloudflare-path-adr` at `77ae10a3fdafe2a0f5b5818ad1ea5e826b886606` because it is absent from `main`. Its D1-primary/API/preview design is superseded by ADR-0006; only its public-serving constraints inform this work. Legacy migrations were read at PR #24 `bb0327d` / PR #29 `6182262` and copied unchanged into tests, never into the new migration directory.

Only schema/SQL/migration configuration, tests and documentation change. PostgreSQL migrations, Node management/auth/upload handlers, public/preview/API Workers, lab VM/Desktop runtime, Cloudflare resources and existing PRs are unchanged. No source merge or deployment is performed.

## Agent-checked locally

Runtime: Windows, Node `v24.20.0`, Python `3.12.10`, Miniflare `5.20261019.2-beta` / workerd `1.20261019.1`. The test harness uses a disposable in-memory D1 binding with a synthetic 404 entrypoint; it deploys no Worker and reads no credentials. Miniflare is dev-only, pinned to the version already used for the pilot; its Undici dependency is overridden to patched `7.30.1`. Application dependencies stay at the base lockfile versions.

| Check | Result |
| --- | --- |
| `node --test tests/d1-read-model.test.mjs` | 8/8 PASS against local D1/workerd |
| `npm test` | 94/94 PASS (86 existing + 8 D1 tests) |
| `npm run lint` / `npm run typecheck` | PASS |
| `npm run build` | Compiles/types/pages PASS; first run stopped on inherited Next security advisory; retry and standalone packaging PASS with the advisory still present |
| Wrangler `d1 migrations apply … --local` | 0004 applied on a new empty local database; 7 SQL commands PASS; repeat reports no migrations pending |

D1 cases cover: exact seven-column schema, binary indexed code lookup, empty database migration, additive upgrade preserving all old schema/rows, wrong-case/unknown/host-ID denial, publish/update/unpublish/re-publish, equal/older replay, terminal revoke even against newer publish, rotation to a new code, identity reassignment/DELETE denial, closed manifest shape/types, 500 vs 501 assets and total size cap. Invalid updates leave the prior snapshot intact. These are SQL-contract tests, not a Worker serving or projector propagation measurement.

The upgrade uses only synthetic legacy identities/sites/tombstones. No live D1 dump was made. The existing pilot's old management tables are preserved, so its whole-database data-minimization gate remains open until the later cutover/retirement work.

## Agent-checked live, read-only

At `2026-10-24T06:41:50.802Z` (**13:41:50 Asia/Saigon**), the existing private ownership receipt matched the authenticated account and D1 database `hsp-pilot-desktop`. Existing Wrangler credentials stayed in memory; raw CLI/provider output, account/database IDs and identity data were suppressed.

Requests: `GET /accounts/{account}/d1/database/{database}`, then two read-only D1 queries: `SELECT name FROM d1_migrations ORDER BY id` and `SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name`. The query endpoint uses HTTP POST for these SELECTs; neither changes database data.

```json
{
  "readReplication": { "mode": "disabled" },
  "migrations": ["0001_pilot.sql", "0002_cleanup.sql", "0003_cleanup_resweeps.sql"],
  "readModelPresent": false,
  "servedByPrimary": [true],
  "changedDatabase": false
}
```

This is direct evidence of the current pilot replication setting and primary metadata read. It does not prove that migration 0004 is remotely applied or that the future #36 Worker reads primary. [Cloudflare's replication documentation](https://developers.cloudflare.com/d1/best-practices/read-replication/) confirms that base-binding queries without Sessions use primary. [Database-details API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/get/) defines `disabled` as no replicas. Recheck both configuration and the deployed query path at #36/#38.

## Acceptance and open gates

| Issue #32 acceptance | Evidence/state |
| --- | --- |
| Empty D1 and existing pilot additive migration | Local D1 both PASS; real remote 0004 application/readback **not yet verified**, pending owner authorization |
| Only ADR-0006 public fields in the new schema | PASS; seven columns and four closed asset fields; old management schema is a fixture/retained legacy data only |
| Primary/no-replica configuration evidence | Live pilot `disabled` and `served_by_primary: true`, read-only; future Worker execution remains #36/#38 |
| Lookup and stale-event tombstone protection | PASS in both local D1 variants |

No owner acceptance is claimed. Keep Issue #32 open and the PR Draft until the remote migration gate is resolved. Projector/lag/revoke propagation #33, rebuild #34, Node changes #35, single public Worker #36, old PR disposition #37 and pilot approval #38 remain separate. #10 remains open for release/security gates and production approval.

Build surfaced inherited Next.js `16.4.0` advisories in `npm audit`; Next and transitive Zod `4.6.5` both match `main`. The final audit reports two affected packages (Next critical, Zod high); no Miniflare/Undici finding remains after the scoped test-dependency override. A successful build retry does not resolve the application risk. [Issue #40](https://github.com/cfotel2604/html-share-platform/issues/40) tracks remediation separately. No unsafe audit fix or framework upgrade was run. CI at the latest PR head must be checked independently from these local implementation checks.

Rollback for this PR keeps the additive table and its migration ledger entry and leaves serving unchanged. Do not delete tombstones/data, replay legacy migrations, run old provisioning scripts or merge the superseded PR stack. [Remote preflight and rollout steps](../D1_PUBLIC_READ_MODEL.md) are ready for owner review before applying 0004.
