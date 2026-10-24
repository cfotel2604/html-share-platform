# Read-model rebuild and reconciliation — Issue #34

Refs #34 / Epic #31. Base freshly fetched main `a98a1d62e9a2a51b841e548792979e712190774d` after PR42 merged. PostgreSQL is the sole source of truth under ADR-0006; the guarded D1 contract and applied migrations remain unchanged.

## Local rehearsal — safe without provider credentials

Prerequisite: Node22+ and this PR's checkout. No `.env`, Docker, VM or Wrangler is needed. These tests create fresh in-memory PostgreSQL/PGlite, local D1/Miniflare and synthetic storage. They never discover Cloudflare credentials or use the network for D1.

```sh
npm ci
node --test tests/read-model-recovery.test.mjs
```

Expected:12tests pass. Follow the named cases in order: disabled CLI; empty-D1 dry-run (no source/outbox/audit/D1 changes); reviewed rebuild and audit; deliberate valid drift and repair; stale source rejection; non-Admin/disabled allowlist rejection; source changing during D1 reads; shared throttle/429; immutable-identity/tombstone/unknown-code/ahead conflicts;101historical tombstones with paging and100code event chunks; legacy missing ETag; bounded SELECT/unchanged-db metadata. Dry-run updates **only PostgreSQL throttle metadata** to reserve shared API slots. It does not bind a new target, enqueue events, alter source/audit or write D1.

An independent reader should run the commands from this section and record the exact commit, command, pass/fail and observed cases in a validation receipt. Author-run tests and CI do not satisfy the separate independent-reader acceptance; that result must be identified explicitly.

## Operator commands — remote execution requires separate approval

These are future Node/VM operating instructions, **not permission to run on the pilot**. Before any real run, owner verifies account/database against the private receipt, existing read-model schema/ledger, replication disabled/primary policy, reviewed source and explicit scope. Do not reapply D1 migration0004, deploy Worker, provision resources or use legacy scripts. Only a dedicated authorized operator may access the Node environment; these commands are not an HTTP/Studio endpoint.

Node's secret store supplies the existing `D1_PROJECTOR_ACCOUNT_ID`, `D1_PROJECTOR_DATABASE_ID`, `D1_PROJECTOR_API_TOKEN` policy from [PUBLIC_PROJECTOR](PUBLIC_PROJECTOR.md). Never put values in shell arguments/history, Git, response, PR or chat. `READ_MODEL_RECOVERY_ENABLED` defaults0 and must be explicitly enabled by the operator. Apply also requires `PROJECTOR_REMOTE_APPROVED=1` and `READ_MODEL_OPERATOR_ID` for a PostgreSQL active Admin whose allowlist is active/Admin. Every chunk rechecks/locks the actor policy and site and commits its event/audit together. No privilege comes from a browser role or a D1 record.

1. **Reconcile first**, for diagnosis or normal verification:

   ```sh
   npm run recover:public -- reconcile --dry-run
   ```

   It prints one redacted JSON plan with source/target counts, differences by hashed `code_ref`, affected fields and a64hex `fingerprint`. No raw codes, IDs, R2 keys, assets or provider error text are printed. Compare code presence, status, active version, manifest and projection version; timestamps are recorded but not an independent drift criterion. Exit0 means no differences,2means repairable differences,3means invariant conflicts. Transport/config/source-change errors exit1 with an allowlisted static code. Replan after any change; do not treat an inconclusive scan as a match.

2. For a full rebuild (empty target or deliberate complete reprojection), inspect:

   ```sh
   npm run recover:public -- rebuild --dry-run
   ```

   Rebuild selects **all PostgreSQL share codes**, including historical revoked and deleted-site tombstones, without changing management state. Legacy rows predating outbox capture receive fresh source revisions only during apply. Existing published manifests need verified ETags; missing/invalid source manifests block the whole plan. Use verified Node reupload before republish/rotation; denial remains possible. Do not manufacture ETags or query R2 from a migration.

3. After owner approves that concrete plan and remote scope, run exactly one matching apply (substitute the reviewed fingerprint only; it is not a token):

   ```sh
   npm run recover:public -- rebuild --apply --plan <reviewed-64hex-fingerprint>
   npm run recover:public -- reconcile --repair --apply --plan <reviewed-64hex-fingerprint>
   ```

   The command recomputes the plan; mismatch exits before enqueue. Source is checked before any enqueue and again under each site lock. It commits fresh outbox events plus `public.rebuild`/`public.reconcile` audit records with actor, plan fingerprint, source event ID and run UUID, then drains them through the **existing projector**. Audit `target_id` is `<plan-fingerprint>:<event-id>` and `request_id` is the run UUID. A run may also drain older pending source events to preserve FIFO. Audit actor/plan details stay in PostgreSQL; logs expose only the run UUID/count. Each site/chunk has at most100codes, one event and one guarded D1 batch; no direct/alternate D1 writer, DELETE, REPLACE or sequence reset exists.

