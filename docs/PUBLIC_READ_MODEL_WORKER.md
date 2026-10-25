# Public read-model Worker — Issue #36

Current scope: [consolidated pilot authority](PILOT_APRIME_AUTHORITY.md) grants deployment of the merged public artifact to named `hsp-pilot`, plus old pilot Worker retirement, with immediate target/account/config/artifact recheck and readback. Older per-deploy approval statements below predate this instruction. Production/merge/VM-write gates and all code-only read-only/security constraints remain; current facts are in [execution receipts](validation/2026-10-24-aprime-pilot-execution.md).

Refs #36 / Epic #31. Base main `f6c78340983060687b969d7aae0e2f7e80ebd381` after owner reported PR43 merged. Source is PostgreSQL; public serving reads only D1 primary and immutable private R2 assets. No API/preview Worker, Clerk, management secret, Node/VM/PostgreSQL request, projection write or UI change belongs here. Applied migrations and read-model SQL remain unchanged.

## Implementation scope

- One public entrypoint: exact `resolve.sql` primary lookup, at most one D1 query per request; published code and closed manifest required. Stream only pinned R2 size/ETag, canonical `/<code>/` index and nested/direct HTML with HTTP sandbox/security headers. No content/credential/URL logging.
- Reuse only suitable serving ideas from PR22 (`origin/codex/cloudflare-path-core`); the old SQL reads management tables and preview/auth helpers must not be imported. ADR0005 serving context read from PR21 `origin/codex/cloudflare-path-adr`, superseded by ADR0006 elsewhere.
- Local empty D1/R2 tests, projector-produced snapshots and hostile paths first. No D1 pilot write, Worker deploy/provision, VM/local Docker or owner private-file/worktree access. Source review/merge is separate from remote acceptance.

## Binding clarification — owner accepted, 2026-10-24

Issue36 / plan Issue5 says no write binding / read-only bindings. Cloudflare's native [R2 bucket binding](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) exposes get/head **and put/delete**; [D1 binding](https://developers.cloudflare.com/d1/worker-api/d1-database/) permits write SQL as well as SELECT. The earlier ADR0005 already noted native capabilities exceed GET-only application code. A code facade or TypeScript type does not create provider IAM read-only permission.

Owner chose application read-only: **only the fixed parameterized SELECT from resolve.sql and R2GET/HEAD pinned to manifest path/size/ETag**, enforced by code/tests/review/deploy gate. No dynamic SQL, write SQL/batch, R2put/delete, management routes or management secret. Native binding capability is broader; this is **not provider IAM read-only**. This is a clarification of ADR0006, **not an exception**, and grants no pilot deployment approval. ADR0006, the plan and Agent Guide record this decision; do not ask it again or describe a facade/type as IAM enforcement.

