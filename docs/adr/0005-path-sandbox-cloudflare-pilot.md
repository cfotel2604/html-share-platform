# ADR-0005: Path-based, HTTP-sandboxed Cloudflare pilot

- Status: **Proposed**; owner authorized implementation on 2026-10-23, not production acceptance.
- Refs: #20, #10. Audit PR #19 remains independent historical evidence.
- Replaces only for the new pilot: hostname-per-site/viewer requirements in ADR-0001/0004 and PostgreSQL locks/hostname preview in ADR-0003. Existing VM lab remains governed by those ADRs; their statuses do not change.

## Decision

Studio presentation → workflow → typed HTTP adapter remains per ADR-0002. Node Route Handlers keep Clerk/CSRF and ZIP processing; an authenticated Worker API becomes the sole metadata writer to D1. Public and preview Workers read D1 primary and private R2 directly, never depending on Node/VM/PostgreSQL for serving. No dual-write or fallback to PostgreSQL in pilot mode.

Public URL: `https://hsp.odsusercontent.workers.dev/<10base62>/`. Preview: separate Worker `hsp-preview`, random128-bit capability hashed in D1, actor/site/immutable-version scope, TTL180seconds, no admin cookie, new tab. Account namespace is unverified; examples do not provision anything. API uses service credential plus independently verified active Clerk session/Google identity and D1 allowlist; client IDs/roles are not authority.

Every request checks active code, published site, current version and indexed manifest entry. All HTML, including nested/direct responses, uses HTTP CSP sandbox allow-scripts without allow-same-origin, no-store, nosniff and no-referrer. No public R2 endpoints, object-key/host-ID aliases or presigned read bypass. Revoke now denies content itself; update keeps code, revoked codes remain tombstones and cannot resurrect. In-flight/already-loaded bytes cannot be recalled.

Only relative assets and explicit nested HTML paths are supported. No cookies/local/session storage/IndexedDB, workers/PWA, forms/popups, arbitrary APIs, SPA/root routing, root-absolute assets, SVG/XHTML/XML/PDF or full-app compatibility. No Referer routing or arbitrary rewrite. AI review is not a substitute for isolation. Persisted browser APIs require a new per-site-origin design, never relaxed sandbox on this shared host.

## Transactions, integrity and failure semantics

Use separate D1 migrations; never edit PostgreSQL migrations0001–0003. D1 batch guards must raise a SQL constraint error inside the batch; zero affected rows are not a rollback. Revision/CAS prevents upload racing unpublish or ownership/policy change. A mutation receipt and audit commit with the state change. Reads use D1 without Sessions API/replicas and without authorization caches.

Node preflights ownership before ingest, validates20MiB compressed/100MiB unpacked/500files/depth12, reserves immutable prefix, writes create-only R2 objects and reads them back as a stream to verify SHA256/size/ETag. Finalize rechecks actor/policy/revision and commits metadata/active pointer/audit/receipt atomically; no DB transaction spans R2 IO. Serving checks pinned size/ETag before streaming, replacing the old gateway's per-read full-body hashing. This relies on trusted R2 and verified immutable writes; object replacement is denied by conditional reads.

Lost finalize acknowledgement is resolved through idempotency receipt, never speculative deletion. Aborted/expired intents need reference-checked cleanup; active versions, grants and uncertain commits are protected. Revoked actors cannot finalize, but private orphan objects may remain after earlier writes. This intentionally replaces the old long-lock storage-side-effect guarantee.

Native R2/D1 bindings have broader capabilities than GET-only application code; do not call this IAM read-only. Workers have128MB RAM; ZIP processing remains Node and serving streams. Production needs independent review of capability scope, abuse/cost/limits, provider failure and redacted access/error/analytics logs, plus custom content domain separate from Studio's registrable domain.

## Delivery and gates

Three stacked Draft PRs: contracts/docs → Cloudflare core → Studio integration. Start from main72e048e; do not merge automatically. Pilot data/resources are independent; lab source/images/DB/env/volumes/DNS/UFW remain unchanged. Local emulation and synthetic browser tests precede any remote provisioning decision. No automatic deploy from CI.

Acceptance includes hostile A/B direct/nested/preview, cookie/storage/worker/navigation denial, relative modules/fetch/CORS, revoked/unpublished/expired denial, CAS/policy/rotation/audit/lost-commit races, missing/tampered R2 fail-closed, and public reads with Node offline. Safari/iOS/Android/Zalo, real Clerk/R2/D1, log pipeline, latency/rows-read/cost and rollback remain explicit remote release gates. Rollback uses compatible Worker/D1 versions and disables mutations; never switches pilot metadata to PostgreSQL. ADR stays Proposed until review and acceptance.

Sources: [D1 batch](https://developers.cloudflare.com/d1/worker-api/d1-database/), [primary/replication](https://developers.cloudflare.com/d1/best-practices/read-replication/), [R2 binding](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).
