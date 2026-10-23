# Studio latency and idle Worker usage

2026-10-23 (Asia/Saigon); Issue #28, Refs #20/#10. [Draft PR #29](https://github.com/cfotel2604/html-share-platform/pull/29), branch codex/studio-request-efficiency, stacked on #27 at62e8090. Implementation5c9e3fe. No merge, production/lab/VM/DNS/UFW/schema change; ADRs remain Proposed.

## Findings measured on the real Desktop pilot

1. Compose called local `/api/health/ready` every10seconds. That handler calls API Worker `/internal/health`, which checks service authentication and executes D1 SELECT1. This is approximately8640Worker invocations/day if continuously running (actual count depends on probe duration/uptime), even with no users. Temporary numeric tracing confirmed one Worker fetch per readiness probe.
2. Opening Studio fetched `/api/auth`, then `/api/sites`. Auth resolves Worker actor once; sites resolves actor again then lists sites. Each Worker identity pass checks JWT, online Clerk session/user and active D1 policy. Thus3Worker requests/6Clerk backend lookups for ordinary bootstrap,2Worker requests/4Clerk lookups for reload, excluding JWKS/refresh/retries. The UI waits for the whole chain before showing workspace.
3. Small Worker CPU values on the owner's screenshot are not elapsed page-load time. Waiting for Node→Worker→Clerk/D1 network operations is on the critical path. The measurement separates HTTP handler duration from SSR/page/hydration; it does not locate every remaining remote delay or establish CPU-limit exhaustion.

Temporary instrumentation used a private local Node preload, outside Git/build context, emitting only allowlisted operation names, numeric status/duration and an ephemeral integer sequence. No URL paths with identifiers, JWT/cookie/header/body, user/site names or preview grants were logged. It was removed from the final running Compose service after measurements; sanitized private receipts remain outside Git.

| Operation | Before5c9e3fe | After5c9e3fe | Upstream Worker calls |
| --- | --- | --- | --- |
| Workspace API chain (excluding SSR/hydration) | Auth1904ms + sites2343ms =4247ms |2153ms first measured request including near-expiry JWT refresh;1696ms another request |3→1 |
| Reload list |2343ms /2878ms |791ms |2→1 |
| SSR page |756ms with560ms Clerk JWKS fetch |1027ms with881ms JWKS on first request;29ms on another | No metadata Worker call |
| Container probes | Worker/D1 request every10s | Local live30s, measured59/4/2/3ms with no fetches |1→0 per automatic probe |

After2153ms workspace sample: Node JWKS97ms, online session334ms + refresh791ms, Worker809ms. Reload791ms included one Worker workspace fetch774ms. These few samples demonstrate fewer calls and observed improvement, **not a p50/p95 or sub-second guarantee**. Remaining Clerk/provider/network variance needs controlled profiling before further optimization.

## Change and boundaries

Add authenticated `/v1/workspace` returning actor plus the already ownership-filtered list, after the existing service/JWT/online Clerk/Google/D1 checks. Node `/api/workspace` uses that single response for bootstrap; `/api/sites` uses the same request-scoped context for reload. Typed optional `StudioApi.workspace` retains the replaceable UI/legacy adapter contract. PostgreSQL mode keeps its existing ownership implementation; no pilot dual-write/fallback. SSR private preview and mutations retain their own auth paths.

Independent Clerk session/user lookups run concurrently only after verified claims, and every result is validated before D1 identity/policy access. No permission, token, publish or revoke decision is cached across requests. Local liveness healthcheck does not assert remote readiness; `/api/health/ready` and the service-protected Worker health remain available for explicit preflight/incident checks. Node operations still fail closed if the provider is unavailable. Health polling never serves as an authorization grant.

Deployment: API additive route first, version `1213ee99-cf7b-4aaf-9db7-e24b0b0eaf6f`, then Desktop image `html-share-studio:cf-efficiency-5c9e3fe`, config digest `sha256:26e792e53e9bca05eeadcec945090ab4ea3a29af0da0ed3c9cc2e04b1444585d`. Prior images retained. Public/preview Workers and D1/R2 schema unchanged. Rollback Node to a compatible prior image if needed; keep local liveness polling and preserve metadata/receipts/objects. A container marked healthy only means Node is alive; check remote readiness separately before release or on incidents.

Local lint/typecheck,108unit tests,35Cloudflare groups,3Worker dry-run bundles, Docker production build and Compose config PASS. Regressions cover single-RPC context, owner/Admin filters, next-request policy revoke, guest/denied/503 without prior sites, independent Clerk lookup overlap and banned/session-mismatch denial. SourceCI at5c9e3fe4/4PASS; check exact docs head separately. Read-only browser bootstrap/reload200 and9automatic liveness probes with zero fetches observed on the actual pilot. Final inspect confirms no preload mount/NODE_OPTIONS diagnostic remains; local live30s, service-only remote workspace401, guest bootstrap signed-out/empty/no-store and guest list401 PASS. No user data was changed for these measurements.

## Owner evidence and usage interpretation

Owner reports blocking a user in Clerk then refreshing Studio shows the account locked. Record this as **owner-confirmed blocked-user/F5 evidence**; it does not separately prove all session revoke/disable/upload-finalize races. Owner also reports Safari, Zalo and other clients load successfully; device/OS/browser versions and detailed adversarial cases were not supplied. This is **owner-confirmed loading compatibility**, not a full security matrix. Existing independent local regression evidence stays separate.

The owner's screenshot shows914/100000daily requests (about0.914%), with645API,44preview and168public in the visible per-Worker summaries. Do not sum widgets as an exact common-period breakdown. Test probes, health checks and real page/asset loads all contribute. Historical attribution by route was not collected, so we cannot assign an exact share of914to healthchecks. The proven automatic polling and duplicate read paths are fixed without changing subscription or cache policy.

Workers requests are not page views/uploads. Each requested public asset/HTML/redirect or denied route may invoke a Worker; `no-store` deliberately refetches rather than retaining revoked content. The500-file Node upload sends PUT/readback directly to R2, whose ClassA/B operations are counted separately; it is not500upload Worker invocations. Measure per-page requests, D1 rows and R2 operations before a production budget decision. No cache/revocation semantics were loosened to reduce this number.

References checked2026-10-23: [Workers request pricing](https://developers.cloudflare.com/workers/platform/pricing/), [CPU/wall-time metrics](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/), [R2 operations pricing](https://developers.cloudflare.com/r2/pricing/). Full IAM/security/mobile matrix, sustained load/cost, cleanup scheduling, preview log pipeline and compatible rollback drill remain gates under #10/#20. Wrangler logout reminder remains at final project completion.
