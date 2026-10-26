> **Snapshot bằng chứng theo ngày/head.** Môi trường, số liệu và các câu “Draft/chưa/chờ” trong thân thuộc thời điểm đã ghi; không là trạng thái hay quyền vận hành hiện tại. Xem [status](../PROJECT_STATUS.md) và [bản đồ tài liệu](../DOCUMENTATION_MAP.md). Không chạy lại lệnh lịch sử trên pilot đang dùng.

# Issue #34 — rebuild/reconciliation validation, 2026-10-24

Refs #34 / [Draft PR #43](https://github.com/cfotel2604/html-share-platform/pull/43). Base `a98a1d62e9a2a51b841e548792979e712190774d`, verified main after owner reported PR42 merged. Implementation `3dc38c156c47bb62f4be48570db951b08c2a00dd`; source recheck/regression head **`413a8137747210122999ec2f03cef17090c464dc`**. [Operator/local runbook](../READ_MODEL_RECOVERY.md).

## Executed checks

| Revision/environment | Commands/result |
| --- | --- |
| `3dc38c1`, Windows local | `npm ci`, lint/typecheck,141unit tests PASS. `npm run build` compiled but first attempt stopped on inherited Next16.4.0 security nudge; retry PASS including standalone packaging. #40 tracks that dependency risk; no dependency versions changed. |
| `413a813`, Windows local | `node --test tests/read-model-recovery.test.mjs`:12/12PASS after adding complete-source prevalidation and a concurrent-read regression. Fresh PGlite + Miniflare + synthetic S3, no provider credentials or Docker. |
| `413a813`, GitHub CI | [Foundation](https://github.com/cfotel2604/html-share-platform/actions/runs/40088001156): application142/142unit + lint/typecheck/build PASS; public-outbox5/5real PostgreSQL16 groups PASS, including new recovery/audit/source-race group and inherited500file throttle benchmark. [Security integration](https://github.com/cfotel2604/html-share-platform/actions/runs/40088001159): PASS, inherited RBAC/ownership/audit/preview/500file readback/origin groups. [Docs](https://github.com/cfotel2604/html-share-platform/actions/runs/40088001148): PASS. All4checks SUCCESS at this exact head. |
| `78fcb63dac63e34f92aae156ba868a2a9a00cd18`, audit-event link | Adds source event ID to recovery audit correlation. [Foundation/application + public-outbox](https://github.com/cfotel2604/html-share-platform/actions/runs/40088416490), [security](https://github.com/cfotel2604/html-share-platform/actions/runs/40088416513), [docs](https://github.com/cfotel2604/html-share-platform/actions/runs/40088416459): all4checks SUCCESS. `gh pr checks 43 --watch --interval 15` exit0. Local build after fresh npm ci PASS on retry, packaged disabled/SQL-match smoke PASS. |
| Packaged runtime | Source and standalone `project.sql` SHA-256 match. Packaged `recover-public-read-model.mjs rebuild --dry-run` with recovery disabled exits1, emits only `recovery_disabled`, no provider/PG startup. |
| Docs | `python scripts/check_docs.py`, `python scripts/check_yaml.py`, `git diff --check` PASS. Additional local-link check covers the new runbook/validation. Final documentation head checks are recorded in PR43; source evidence above is revision-specific. |

No applied PostgreSQL/D1 migration, read-model SQL or package lock changed: `git diff origin/main -- db/migrations cloudflare/read-model package-lock.json` empty. No Worker/Studio UI change, local Docker/VM command, owner private file/worktree access, D1 remote read/write, real projector/rebuild invocation, provision or deployment occurred during #34. Fixtures alone insert deliberate D1 drift; production recovery never uses alternate mutation SQL.

## Acceptance evidence and limitations

- Empty target: reviewed rebuild emits fresh source outbox snapshots and fills local D1; following reconciliation returns zero differences in code/status/active version/manifest/revision. Existing per-code projection and permanent tombstone guards are reused. All historical codes are included; no D1/legacy management data is copied into PostgreSQL.
- Deliberate valid drift: synthetic D1 status/active-version/manifest/revision changes are detected; a fresh PostgreSQL revision repairs them. The sequence is never derived/reset from D1. Target-ahead, wrong identity, unknown code and revoked/live conflicts are blocked before enqueue; those require an owner recovery/containment plan, not weaker invariants.
- Dry-run contains hashed code references/field names/counts/fingerprint only. It changes no source/outbox/audit/D1 row; only durable throttle metadata reserves shared5second API slots. Real values/credentials/payload/provider messages never appear in reports/errors. Closed read API accepts only fixed20row keyset SELECT; metadata must confirm changed_db=false.
- Existing projector serializes reads and writes via the same advisory lock/durable slot.429/auth failure freezes the shared budget, honors Retry-After and stops recovery safely; pending events remain. No per-file REST calls or handler imports/writers were added. Runtime/admin source scans permit only explicit projector/recovery entrypoints.
- The reviewed plan is recomputed before apply. Entire selected source is checked before enqueue; each source chunk and Admin/allowlist are rechecked under locks. Tests cover stale fingerprint, source changes after review and during D1 reads. A full source snapshot comparison is necessary because MAX(id) alone misses lower revisions committing after higher revisions on other sites.
-101legacy tombstones/site are rebuilt using100code chunks and read back through multiple20row pages; event and audit commit together. Recovery is intentionally per-site/chunk, not globally atomic. A later race/failure may leave earlier valid audited events pending/projected; preserve them, replan and replay. CLI performs final reconciliation and cannot claim success from HTTP200/projected markers alone.
- Missing verified legacy ETag blocks a public rebuild snapshot; source revoke still works. Memory caps10000codes/16MiB public JSON per snapshot stop before enqueue instead of truncating success. All of these operational limitations are explicit in the runbook.

## Independent-reader receipt — local gate PASS

Owner explicitly authorized one independent agent, `recovery_runbook_reader`. That reader followed the runbook's Local rehearsal at exact head **`78fcb63dac63e34f92aae156ba868a2a9a00cd18`**, independently of the author/CI result. Node24.20.0/npm11.19.0; clean worktree before/after, package/lock unchanged.

- `npm ci`: exit0,436packages added/437audited. Inherited2vulnerabilities (1high/1critical), deprecated ESLint and install-script allowlist warnings were observed; no fix/upgrade performed.
- `node --test tests/read-model-recovery.test.mjs`: exit0, **12pass,0fail/cancelled/skipped/todo**,8987.9456ms.
- Reader observed all12named cases, including empty rebuild→zero diff, drift repair, Admin/allowlist, stale source, source changing during reads, shared429 cooldown, blocked identity/tombstone/ahead, unknown-code detection,101tombstones→2events/at least6read pages→zero diff, missing ETag denial and SELECT/cursor/changed-db guards. Runbook executed without blocking ambiguity.
- Reader inspected fixture isolation: fresh `PGlite.create()`, fresh local Miniflare D1, synthetic Map storage and injected REST fetcher. No `.env`, private receipt/config, credential access, Cloudflare remote, VM/Docker/deploy, real token or remote flags; no code/docs edits, commit/push/merge, monitoring or additional agents.

**Independent-reader local runbook acceptance is met.** This suite exercises core APIs and CLI guards; it does not execute the future operator commands remotely. Real PostgreSQL concurrency is separate CI evidence; injected COMMIT failures, R2live and Worker404 remain outside this receipt. Non-timing tests advance synthetic slots; no latency/SLO is inferred. Unknown-code test explicitly checks detection; shared blocked-plan apply rejection is exercised by the other conflict cases.

**Pilot acceptance: unverified.** Actual target reconciliation/rebuild, Node VM secret/runtime setup, R2live/IAM, Worker404 propagation and release gates need separately authorized steps (#38/#10). Token policy remains the owner-approved existing account / separate `hsp-projector-pilot`, D1Read/Write only, secret store/env startup,90day/incident rotation and emergency dashboard revoke.60seconds remains a proposal, not an accepted SLO.

## Workflow correction and next issue

Owner reported PR42 merged; live GitHub confirms merge `a98a1d6` at2026-10-24T10:43:12Z. #33 remains OPEN for pilot gates. At owner's request, automation `html-share-a-fast-track-draft` was **deleted** (tool confirmed deleted); no merge polling/scheduled follow-up is retained. Wait for an explicit owner merge report before #36, then #37 and preparation of #38, one branch/Draft PR per issue. No automatic merge/Ready/deploy. Older heartbeat instructions are historical and superseded.