4. Successful apply performs a new reconciliation readback. Exit0 requires no remaining differences. Pending/retry/blocked/inconclusive readback exits nonzero; do not report success from a D1 HTTP200 or projected marker alone. Preserve outbox/audit and inspect sanitized errors; rerun dry-run to obtain a fresh plan. If the job crashes after a D1 acknowledgment or between chunks, already committed events/audit remain and can be retried. The run is **not globally atomic across sites/chunks**: a concurrent source/policy change or later COMMIT failure may stop after earlier audited chunks. Never delete those valid events or re-use a stale fingerprint. Existing projector loop may drain pending work independently.

## Consistency, limits and blockers

Both read and write requests share the source database's advisory lock330006 and durable minimum5second slot. Reconciliation uses indexed case-sensitive keyset SELECTs,20rows/page, not per-file REST calls.429/auth failure freezes the shared budget for at least5minutes (longer Retry-After respected); CLI stops with a sanitized error, leaves events intact and must be included in the alert collector. This leaves headroom in the shared Cloudflare budget; it cannot reserve capacity against other account clients. Target fingerprint pinning applies to reads and writes; no credential discovery or target replacement is automatic.

Source reads are local repeatable-read snapshots. After D1 pages, the tool reads source again and compares the complete bounded snapshot: a sequence high-water mark alone cannot detect out-of-order commits across sites. There is no distributed snapshot or write lock across REST; active mutations/projector work can invalidate the reviewed plan/readback. Use an owner-approved quiet mutation window for a stable recovery receipt. Source transactions never span D1 REST writes.

Memory is bounded to10000codes and16MiB public JSON per source/target snapshot,20rows per read page. Exceeding the bound stops before enqueue; use a separately reviewed larger-scale plan, not a truncated/partial success. The tool does not purge history or rebuild legacy D1 administration tables. A zero-depth outbox alone is not reconciliation.

Conflicts stop **all planned repair before enqueue**: target site identity differs, an unknown target code exists, target revision exceeds the PostgreSQL high-water mark, or a target revoked tombstone conflicts with a live source code. These cannot be safely overwritten under the existing contract. Preserve evidence, stop affected serving through an owner-controlled containment decision, and obtain a reviewed restore/new-target plan. Do not infer identity or advance a PostgreSQL sequence from D1, resurrect a code, hand-edit D1 or weaken permanent tombstone guards. An account/database replacement also needs an explicit target-pin recovery plan.

## Incident runbook

- **Ordinary lag / job restart:** inspect Admin pending status, sanitized queue depth/age/error and process liveness. If source is sound and only pending work exists, recover the existing projector; no full rebuild is needed. Reconcile after drain. The60second revoke warning remains a proposal, not an approved SLO or outage guarantee.
- **REST errors/429 prolonged:** stop discretionary recovery scans, retain queue/audit, respect shared cooldown and investigate provider quota/auth externally. Do not loop commands to defeat throttle. Token401/403 follows the owner-approved90day/incident rotation and emergency-revoke policy; no credential value enters evidence. Reconcile once healthy; rebuild only for missing/drifted data.
- **Emergency revoke with a broken projector:** owner first revokes the code/unpublishes through the Node Admin flow so PostgreSQL state/outbox/audit record the real actor. If REST works but the loop is broken, separately approve the targeted reconciliation plan and use this recovery command's existing projector core; verify readback and later Worker404. If REST/token access is unavailable, a source revoke alone cannot deny already projected edge state. Owner must decide immediate Cloudflare serving containment (block/disable affected public serving via the authorized operational control), capture a private incident receipt with UTC time/operator/action/scope/provider audit reference when available, and keep serving blocked until projection plus public readback succeeds. This PR does not deploy or automate such containment and never supplies ad-hoc D1 mutation SQL. Do not claim token revocation itself blocks public reads; Worker does not use this token.
- **Restore / rollback:** stop or disable recovery/projector, preserve source schema/data, pending/projected events, permanent tombstones and receipts. Fix and replan/replay; do not revert management to Cloudflare or restore an old live code. Review the intended target and its pin before any target replacement. Production/#38 approval remains separate.

## Owner workflow update — 2026-10-24

The owner reports each merge in chat; only then continue the next issue (#34 → #36 → #37, prepare #38), one branch/Draft PR per issue. The earlier heartbeat automation was deleted at the owner's request. Do not recreate monitoring or poll for future merges. PR42 is verified MERGED; #33 remains OPEN for unrun pilot gates. Token policy and the unconfirmed60second proposal remain as recorded in PUBLIC_PROJECTOR.md.

Real pilot rebuild/reconcile, VM setup and public Worker verification remain unrun. Local/CI exact-head results and the independent-reader gate are recorded in the validation document/PR.
