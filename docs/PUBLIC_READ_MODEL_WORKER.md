# Public read-model Worker — Issue #36

Refs #36 / Epic #31. Base main `f6c78340983060687b969d7aae0e2f7e80ebd381` after owner reported PR43 merged. Source is PostgreSQL; public serving reads only D1 primary and immutable private R2 assets. No API/preview Worker, Clerk, management secret, Node/VM/PostgreSQL request, projection write or UI change belongs here. Applied migrations and read-model SQL remain unchanged.

## Implementation scope

- One public entrypoint: exact `resolve.sql` primary lookup, at most one D1 query per request; published code and closed manifest required. Stream only pinned R2 size/ETag, canonical `/<code>/` index and nested/direct HTML with HTTP sandbox/security headers. No content/credential/URL logging.
- Reuse only suitable serving ideas from PR22 (`origin/codex/cloudflare-path-core`); the old SQL reads management tables and preview/auth helpers must not be imported. ADR0005 serving context read from PR21 `origin/codex/cloudflare-path-adr`, superseded by ADR0006 elsewhere.
- Local empty D1/R2 tests, projector-produced snapshots and hostile paths first. No D1 pilot write, Worker deploy/provision, VM/local Docker or owner private-file/worktree access. Source review/merge is separate from remote acceptance.

## Binding clarification — owner decision pending

Issue36 / plan Issue5 says no write binding / read-only bindings. Cloudflare's native [R2 bucket binding](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) exposes get/head **and put/delete**; [D1 binding](https://developers.cloudflare.com/d1/worker-api/d1-database/) permits write SQL as well as SELECT. The earlier ADR0005 already noted native capabilities exceed GET-only application code. A code facade or TypeScript type does not create provider IAM read-only permission.

Proposed interpretation for owner review: application serving uses only the fixed SELECT and get/head, enforced by tests/static review; no management credentials or write paths. Native binding capability remains broader and must be documented as such, with deployed-binding evidence still an unrun remote gate. If provider-enforced read-only capability is mandatory, pause binding/config implementation for a new design decision rather than claim a facade meets it. No exception to ADR0006 is assumed.

Implementation/validation in progress. Keep Draft. Wait for owner merge reports in chat; no merge-monitor automation or automatic merge/deploy.

## Implemented independent core

At `336dc748795a5a2b187e124d098c3323c61e4d2f`, `cloudflare/public/policy.mjs` and `serve.mjs` implement the provider-independent reader contract (`lookup`, `get`, `head` only): closed manifest validation, exact site/version/R2-key identity, safe paths, distinct registrable origins including private suffixes, canonical redirects, GET/HEAD, full metadata pinning and stream delivery. Headers come from the extension allowlist, never R2/user HTTP metadata. No cache/conditional/range path skips lookup; no error logs or provider-detail response is emitted.

The11new unit cases use injected readers only. They do **not** demonstrate native Worker entrypoint, exact primary D1 query execution, Miniflare D1/R2 end-to-end, deployed bindings or actual VM-offline acceptance. Those dependent steps remain pending the owner binding decision. The raw available URL is checked before dot normalization; if a browser/proxy already normalized a path, only the selected code's validated manifest/prefix is authoritative. HTTP sandbox restrictions are asserted; real browser/cookie/compatibility proof remains a separate gate.

Local `npm ci`, lint/typecheck,153tests (142existing +11new) and build retry PASS; inherited Next security nudge belongs to #40. No package/lock/migration/read-model SQL change. [Revision-specific validation](validation/2026-10-24-public-read-model-worker.md).