PR44 source is now MERGED; runtime cutover remains unrun. [Draft PR46 / #38 preparation](PILOT_APRIME_ACCEPTANCE.md) does not authorize deployment. Wait for owner instructions; no merge-monitor automation or automatic Ready/merge/deploy.

## Runtime contract

`worker.mjs` adapts native bindings to `serve.mjs`/`policy.mjs`. It imports the **unchanged resolve.sql** as text at build time. The only D1 call is `PUBLIC_READ_MODEL.prepare(resolveSql).bind(code).first()` on the base binding: no Sessions/bookmarks, dynamic SQL, second lookup or management table. The Worker never fetches Node/VM/PostgreSQL, Clerk or a service endpoint. D1/R2 are the only native resource bindings; the only configuration values read by code are the two public origins.

| Request/result | Application D1/R2 budget and behavior |
| --- | --- |
| Unsafe origin, malformed code/path, forbidden type or method | No D1/R2 call;404 or405 with controlled denial headers. Configuration/provider failure is static503. |
| `/<code>` | One published lookup plus validated manifest, then308 to `/<code>/`; no R2 read and no reflected query/host/header. |
| `/<code>/` / explicit nested asset | At most one fixed primary SELECT; `index.html` for root, exact case-sensitive manifest match otherwise. Missing/unpublished/revoked →404. Outside manifest →404, even if an object exists in R2. |
| GET published asset | One conditional R2get with manifest ETag. Size and ETag must both match; absent body/precondition failure/corrupt snapshot →503. Only the validated object stream is returned. |
| HEAD published asset | One R2head, same size/ETag checks and headers, no body. |

Every request validates the closed public snapshot: source site/version IDs, immutable R2 key `<site>/<version>/<path>`, unique safe paths, allowlisted extensions, at most500files/100MiB, bounded manifest JSON and valid ETags. No R2 HTTP/user metadata controls response MIME, cache, disposition or cookies. HTML root/nested/direct responses carry HTTP `sandbox allow-scripts` without allow-same-origin, no-store/nosniff/no-referrer; non-HTML MIME comes from the existing extension allowlist. Public CORS is `*` without credentials. Caller Range/If-* headers are not forwarded, so neither partial responses nor304 bypass the fresh published lookup. No Cache API or authorization cache exists.

The raw available URL is checked before dot normalization; if a browser/proxy already normalized a path, the selected code's validated manifest/prefix remains authoritative. All failures are static and code emits no logs of URLs, headers, SQL, credentials, IDs or uploaded bytes. Uploaded code is streamed as bytes and never evaluated server-side. Integrity relies on trusted immutable R2 plus Node's verified upload and pinned size/ETag; this Worker does not rehash full objects per read. It does not recall bytes already loaded in a browser or remove projector lag.

## Build and local checks

Run from repository root:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build:public-worker
npm run build
```

The pinned **dev-only esbuild0.28.2** bundles ESM plus the exact SQL into `dist/public-worker/worker.mjs` and records its input graph. It makes no provider call/deploy; no runtime dependency version changes. CI builds this artifact explicitly. The public graph includes only three Worker modules, the existing pure asset policy, resolve.sql and tldts; no Node service/Clerk/AWS/projector/preview module is bundled.

AST tests scan owned sources **and the built artifact**: write SQL/APIs/batch/exec/session/cache, native binding escape, dynamic SQL/import and network/logging authority are rejected. Mutation probes demonstrate the guard fails on insert/update/delete, R2put/delete and write batches. Native adapter tests count exactly one prepare/bind/first per valid request and no R2 access for denied/unlisted data. These are regression/review controls, not an IAM boundary or proof against arbitrary malicious changes to code/tests.

Miniflare tests execute the actual bundle with fresh local D1/R2, block/count outbound requests and exercise real published filtering, injection denial, nested/direct CSP, canonical/HEAD/conditional behavior and integrity failures. A Node500file upload/outbox/projector fixture feeds this reader, closes/reopens a persistent local source and verifies public reads continue without another projection. Revoke/stale replay/rotate/active-version/unpublish/publish behavior is checked end-to-end. This is a **local source shutdown simulation**, not a real VM outage receipt. [Exact-head evidence and limits](validation/2026-10-24-public-read-model-worker.md).

## Configuration and remote gate

`cloudflare/public/wrangler.jsonc` is a local/build template named `hsp-pilot`: two native resource bindings, two example origins, fake/local resource IDs, remote bindings false, workers.dev/preview URLs/observability disabled. It references the built artifact with custom build run from repo root. Wrangler4.152.0 `types` validated the corrected config/build locally, without deployment; generated types remain ignored under node_modules/.cache. This template is not a migration config and must not be used to provision or deploy the pilot as-is.

Before proposing an actual deployment, owner separately approves a concrete private config/artifact/target/rollback plan and verifies account/database/bucket against the private receipt, existing read-model schema/ledger and replication-disabled/primary policy. Do not reapply D1migration0004. Check the **actual deployed** binding/secret inventory, because absence from a template does not prove old secrets/bindings have disappeared. Native capabilities remain broader even after this inventory. Existing API/preview Workers and old stack disposition/cutover belong to #37/#38; this PR has not retired or deployed any resource.

Still unverified: deployed single-public-Worker state, real binding/secret inventory, real VM/Node/PostgreSQL-offline200 and logs both sides, real R2/IAM/latency, browser cookie/sandbox compatibility/mobile/Zalo and pilot revoke404 propagation. Owner confirmed #38 healthy revoke→public404 p95≤60s and pending>60s warning/Admin pending; these are unmeasured pilot gates, not a60s guarantee during projector/REST outage. Report actual incident lag/depth/recovery/containment separately; [preparation/approval packets](PILOT_APRIME_ACCEPTANCE.md). Node projector secrets/rotation stay in Node's secret store; none belongs in this Worker/config/browser or PR.

Rollback before deployment has no runtime effect: retain current source/runtime and additive schema/history. Any later rollout/rollback is separately approved and must preserve the public read-model contract, tombstones and fail-closed serving; never restore a management/preview Worker or direct R2/legacy serving bypass as a shortcut.

Inherited Next security nudge remains tracked by #40; the existing app build passes on retry. This change makes no production dependency upgrade or applied PostgreSQL/D1 migration/SQL edit.
