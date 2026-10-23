# Cloudflare path pilot — implementation contract

Refs #20/#10; [ADR-0005](adr/0005-path-sandbox-cloudflare-pilot.md) Proposed. Independent synthetic environment; do not reuse lab volumes/env/storage or run remote deploy/migrations from these instructions.

## Boundary and APIs

Studio `/api/*` DTOs remain stable. `METADATA_BACKEND=cloudflare` selects the pilot exclusively; default `postgres` retains current lab behavior. Unknown/misconfigured backend fails closed. Pilot disables local-demo auth and legacy viewer/preview embedding routes. Browser never receives service/R2 credentials or D1 API access.

Worker API requires `X-HSP-Service-Token` (server-only random256-bit secret) and `Authorization: Bearer <Clerk session token>`; independently verifies active session, verified Google primary email and DB policy. Mutations use `Idempotency-Key`; mismatch/replay across actor/action/body is denied. Authenticated same-origin Studio routes proxy the calls and preserve early multipart cap/ownership preflight.

| Worker endpoint | Behavior |
| --- | --- |
| GET `/v1/actor`, `/v1/sites`, `/v1/sites/:id` | Actor/policy and owner-scoped metadata |
| POST `/v1/uploads` | Reserve new site/version or existing-site intent with expected revision; no publish |
| POST `/v1/uploads/:id/finalize` | Verified manifest, revision/actor guard, version+assets+pointer+audit+receipt batch |
| POST `/v1/uploads/:id/abort` | Mark uncommitted intent terminal for safe cleanup |
| POST `/v1/uploads/:id/cleanup` | Delete only aborted, unreferenced intent prefix; retryable |
| GET `/internal/health` | Service-token-only aggregate readiness; no metadata/session required |
| GET `/v1/receipts/:key` | Actor-scoped outcome recovery; no speculative storage deletion |
| PATCH `/v1/sites/:id` | Publish/unpublish or soft-delete, revision and audit |
| POST/DELETE `/v1/sites/:id/share` | Rotate/reissue or revoke, no resurrection |
| POST `/v1/sites/:id/preview` | Hashed180second capability, immutable version/actor scope |

Only public/preview Workers serve assets. Public `/<code>` canonical308 to `/<code>/` after status check; `/` under prefix is `index.html`. Other paths must be explicit manifest files, never SPA fallback. Code is exact-case10base62. Preview has an independent hostname, token namespace and routing. API does not expose raw SQL, object keys for anonymous requests, files or CORS credentials.

## Data and execution plan

1. ADR/contracts and handoff Draft PR.
2. D1 separate schema, Worker API guarded mutations, public/preview Workers, Miniflare D1/R2 integration tests and local CI.
3. Node bridge with preflight, immutable S3 writes and streamed readback verification; Studio adapter, fail-closed backend selection, local end-to-end/browser evidence and runbook.

D1 is the only metadata authority in pilot. Immutable version assets are normalized/indexed, writes use guarded batches, site revisions and actor policy rechecks. Upload intents expire; finalized receipts make retries idempotent. Cleanup must first atomically abort an intent and exclude all version/grant references. Never cleanup after uncertain finalize until receipt is resolved. Upload-to-publish has no distributed R2/D1 transaction.

## Acceptance and release boundary

Implementation23/10: stacked Draft #21 → #22 → #23, integration source dcdfd0b; [runbook](CLOUDFLARE_PILOT_RUNBOOK.md) and [local evidence](validation/2026-10-23-cloudflare-pilot.md).90unit/19local D1/R2 groups and Chrome/Firefox7groups each PASS. Scheduled reconciliation is implemented with system audit/fencing but no Cron configured; full remote quotas/cost must be reviewed before provisioning.

Local checks must cover A/B HTML/direct/nested/preview; CSP/opaque origin/CORS; modules and relative assets; invalid paths/active formats; ownership/policy/revision races; audit rollback and lost acknowledgements; tombstones; private preview expiry/revoke; tampered/missing objects; streaming; no PostgreSQL fallback or VM serving dependency. Record synthetic evidence without codes/grants/PII.

Remote provisioning, workers.dev namespace, private R2/IAM, real Clerk production/quotas, external browser/mobile/Zalo, complete log redaction, rate/concurrency/cost and production domain/security approval are pending. Do not mark #10 closed, ADR Accepted or native bindings read-only merely because local tests pass.
