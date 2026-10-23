# Cloudflare pilot — local validation and operator handoff

2026-10-23; Refs #20/#10, Draft PRs #21 → #22 → #23. [ADR-0005](adr/0005-path-sandbox-cloudflare-pilot.md) stays Proposed. This is an independent synthetic pilot; no existing VM/lab, PostgreSQL migration, .env, upload, image, DNS/UFW or volume is changed. There is no deploy automation.

## Local checks without Cloudflare credentials

Use a separate worktree at the integration branch. Node22+ and npm are required. No Clerk/R2 keys are needed for the local fixtures.

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run test:cloudflare
npm run build
npm run build:workers
python -B scripts/check_docs.py
python -B scripts/check_yaml.py
git diff --check
```

`build:workers` uses Wrangler **--dry-run** only. Config templates contain placeholder resource IDs, `workers_dev:false`, `preview_urls:false`, no Cron and observability disabled. `.dev.vars*` and `.wrangler` state are excluded from Git and Docker build context, including nested directories. Do not remove those restrictions or execute a remote migration/deploy to make a local test work.

Miniflare is pinned to the same `5.20261019.2-beta` used by Wrangler4.152.0; its supported V4 conversion adapter loads the test configuration. This prerelease is development tooling only, not an application auth/runtime bypass. Local D1/R2 are ephemeral and private. Production Worker entrypoints never import `tests/cloudflare/test-api.mjs`; fixture identity does not exist in deployed bundles.

Browser verification uses the Playwright CLI workflow and [script](../tests/browser/cloudflare-path.js):

```sh
node tests/cloudflare/browser-fixture.mjs
# Read the LOCAL_BROWSER_FIXTURE loopback URL printed by this process.
npx --yes --package @playwright/cli playwright-cli -s=hsp-path-pilot open http://127.0.0.1:<port> --browser chrome
npx --yes --package @playwright/cli playwright-cli -s=hsp-path-pilot snapshot
npx --yes --package @playwright/cli playwright-cli -s=hsp-path-pilot run-code --filename tests/browser/cloudflare-path.js
npx --yes --package @playwright/cli playwright-cli -s=hsp-path-pilot close
```

Repeat in a separate CLI session with `--browser firefox`; install that browser if absent. The script resets synthetic sites, intercepts the content/preview/Studio hostnames to loopback, and aborts other network destinations. The Studio marker is synthetic, not the running owner Studio/Clerk account. The transport's `/reset`, `/control`, `/shutdown` and fixture auth are test-only, bind127.0.0.1, and are absent from Worker configs. Stop the fixture with Ctrl+C or its loopback POST `/shutdown`. Do not expose this transport publicly.

## Real pilot configuration — separate approval required

Account namespace `odsusercontent.workers.dev` has not been registered/verified in this task. Operator must first approve provisioning of independent D1/private R2/Clerk resources and choose Workers budget/limits. Full500-file finalize performs up to500R2 HEAD operations: verify the chosen paid limits or redesign verification into bounded batches before claiming full quotas on Free. Local timings cannot establish edge latency or billing cost.

Create private R2 with public r2.dev/custom-bucket-domain access disabled. Scope Node S3 credentials to the pilot bucket with object access, never account Admin. No presigned GET or storage-prefix route. Native Worker bindings remain broader than GET-only code; read-only IAM gate is not satisfied by this design choice.

Populate D1 through its **separate** `cloudflare/migrations/` sequence, including0002cleanup/system identity. Never apply these to PostgreSQL and never edit SQL0001–0003 of the lab. Initialize the D1 allowlist with selected synthetic/test identities using parameterized operator tooling; do not copy lab users, ownership or share history. The Worker creates an internal user only after verified Google/Clerk identity and active allowlist match.

Node pilot instance configuration, entered in a separate private environment:

| Setting | Requirement |
| --- | --- |
| `METADATA_BACKEND` | `cloudflare`; default `postgres` is only for existing lab. Unknown values fail closed |
| `AUTH_MODE` | `clerk`; demo auth is disabled for pilot |
| `AUTH_TRUSTED_ORIGINS` | Exact Studio pilot origin, matching Worker `STUDIO_ORIGIN` and Clerk authorized party/redirect setup |
| Clerk keys | Separate private Clerk setup; server keys never enter UI/config Git |
| `CLOUDFLARE_API_ORIGIN` | Exact API Worker origin, HTTPS except explicit loopback development |
| `CLOUDFLARE_SERVICE_TOKEN` | Random256-bit server-only credential, matching Worker secret `HSP_SERVICE_TOKEN` |
| `CLOUDFLARE_R2_ENDPOINT` | Account/jurisdiction R2 S3 endpoint over HTTPS, regionauto |
| `CLOUDFLARE_R2_BUCKET` | Dedicated private pilot bucket |
| `CLOUDFLARE_R2_ACCESS_KEY`, `CLOUDFLARE_R2_SECRET_KEY` | Node-only S3 credentials; not Worker/browser env public variables |

Worker API requires `HSP_SERVICE_TOKEN` and `CLERK_SECRET_KEY` as secrets, exact API/public/preview/Studio origins and D1/R2 bindings. Public/preview Worker needs no Clerk or service secret. Use distinct public, preview and API origins; never place privileged UI or session cookies on content hosts. Configure an isolated Node Studio instance on a separate loopback port; do not reuse the current lab Compose project/env/volumes or replace its image.

`GET /internal/health` is service-token-only and returns aggregate D1 readiness, not metadata. All `/v1/*` calls require service token plus independently verified Clerk session; browser never calls these directly. Readiness in pilot does not instantiate pg. The PostgreSQL factory additionally rejects pilot mode, so provider failure cannot silently fall back.

## Upload failure, reconciliation and rollback

Node preflights before multipart ingest, creates an intent, validates ZIP, writes create-only R2 objects, streams readback verification and finalizes with a stable idempotency key. Finalize rechecks policy/site revision in its transaction. Storage/validation failures before finalize attempt use terminal abort before cleanup. Once finalize has been attempted, an uncertain outcome retains objects and looks up the actor-scoped receipt; it never performs speculative deletion.

`reconcileExpired(env)` defaults to **dry-run** and returns counts only. A scheduled API Worker entrypoint can invoke it with `dryRun:false`, but no Cron is configured in templates. Operator must review/approve enabling a schedule. It fences expired open/aborted intents in a guarded batch, checks absence of version/grant references, audits as disabled `system:cleanup` identity, then deletes only that intent prefix. Failure leaves an aborted intent for retry; `cleanup_at` prevents completed work from being scanned forever. Finalized/active/version-referenced/grant-referenced objects are excluded. Never replace this with a blanket R2 lifecycle rule over published prefixes.

To stop the pilot, disable new Node mutations and public/preview routing after operator approval; keep D1 schema/receipts/tombstones/R2 objects. Roll back only to a tested compatible Worker/D1 version. Never redirect pilot metadata to PostgreSQL or revive old aliases. Existing lab remains independently available. Already-loaded content/in-flight requests cannot be recalled.

## Gates before any production claim

Real namespace/resource/IAM/public-bypass checks; actual Clerk/OAuth/revoke/quota/outage; remote maxquota/load/concurrency/cost; real-domain Safari/iOS/Android/Zalo/crawler; complete access/error/DNS/SNI/analytics/collector redaction of preview paths; abuse/takedown and security review; rollback and limited pilot acceptance. Production uses a dedicated content domain separate from Studio's registrable domain. HTTP sandbox and relative-assets/no-persistence support restrictions are not negotiable compatibility switches.

[Local evidence](validation/2026-10-23-cloudflare-pilot.md) distinguishes emulator/SDK fixtures from provider and owner evidence. #10 stays OPEN; ADR-0001/0003/0005 remain Proposed. No remote provisioning, migration or deployment was performed.
