# Security closeout for the accepted A-prime pilot — Issue10 / PR19

Scope chosen explicitly by owner25/10: **the current A' pilot/lab**, not production preparation. Main5e05e4d includes owner-merged59;38 and Epic31 are CLOSED completed following explicit owner acceptance. This review changes docs only and updates the existing Draft19; no code/runtime/credential/DNS/SQL change or legacy code import.

## Remove from current gate

| Historical item | A' disposition |
| --- | --- |
| Legacy MinIO shared/root credentials | Old hsp-lab environment only; new isolated A' Node uses private R2 and separately scoped writer/reader. Do not alter retained oldlab data |
| VM trusted viewer, viewer limiter and OG/card implementation | A' public URL goes directly to the Worker. Node/viewer aliases deny; no VMviewer fallback or old metadata implementation to port |
| Public per-site VM hostname/production wildcard/443 expansion | New public serving uses the deployed Worker origin; preview retains only existing lab wildcard/TLS/exact p-grant route. No DNS/UFW or unrelated vhost changes for this review |
| API/preview Worker, D1-primary, Clerk bridge | Retired/replaced by Node/PG administration and Node grant preview; never re-enable or import legacy data |
| Production Clerk/OAuth/domains/TLS deployment and forced-renewal/production rollback drills | Outside owner-selected current pilot closeout. Reassess on the actual future production target/config before any production deployment |

## Retained A' controls and evidence

| Applicable control | Evidence / status |
| --- | --- |
| Node-only Clerk/RBAC/ownership/audit and atomic finalize | Merged41/42/48; authorization before storage, online session/policy locks, accepted Employee/Admin matrix and CI. No Worker/D1 admin route or mint bridge |
| Origin/sandbox/active formats | PSL/private-suffix separation, every HTML sandbox without allow-same-origin, no-store/nosniff/no-referrer; active formats rejected; actual desktop/public/preview cookie+storage denials and owner-confirmed mobile/Safari/Zalo |
| Private R2 and privilege separation | Real500file readback/conditional PUT and unknown-PUT/COMMIT protections retained. Owner25/10explicitly confirms distinct pilot-bucket writer and read-only reader. Fresh metadata: r2.dev disabled, no custom bucket domain. No destructive IAM probe; unsigned S3HEAD400 is not counted as IAMdenial proof |
| Worker capability and public lifecycle | Fixed single parameterized primarySELECT + manifest-pinned GET/HEAD; no admin secret/callback/write API in code. Native bindings retain platform write capability as owner already clarified; no IAMread-only claim. Existing real revoke/unpublish/rotate/serving and services-off receipts |
| Node preview |128-bit hashed grant,3minuteTTL, actor/ownership/immutableversion checks; HTTPS/expiry/denials/Adminiframe passed. No grant/session forwarding into public Worker |
| Revoke/incident operation | Healthy20sample500manifest revoke p95=5.298s; outages separate/no60soutage guarantee. Owner chose Studio pending/overdue/stale warnings; extra elaborate live fault drills explicitly omitted, not PASS. Approved normal token rotation completed |
| Logging | Node/Worker static sanitized errors; both nginx accesslogs off/all3errorlogs protected. Owner-authorized SSH inspection found protected HSPnginx, local Dockerjson-file, no recognized logshipper/rsyslogforwarder, no tunneldebug and zero rawpreviewhostname matches in bounded samples. Provider control-plane/DNSanalytics is outside SSH visibility, not assumed disabled |
| Dependency/source/deployment discipline | PR49patched Next/Zod; fresh prior full+production audits0; current accepted source/CI/provenance and rollback receipts retained. This docs review performs no deploy or data cleanup |

## Remaining review record

Fresh read-only receipts are recorded below. The owner did not know the external logging setting and explicitly requested SSH inspection. The VM-controlled surfaces are now inspected below; provider-managed account/DNS/analytics settings remain unverified by this method. Provider DNS/SNI visibility is not a guarantee of grant secrecy; preview capability remains short-lived and scoped. Production is a different decision; ADR0001/0003 retain their broader Proposed release scope without altering implemented A' invariants.

