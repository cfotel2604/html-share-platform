# Issue54 — isolated A-prime preview namespace

Refs #54 / #38. Owner keeps old view-lab test links and content upstream4100. Prepare new private preview host grammar p-<site-id>--<grant> under the existing content wildcard, routed only to A-prime gateway4110. Label62characters, same128bitgrant/3minuteTTL/version+actor+policy scope and HTTP/iframe sandbox. No DNS/UFW/Worker/D1preview or fallback. Source from mainb8ae10f; separate branch/Draft. Actual nginx/runtime apply requires source integration/exact-headCI and guarded HSP-only config/readback.

Do not port unmerged48public-serving changes here or mark public preview PASS from source tests. Existing old runtime remains untouched; owner merges, no production action.

## Routing choice

Read-only HSP nginx inspection found an existing wildcard `server_name *.lab-space-ods.cfvn.cloud`. A separate regex vhost would lose to that wildcard, so use a closed **map inside the existing HSP wildcard vhost** rather than another vhost. [Map template](../../deploy/nginx.aprime-preview-map.conf.example) selects only two numeric loopback destinations: an exact `p-<32hex>--<26base32>.lab-space-ods.cfvn.cloud` hostname goes to4110; existing legacy hosts keep4100. No arbitrary request value becomes an upstream, and a denied A' request never retries the legacy service. Existing Host forwarding and TLS remain; both content vhosts retain access/error-log protection for bearer grants.

The Node formatter emits the p-prefixed grant. The parser accepts that complete grant grammar and rejects old unprefixed grants before PG/R2. Its existing no-grant host parsing is unchanged here because removal of Node public serving belongs to48; **deploy only the integrated A' candidate**, not this branch alone. Tests for the UI-independent formatter, DNSlabel length, malformed/old-host denial before data access, hashed grant/expiry query and manifest/sandbox integrity are required. Integration fixtures route the new host grammar through the same real PG/gateway stack.

Before any runtime step, owner merges54's source PR,48is refreshed/revalidated, image built/pinned and target/old-vhost fingerprints rechecked. Stage the exact map, replace only the existing HSP TLS proxy_pass with `http://$hsp_lab_content_upstream`, verify fixed destinations/Host/logging, run nginx-t and controlled reload with a protected backup. Read back legacy routes unchanged and A' preview integrity/sandbox/TTL on actual HTTPS. Never expose an invalid grant as public data or claim success from config syntax alone. No DNS/UFW/Worker/D1 or tunnel change is needed for this namespace.

## Local validation

`npm ci`, `npm run lint`, `npm run typecheck`, `npm test` (167/167), `npm run build`, documentation/YAML checks and `git diff --check` pass. Added cases cover exact62characterlabel, complete128bitgrant format, old/malformed namespace rejection beforePG/R2, hash-only SQLparameter and expiry predicate, plus fixed loopback map selection with no legacy retry. Existing ownership/upload/manifest/sandbox tests remain. Final exact-headCI is recorded in Draft55. No VM/nginx/DNS/secret/runtime mutation in this branch. Actual HTTPSgrantisolation/TTL and old-link readback remain required after source merge/integration and controlled deployment.
