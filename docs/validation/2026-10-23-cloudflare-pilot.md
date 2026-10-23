# Local Cloudflare pilot evidence — 2026-10-23

Refs #20/#10, Draft [#21](https://github.com/cfotel2604/html-share-platform/pull/21) → [#22](https://github.com/cfotel2604/html-share-platform/pull/22) → [#23](https://github.com/cfotel2604/html-share-platform/pull/23). [Contract](../CLOUDFLARE_PILOT.md), [ADR-0005 Proposed](../adr/0005-path-sandbox-cloudflare-pilot.md), [runbook](../CLOUDFLARE_PILOT_RUNBOOK.md).

**Subsequent review at implementation0a3c9d0:** [two P2 upload-lifecycle findings confirmed](../reviews/2026-10-23-cloudflare-upload-review.md): captured JWT expiry and PUT arriving after cleanup_at. Existing19groups rerun PASS but do not cover these interleavings. The green evidence below remains scoped to its executed cases; operational pilot requires fixes and regression acceptance. No implementation fix is included in this review handoff.

## Source and scope

Main72e048e verified by fetch/GitHub before implementation. ADR77ae10a, core3b74981, integration implementation **dcdfd0b**; subsequent handoff and Docker-context exclusion of Worker secret/emulator files do not change app/Worker source. Exact current head/CI must be checked in PR. Primary main and all previous owner worktrees remain unchanged. Existing PR #19 audit is independent, not a dependency or merged in this task.

No SSH/runtime mutation, deployment, remote provisioning, DNS/UFW, env/image change, migration/backfill or real upload/session data access. PostgreSQL SQL0001–0003 have byte-identical diff against origin/main. Fixtures contain synthetic identities/assets only; raw codes/grants/HTML/provider secrets are not included in this report.

## Local checks

| Check | Result and limit |
| --- | --- |
| `npm run lint`, `npm run typecheck` | PASS |
| `npm test` | **90/90 PASS**, preserving the legacy86 tests plus pilot backend/RPC/readiness checks |
| `npm run test:cloudflare` | **19 groups PASS**, actual local D1/R2/workerd via Miniflare |
| `npm run build` | Next16.4.2 production/standalone PASS |
| `npm run build:workers` | All3production Worker bundles dry-run PASS; no fixture auth import/deploy |
| `npm audit --omit=dev` | **0 vulnerabilities** after Next16.4.2 patch;5dev-only inherited ESLint-chain high advisories remain, no force downgrade |
| Docs/YAML/links/diff | Required docs,7GitHub YAML, all34Markdown/local links and whitespace PASS |

D1/R2 cases: owner preflight, fresh policy revoked after preflight/during R2 check, upload-unpublish CAS, concurrent rotation/one-active-code/tombstones, update without resurrecting revoked code, audited-batch rollback, lost acknowledgement/receipt recovery and mismatched key denial, immutable private-preview version/hash-only receipt/expiry/disabled actor, missing/tampered objects, strict canonical/path/MIME/Host/method checks, soft-delete denying public and preview, no object-key alias, no PostgreSQL fallback, Node readback failure and safe abort/cleanup, uncertain outcome preservation, and expired orphan dry-run/fenced cleanup/retry protecting committed references.

Worker identity test uses an actual locally signed RS256 JWT verified by the Clerk SDK, with a synthetic BAPI adapter: wrong service credential, expired/wrong-party/tampered JWT, signed Admin claim, revoked online session, unverified primary email and disabled allowlist cannot grant authority. This is not real Clerk/OAuth availability or production-session evidence. The production API uses the real SDK and no fixture authentication branch.

Streaming test returns a90MiB synthetic stream with zero reads before response and one chunk read on demand; no full-body hash/buffer in serving. Node still verifies SHA256/size/ETag before finalize. Local read probe16requests:80D1rows total (**5/request**), p50~13ms/p95~18ms in one local run. These are emulator/in-process transport values, not network edge latency, throughput, cost or SLA.

## Browser evidence

Playwright CLI, Chrome **156.0.8078.47**, Firefox **156.0**, Windows. Both PASS7groups using loopback Miniflare transport and synthetic A/B packages:

1. Direct and nested HTML under two prefixes have HTTP sandbox and serialize origin as null.
2. Cookie read/write, local/session storage, IndexedDB, document.domain, worker/service worker and popup denied.
3. Relative ES modules and fetch/CORS work under each prefix; root-absolute request outside code prefix404.
4. Hostile page cannot modify synthetic trusted Studio opener DOM or navigate it.
5. Parent-domain cookie marker and Studio host-only HttpOnly marker unchanged.
6. Unpublished public URL404; separate preview hostname loads sandboxed content directly, no iframe.
7. Revoked code denies direct content without alternate viewer URL.

Firefox can return a Worker object before an asynchronous security error and throws for popup denial. Probe checks actual worker execution/error rather than treating constructor success as execution. Expected CSP/worker/404 console errors are not interpreted as compatibility failures.

All remote-looking content/preview/Studio URLs are intercepted to local fixture responses; other destinations are aborted. No HTTP request serves from an actual workers.dev application or the owner's Studio. No real login/owner lifecycle matrix was rerun. Mobile/Safari/iOS/Android/Zalo/crawler and remote provider/TLS/logging/IAM/cost gates remain **unverified**, not PASS.

## Review and rollout

Exact implementation head dcdfd0b has all4CI checks SUCCESS: [application](https://github.com/cfotel2604/html-share-platform/actions/runs/39923940889), [docs](https://github.com/cfotel2604/html-share-platform/actions/runs/39923940760), [Cloudflare local](https://github.com/cfotel2604/html-share-platform/actions/runs/39923940648), [legacy security integration](https://github.com/cfotel2604/html-share-platform/actions/runs/39923940624). PR #21 exact77ae10a has2checks SUCCESS; #22 exact3b74981 has4checks SUCCESS. Handoff head checks are separate, see current PR Checks.

All PRs stay Draft; no merge or deployment authorized by these results. #20 tracks implementation; #10 remains release/security gate. Native bindings have write/delete capabilities despite GET-only serving code. New pilot metadata uses D1 exclusively; Node/server-to-server upload remains necessary. No production claim, no ADR Accepted, no automatic remote Cron or cleanup of the existing lab. Review ingress/private bucket/Clerk/limits/logs and operator rollback before provisioning a real pilot.