Prior evidence: [accepted-pilot ledger](2026-10-25-aprime-closeout.md), [actual execution](2026-10-24-aprime-pilot-execution.md), [preview](2026-10-25-public-preview.json), [browser/rotation](2026-10-25-browser-boundary.md), and [owner acceptance38](https://github.com/cfotel2604/html-share-platform/issues/38#issuecomment-6398587876). No device traces, live fault PASS or production approval is invented.

## Fresh read-only results and method limits

CLI account/database fingerprint matched the approved task target before reads. R2dev URL disabled/no custom domains. Worker deployment selected by newest created_on (24/10 16:09:05UTC),100% on one version, exactly PUBLIC_READ_MODEL/ASSETS/PUBLIC_ORIGIN/STUDIO_ORIGIN, no secret binding; D1/bucket targets match. Native write capability remains broader than the application read-only contract.

Source2734de5/image2fd14ccc unchanged. Existing published500manifest fixture HTML GET200, actual bytes size/SHA match, HTTPsandbox/no-store/no-cookie. A newly generated **nonissued** preview-shaped hostname returned404 using normal HTTPS certificate validation; no real grant was created. Guest Studio `/api/sites`401 and Worker `/api/sites`404. Validated nginx closed-map/logging fingerprint unchanged. [Sanitized results](2026-10-25-aprime-pilot-security.json).

Limitations retained: unsigned S3HEAD400 does not prove IAMdenial; actual role scope is owner-confirmed plus provider privacy metadata. Initial HEAD did not establish content integrity, so GETbody verification was used instead. Wrangler lists deployments chronologically: the first assertion hit the historical six-binding version and stopped; selecting latest timestamp confirmed current A'. No rollback/deploy or security incident was caused by those diagnostic limitations.

## Future production entry checklist — outside this closeout

Before an actual production change, review its real domains/routes/certificates and Clerk production instance, operator secrets/roles, preview logging pipeline, abuse/quotas/capacity and recovery/rollback plan. Do not reuse legacy provisioning or broaden IAM/origin/sandbox to bypass review. These are conditions on that future action, not unfinished implementation work for today's owner-selected pilot. No shared-IP inventory/forcedTLS drill is run solely to carry the old VM public architecture forward.

## Commands and remaining item

Used repository/worktree/remotes/fetch/live GitHub/accepted59+38 checks; pinned Wrangler4.152.0 r2dev-url get/domain list/deployments list/versions view (read-only, target-pinned); task-owned read probes via existing Node preview process; external guest HTTP checks; docs/YAML/local-link/diff validation. Source/auth/gateway/Worker/security tests and accepted receipts were reviewed rather than mutating the accepted pilot to repeat them. Final exact-head CI belongs in PR19.

PR19 now presents the completed, bounded pilot/VM review for owner review/merge and closure10, with provider control-plane visibility explicitly unverified. This is not an assertion that Cloudflare/DNS systems log nothing. R2policy/pilot scope remain confirmed; do not ask the owner to guess logging settings or re-open38/31. Keep Draft; owner decides merge/closure, production remains separate.

## Owner-authorized SSH logging inspection — 25/10

The owner asked us to inspect because they did not know the settings. No configuration/service/credential was changed; no secret file, raw log content, issued grant or other application's details were exported. [Sanitized snapshot](2026-10-25-aprime-logging.json).

| Surface on lab-b | Actual read-only finding |
| --- | --- |
| HSP nginx |2access directives, both off;3error directives, all `/dev/null crit`; no nested include; effective `nginx -T` passes and config fingerprint unchanged |
| A' Docker services and tunnel |Local `json-file` logging; no remote logging-driver configuration observed for these containers. Logging is not globally disabled |
| cloudflared |No debug/logfile flag, debug/file env setting or debug/logfile setting in its mounted config. The inspected config has Studio hostname, not the preview wildcard/hostname |
| Host collectors/syslog |journald and rsyslog run locally. Four rsyslog configs inspected: no recognized forwarding directive or imfile input for Docker/nginx. No active recognized Fluent/Vector/Promtail/Filebeat/Alloy/OTel shipper in the inspected service/process/image inventory |
| Local DNS |systemd-resolved active at info log level; no separate recognized query-logging DNS daemon found. This does not inspect authoritative/provider DNS logs |
| Bounded samples |5running-container logs (last24h/tail10000),4journals (last24h/tail2000) and2global nginx log tails:0A'previewhostname-pattern matches in every sample. Only counts exported; nginx files were empty |

A zero count is a sampled observation, not proof that no past/future request or custom collector can ever contain a hostname. Initial inventory helper template errors stopped before any state change and were corrected; only the final complete snapshot is used for conclusions.

**Boundary:** SSH cannot reveal the Cloudflare account's Logpush/DNSanalytics settings or an external resolver/collector. They are **not verified and not marked OFF/PASS**. DNS/SNI visibility remains inherent to hostname-based grants; TTL/scope and app-controlled logging protection remain as designed. To establish those provider settings, use separately accessible provider control-plane evidence rather than guessing from the VM. The owner reviews this explicit limit when deciding to merge the current pilot-only audit; no global secrecy or production approval follows.
