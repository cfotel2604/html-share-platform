# R1/R2 upload lifecycle fixes — 2026-10-23

Refs #20/#10, Draft [PR #23](https://github.com/cfotel2604/html-share-platform/pull/23), stacked on #22/#21. Owner authorized implementation after accepting the [independent review response](../reviews/2026-10-23-cloudflare-upload-review.md). Baseline `326d3b4`; implementation **`0ad5152a82b594708d50f3eabbb729c83791f190`**. A following docs commit records this evidence; fetch current PR head/CI separately. Both P2 findings await independent re-review, not automatic closure.

## R1: refresh a verified session, retain authorization

Studio authenticates with Clerk before multipart ingest. Its server-only actor now carries a request-scoped token provider, capturing the verified user ID, session ID and exact trusted Studio origin. RPC asks that provider on every attempt and receipt recovery instead of closing over a JWT string.

The provider verifies the seed JWT and reuses it only while more than20seconds remain. Otherwise it checks the same online session is active, belongs to that user and is unexpired, then calls Clerk Backend SDK `sessions.getToken(sessionId)` with no template or TTL override. The newly minted JWT must pass SDK signature/expiry/authorized-party validation and match the exact original sub/sid/azp; it must leave20seconds for the15second RPC. No-argument request `identity.getToken()` is used only to obtain the authenticated seed, never as refresh. See [Clerk backend token API](https://clerk.com/docs/reference/backend/sessions/get-token) and [client-only skipCache distinction](https://clerk.com/docs/guides/sessions/force-token-refresh).

Worker service credential, independent JWT verification, online session, verified Google identity and live D1 policy checks remain in place. The same finalize idempotency key survives HTTP retries and receipt recovery. A denial or unknown finalize outcome never triggers speculative deletion.

**Provider gate remains:** the actual Clerk instance must mint a fresh session JWT carrying the exact Studio azp, correct user/session and enough remaining lifetime. Missing/wrong azp or a template without sid is rejected; do not relax authorizedParties, remove expiry checks, add a TTL override or switch to service-only auth to pass a remote test. The local BAPI adapter is synthetic; no real Clerk token issuance was exercised. If the instance cannot supply this contract, operational pilot is blocked until a reviewed token-refresh integration satisfies it.

## R2: bounded writers and persistent resweep eligibility

The Node pipeline after intent creation has a15minute deadline, clipped to the server's intent expiry minus60seconds. PUT and readback each have a30second deadline; the readback deadline spans headers and body consumption. SDK requests receive an abort signal, Node destroys readback streams on cancellation, and a bounded waiter returns even when a transport does not settle. The browser request signal is forwarded through the pilot upload path. Each RPC attempt, including token acquisition and response/error-body handling, is bounded to15seconds, with at most2attempts. Receipt recovery and abort/cleanup each get independent RPC deadlines. Early multipart byte caps remain unchanged; the pipeline deadline is not a new whole-multipart-request timeout.

Cancellation is not proof that an in-flight provider PUT cannot commit later. Separate additive D1 migration `cloudflare/migrations/0003_cleanup_resweeps.sql` adds cleanup_after, an indexed schedule and a backfill making already-marked aborted intents eligible again. Existing D1 migrations0001/0002 and PostgreSQL migrations0001–0003 are unchanged.

cleanup_at now records the last successful sweep, never permanent exclusion. Aborted, unreferenced intents are reswept after5minutes, then daily once their expiry is more than24hours old. A successful sweep persists its next due time; a failed/interrupted sweep leaves the previous due time intact so a fresh invocation can retry. Per invocation the default limit is10, maximum50. Guards still atomically abort before deletion and exclude every committed version/preview reference; finalized or ambiguous-but-committed objects remain protected.

Aborted tombstones are retained indefinitely because Node timeout is not a durable R2 write fence. Resweeps have bounded frequency and batch size, not a finite lifetime after which late objects become undiscoverable. Their metadata/audit/list/delete cost and eventual backlog capacity need provider measurements before enabling Cron or defining a separate tombstone purge policy. No blanket lifecycle expiry is applied to published prefixes. Cron remains disabled.

## Regression acceptance executed locally

Production Node provider/RPC/upload functions, real Clerk RSA signature verification with the default5000ms skew, production Worker identity checks, local Miniflare D1/R2 and synthetic BAPI/object transport are used. Date advances and controlled interleavings avoid waiting for actual token/intent expiry; this is not production Clerk/R2 evidence.

| Finding | Regression evidence |
| --- | --- |
| R1 expiry | Captured JWT becomes expired during readback; a fresh JWT for the same sub/sid/azp finalizes successfully. |
| R1 revoked/disabled | Revocation before mint, revocation after mint before Worker auth, and D1 user disable during upload all deny finalize. |
| R1 lost ACK | Both finalize ACKs are lost across token expirations; retries keep one key, receipt recovery uses another fresh JWT, one version/audit commits and its objects survive reconciliation. |
| R1 invalid fresh identity | Wrong user, session, party, missing party, expired/tampered JWT and online-session mismatch are rejected; no TTL override is sent. Server facade retains the verified provider, not the captured token. |
| R2 late writer | PUT after cleanup_at is removed by the next eligible automatic sweep; a completion arriving days later is still collected after daily backoff. |
| R2 interruption | A resweep interrupted after partial deletion retains the previous non-null cleanup_at and due time; a fresh invocation completes. Committed/unpublished/preview-referenced objects survive. |
| R2 migration/fairness | Upgrade from schema0002 recovers previously marked aborted rows. Limited scans progress to the next intent rather than repeatedly selecting an already-swept tombstone. |
| Deadlines | A PUT that completes after the Node timeout is automatically collected; expired intent denies before storage, stalled readback ends, stalled token acquisition is bounded by cancellation, and SDK bodies are destroyed after headers. |

Tests are in [upload lifecycle](../../tests/cloudflare/upload-lifecycle.test.mjs), [token/transport](../../tests/cloudflare-token.test.mjs) and [server facade/RPC](../../tests/cloudflare-backend.test.mjs). Assertions require the corrected behavior; these do not assert that the old bugs still exist.

| Check | Result |
| --- | --- |
| npm run lint / npm run typecheck | PASS |
| npm test | **95/95 PASS**, previous90 plus5new unit groups |
| npm run test:cloudflare | **31/31 PASS**, previous19 plus12lifecycle/migration groups |
| npm run build | Next16.4.2 standalone PASS |
| npm run build:workers | Public/preview/API bundles dry-run PASS |
| PostgreSQL SQL and preexisting D1 migrations | Byte-identical to their reviewed baselines |

Docs/local links/YAML/whitespace checks accompany the handoff commit. Current-head remote CI must be checked on PR #23; do not reuse baseline326d3b4 checks. Browser/Safari/mobile/Zalo, real provider, quotas/cost and dependency-audit results were not rerun for these fixes; earlier evidence remains scoped to its original execution.

## Handoff and rollback boundary

No Cloudflare provisioning/deploy, remote D1 migration, Cron, VM/Compose/image/env/DNS/UFW or existing uploads/volumes were changed. Presentation → workflow → typed HTTP adapter and separate content/preview Workers remain unchanged. Keep #20/#10 open, PRs Draft and ADR0001/0003/0005 Proposed until their respective review/gates pass. Owner's final-project Wrangler logout reminder remains in [AI handoff](../AI_HANDOFF.md) and [runbook](../CLOUDFLARE_PILOT_RUNBOOK.md).

After a separately approved remote migration0003, rollback must retain the additive column/index and use a compatible version that keeps resweeps/fences; old binaries using cleanup_at exclusion reintroduce R2. Stop new mutations if needed, retain receipts/tombstones/objects, and never fallback to PostgreSQL. Source merge and operational pilot approval are separate decisions.
