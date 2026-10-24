# Issue38 — preparation evidence and unrun pilot ledger

2026-10-24, Asia/Saigon. Refs38/31/10, [Draft PR46](https://github.com/cfotel2604/html-share-platform/pull/46). [Acceptance plan / approval packets](../PILOT_APRIME_ACCEPTANCE.md). This is a **preparation receipt**, not pilot acceptance. Baseline main `76b38faf169477af480690f222123214f4d8c3c5` (PR45 owner-reported merge independently checked13:58:40UTC, head `eecf6cc86b5e6fdfd4cc7273071e4cabe57885d6`, three CI checks SUCCESS). Early scope commit `1549b17`; final exact head/check URLs recorded in PR46 after commit. No self-referential final hash embedded in its own commit.

## Scope, approvals and provenance

Verified clean repository/worktrees/remotes, `git fetch origin --prune`, origin/main log and live PR/Issue metadata. New worktree `C:\Users\admin\.codex\worktrees\38-pilot-acceptance-prep\html-share-platform`, branch `docs/38-pilot-acceptance-prep`; owner main `78cb7ca`/other worktrees/untracked/env/uploads/volumes preserved. No reset/clean or owner-private-file access. Source dependencies39/41/42/43/44/45 merged; Issues33/34/36/37/38/10/40 still open at preparation start. Legacy7Draft PRs and5Issues retain their state; merging45 did not approve their dispositions or runtime changes.

Owner confirmed the #38 policy in chat: healthy COMMIT revoke→public404 p95≤60s, pending revoke>60s warning with Admin unsynchronized status; projector/REST stops excluded from those guarantees and reported separately with actual latency/depth/recovery/containment. Recorded in ADR0006/Guide/plan/runbooks. This is **APPROVED POLICY / NOT MEASURED ON PILOT**, not execution approval. Existing benchmark field/event names containing `proposal` were retained and explicitly mapped to current policy; original historical validation remains as-of its old head.

Issue38 received an additive preparation/policy/binding-clarification note using `gh issue edit 38 --body-file <task-temp-file>`, followed by fresh `view` verification14:18:29UTC. Exact original body retained as suffix; number/title/state/url unchanged, still OPEN, original acceptance boxes untouched. Original body SHA256 `cff33e81d4311c0c1d0474372dfa9a97becd3e0fa649846cbbe3a74ffbf4ff28`; noted body `0a86bff0d1c4ae26e474f73dfc4106754319bf4372b2c7afba0044d9240ad9a9`. No comment/message, closure or other item edit in this preparation. Roll back metadata only by removing the marked `aprime38-preparation` block after checking for intervening edits.

Read AGENTS/README/PLAN/architecture/workflow, ADR0006+binding clarification/0001/0003/0004/0002, Agent Guide/Issue7, live Issue38, transition inventory, Node/projector/recovery/Worker contracts and relevant benchmark/operator code. Evidence from old provider/VM records and previous independent reader34 is referenced, not rerun or upgraded to current pilot proof. No new subagent or merge automation was created. No Cloudflare CLI/REST/data/secret/deploy call, R2-live operation, VM/SSH/localDocker, realprojector/rebuild, migration/backfill/cleanup or token rotation/revoke was run in #38 preparation.

## Local commands and results

Environment: Windows, Node24.20.0, npm11.19.0. Fresh dependency install without `.env`/provider credentials; tests use empty PGlite/local Miniflare D1/R2 or synthetic storage/transport. No actual PostgreSQL service/VM or remote D1 was used by local commands. Only documentation changes are committed; application/SQL/config/lockfile/dependency versions remain unchanged. Commands rerun at final head are listed in PR; source exercised here is unchanged from base76b38fa.

| Command | Result / evidence boundary |
| --- | --- |
| `npm ci` | PASS,438packages. Inherited audit output1high/1critical and dependency install/deprecation warnings recorded; no audit fix/upgrade or approval-policy change attempted. Dependency remediation remains #40 |
| `npm test` | **162/162 PASS**, zero failures/skips; includes12recovery tests, Node-only regression/500file pipeline, Worker guards/native/local serving and auth/ownership coverage. These are local fixtures, not real Clerk/R2/pilot acceptance |
| `npm run bench:projection` | PASS;12events/12synthetic REST batches, minimum5000ms scheduling; empty PGlite+localD1/synthetic R2, six samples each1/500files. Small synthetic files, not max-byte/concurrency/cost or public404 measurements |
| `npm run build:public-worker` | PASS; local Windows ESM175478bytes, SHA256 `a100dc4e0eb0d22739cbe27194e3562c47aafb26799d98866a8aff63f32e3be5`. No Wrangler/deploy. A future actual deploy artifact/config requires its own exact fingerprint/review; platform line endings may change bundle hash |
| `python -B scripts/check_docs.py`, `python -B scripts/check_yaml.py`, `python -B tmp/check_aprime_preparation.py` (ignored task helper), `git diff --check` | PASS:12required files/8entry docs,6YAML,48Markdown/306local links,3canonical SQL hashes+checkout equality and Markdown-only diff. Rerun after final commit and record final head/CI in PR46. No production build/lint repetition locally for prose; final CI results are reported only for checks actually run |

Benchmark clock: Node monotonic **after source COMMIT acknowledgment → after projected-marker acknowledgment**, not actual COMMIT→public404. `pilot_verified=false`. Local diagnostic `revoke_threshold_status=proposal_only` is a historical hardcoded label; owner38has since confirmed policy, without validating any remote threshold.

| Local cohort | n | p50 ms | p95 ms | Numeric samples ms (all retained) |
| --- | --- | --- | --- | --- |
|1file|6|4987.336|5001.990|32.532,4987.336,4984.133,4990.174,5001.067,5001.990|
|500files|6|4944.772|4965.137|4891.689,4965.137,4944.772,4953.121,4939.745,4960.616|

Nearest rank `ceil(p*n)`; at n6,p95 is the maximum. First1file sample includes an initially free slot; the next events wait for the shared durable5second budget. No healthy pilot sample exists, no pilot percentile can be computed and no failure interval was mixed/omitted. These numbers cannot prove owner60second SLO.

## Source integrity — canonical Git blobs

| File | SHA-256 of `git show HEAD:<path>` bytes |
| --- | --- |
| `cloudflare/read-model/migrations/0004_public_read_model.sql` | `346782e2083574601b709a1b2e254e5e250d39bb5f4b5e9f39458980f7992aed` |
| `cloudflare/read-model/queries/project.sql` | `0ac275d57fb30bd20c80cfea705e62013db6c600ed73edbbc378390bec56df29` |
| `cloudflare/read-model/queries/resolve.sql` | `91c6774fd3043466164c8a5de79a485b7d7028dec42ac667ede1f7da1ecbbfce` |

The applied0004canonical hash matches the owner-approved #32 hash. Windows checkout CRLF bytes differ; replacing CRLF with LF equals the Git blob exactly for all3files. No SQL was edited or remote migration run. A future operator must check the **actual approved execution bytes**/source fingerprint and private target before any authorized operation; do not wave away an unexplained mismatch or execute0004again. This canonical check is source integrity, not a readback of remote ledger/schema/data.

## Remote execution ledger — intentionally blank

Complete only after scoped owner approval and execution. Each row needs exact source/artifact/config hash, private target-match result, operator/window/approval ref, fixture count/bytes, action/result, redacted evidence ref and explicit PASS/FAIL/INCONCLUSIVE. Raw secrets/user rows/codes/URLs/grants/HTML never enter this file. “NOT RUN” must never be converted to PASS from local evidence.

| Gate | Status at preparation | Missing receipt / approval |
| --- | --- | --- |
| A target/schema/ledger/replication + legacy data disposition | **NOT RUN / OPEN** | Private target comparison, aggregate D1 category audit including legacy; approved ADR-compliant disposition, no automatic deletion/copyback |
| B Node/PG + R2/Clerk management and legacy writer fence | **NOT RUN / OPEN** | Dedicated runtime/config/PGledger, M01–03 real auth/RBAC/ownership/audit/preview/500files; no parallel management writer |
| C token/storage/rotation/collector/watchdog | **NOT RUN / OPEN** | Actual D1-only scope, startup secret-store receipt, recipient delivery/missing telemetry, M11 owner drill; no value disclosed |
| D first projection/recovery/reconciliation | **NOT RUN / OPEN** | Concrete reviewed target/plan fingerprint, authorized run, source+audit+target readback/tombstones, quota/429 receipt |
| E one public Worker + legacy API/preview retirement | **NOT RUN / OPEN** | Exact deployed artifact/config, actual bindings/secrets/primary/route plan, compatible rollback/containment; retirement separate |
| F M04 healthy revoke→public404 | **NOT RUN / OPEN** | Timestamp/clock basis/uncertainty, full healthy samples/n/p50/p95, stable404/probe bounds, owner60second gate |
| F M05–09 fault/recovery/replay/integrity | **NOT RUN / OPEN** | Approved fault method/isolated target; all outages/exclusions/depth/recovery/containment separately published; no additional D1 writer |
| F M10 actual VM-off + logs both sides | **NOT RUN / OPEN** | Approved stop/restore/operator receipts, public200/version/security and no callback evidence; local source shutdown insufficient |
| F M12 browsers/log privacy/cost/rollback | **NOT RUN / OPEN** | Actual available device matrix, cookie/opaque-origin/grant redaction/collector/provider cost + rollback drill |
| G owner pilot acceptance | **NOT APPROVED / OPEN** | All above reviewed, failures/unknowns explicit; no auto closure38 or production/#10 approval |

Healthy measurement row template: `run_ref, cohort_files/bytes, source/config/artifact, clock_basis, commit_bound, first_404, confirm_404, uncertainty_ms, projection_lag_ms, public_lag_upper_bound_ms, batch/probe_counts, pending_age, result`. Every slow healthy result stays in cohort. Incident row template: `run_ref, fault/control, stop/start, latency_or_censored_duration, max/end_depth, first_success/drained/404_time, alert_emit/delivery, Admin_pending, containment_scope/action/effect, operator_approval/evidence_ref, remaining_risk`. Always publish incidents alongside, not pooled into, healthy p95.

## Open release/security gates

#10 remains OPEN: production Clerk/OAuth, production domain/DNS/routes/TLS/reserved-host inventory/regression, cookie/opaque-origin/sibling/browser/mobile/Zalo matrix, preview access/DNS/proxy/edge-log redaction, private R2/IAM/lifecycle/uncertain-orphan handling, cache/abuse/rate/concurrency/cost/compatible rollback and security review need scoped evidence. Some have historical lab/owner observations, not complete A' or production acceptance. #40 inherited dependencies is a separate remediation/release decision. Legacy item closure decisions remain separate. Owner must review the completed pilot ledger and explicitly accept risks; neither this preparation nor a source merge supplies those decisions.

After this preparation, wait for owner review and a concrete packet instruction. Do not run packetA–F, poll merge or install automation. Docs rollback is revert; operational rollback/containment follows the separately approved #34/#38 plan while preserving source, outbox, tombstones, receipts and objects.
