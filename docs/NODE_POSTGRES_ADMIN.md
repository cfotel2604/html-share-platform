# Node/PostgreSQL administration — Issue #35

Current A' candidate38/PR48: public links require HTTPS `PUBLIC_CONTENT_ORIGIN` on a different registrable domain from Studio (private suffixes included), and point directly to the public Worker. There is no `/view` or PG-public-gateway fallback; Node gateway is preview-grant-only. Bad public configuration rolls back before object effects/publish commit, while unpublish/revoke remain usable. [VM proposal](PILOT_APRIME_NODE_ROLLOUT.md) is not deployed; existing35validation below predates this source change and is not pilot acceptance.

Refs #35 / Epic #31; [ADR-0006](adr/0006-postgresql-source-of-truth-d1-public-read-model.md), [implementation plan, Issue 4](D1_READ_MODEL_PLAN.md), [preview grants](adr/0003-server-rbac-and-preview-capabilities.md).

## Baseline and delivery scope

Branch `feat/35-node-postgres-admin` starts from freshly fetched `origin/main` `664e6c07af59b56fea421ec00cce639c7b3487d8` (PR #39 merged, Issue #32 closed). The old D1-primary/API Worker implementation is confined to unmerged Draft PRs #21–#24/#27/#29. It is not imported or merged here. PostgreSQL remains the only metadata backend; the work closes the configuration and regression gaps on main.

Implemented in [Draft PR #41](https://github.com/cfotel2604/html-share-platform/pull/41), code `da92385d4531d07884aafa228d7fec135c207891`:

- Reject `METADATA_BACKEND=cloudflare` and every unsupported backend; no fallback, token mint/refresh bridge or direct D1 administration path.
- One same-origin workspace bootstrap request resolves the Clerk identity once and lists sites through PostgreSQL. No presentation redesign. Readiness checks only PostgreSQL; liveness checks no provider.
- Preserve Node ownership/RBAC/audit and PostgreSQL transactions. Uploads create immutable objects conditionally, stream-read each one back with size/SHA-256/ETag verification and commit the active version only after all assets pass.
- Keep private preview on the VM/Studio gateway with the existing hashed, actor/site/version-scoped three-minute grant. No Cloudflare preview path.
- Keep cleanup limited to confirmed new objects; uncertain writes/commits require reconciliation instead of speculative deletion.

No outbox/projector (#33), D1 writes/schema/migrations, public Worker (#36), runtime deployment or owner configuration changes are included. PostgreSQL migrations already applied remain immutable. Existing lab public-host behavior and sandbox policy remain unchanged.

## Configuration, reads and preview

`METADATA_BACKEND` must be absent or exactly `postgres`; empty/`cloudflare`/`d1`/unknown values are rejected. Next instrumentation, DB/auth entry points, readiness and allowlist/backfill functions enforce the same guard. This is permanent rejection, not a backend selector/fallback. Next may retain a listener after an instrumentation error; the standalone bad-config probe returned500 and never became ready. Fix configuration instead of retrying a legacy backend.

Keep PostgreSQL `PG*` settings and private S3-compatible R2 `STORAGE_ENDPOINT`, `STORAGE_REGION=auto`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`. Local MinIO settings remain supported for isolated tests. A future approved cutover must remove old Worker API service/origin settings and backend flags; never copy over owner private env. Clerk verifies the Studio-origin session online; there is no API Worker token exchange. No runtime cutover occurred here.

`GET /api/workspace` returns `{auth, sites}`, `no-store`, same-origin credentials and existing host/auth policy. One bootstrap request performs one Clerk authentication/session/user chain, one local PostgreSQL policy/user resolution and one filtered site-list query. It does not mean one SQL statement for the whole payload. Guests/denied users get no sites; provider failures fail closed. Concurrent in-flight requests coalesce; completed authorization is never cached. There is no idle polling or duplicate page-side identity pass. Existing auth/list endpoints remain for compatibility and explicit refresh/mutations.

Readiness uses only a bounded PostgreSQL connection/`SELECT 1`; liveness uses no provider. Preview remains Node/PostgreSQL `preview_grants` and the VM/Studio gateway:128-bit random grant, SHA-256 in DB, actor/site/immutable-version scope, three-minute TTL and policy/ownership checks on every asset. ADR-0003 sandbox/origin/redaction boundaries remain; no Worker preview branch exists.

## Upload and failure semantics

Node validates the ZIP, keeps actor/site transaction locks and reserves the immutable version before conditional `PUT If-None-Match: *`. A successful PUT acknowledges a new object. GET readback pins its ETag with `If-Match`, checks size and streams SHA-256 with an overrun cap. Only after all files pass does PostgreSQL commit the final manifest, active pointer/status and audit. The JSONB manifest gains verified unquoted `etag`; no SQL migration is needed and older manifests remain readable. [R2 documents atomic conditional PUT and conditional GET support](https://developers.cloudflare.com/r2/api/s3/api/).

Before COMMIT failure, rollback and cleanup target **confirmed new** keys only. A failed/lost conditional PUT acknowledgment could represent a collision or an object created without a received response; do not delete that key speculatively. This tightens the old attempted-key cleanup rule and can leave a private orphan for reconciliation. `upload.put_outcome_unconfirmed` logs only version/count. Readback failure after acknowledged PUT cleans that new key. Lost COMMIT response retains all possibly active objects and returns503 for refresh, as before. Persistent cleanup failures retain the bounded recovery event; durable orphan lifecycle remains an operational gate.

## Validation and rollback

113unit tests, lint/typecheck/build and all3CI checks PASS at `da92385`, including real PostgreSQL/isolated MinIO integration of500files, ownership/audit, preview grants and link lifecycle. [Commands, exact heads and limitations](validation/2026-10-24-node-postgres-admin.md). No local Docker/VM command, owner private file or live Cloudflare resource was used; existing CI runs on a disposable GitHub runner. MinIO evidence does not assert live R2/IAM or pilot acceptance#38.

Rollback source/image only after owner approval, retaining schema/history/data/manifests. The additive JSON field preserves old gateway compatibility. Never restore D1-primary/API Worker fallback, reapply D1migration0004 or erase objects/volumes. Projector33, publicWorker36, live pilot and source merge/deployment remain separate decisions.
