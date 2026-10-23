# Cloudflare pilot — local validation and operator handoff

2026-10-23; Refs #20/#10, Draft PRs #21 → #22 → #23 plus the operations branch. [ADR-0005](adr/0005-path-sandbox-cloudflare-pilot.md) stays Proposed. Existing VM/lab, PostgreSQL migrations, owner env/uploads/images, DNS/UFW and volumes remain unchanged. Owner subsequently authorized independent remote pilot resources and Desktop Docker; see [current provider evidence](validation/2026-10-23-cloudflare-desktop.md). The commands below distinguish local checks, inspection and explicit mutations.

## Current Desktop pilot

Private config: `C:\Users\admin\Documents\Codex\html-share-platform-private\cloudflare-pilot`. Owner edits `.env.desktop` (Clerk Development keys, selected pilot emails, bucket-scoped R2 S3 credentials); agent manages `.env.generated`, Wrangler configs and receipts outside Git/build context. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is accepted and mapped to this app's server runtime key. `.env.vm` is a future Clerk Production placeholder, not an instruction to cut over VM.

Independent D1/R2 `hsp-pilot-desktop` and public/preview/API Workers are deployed; migrations0001–0003 verified. Node Studio is `http://localhost:3101`, Compose project hsp-cf-desktop, only web/no PG/MinIO/volumes. Inspect without provisioning again:

```powershell
node scripts/cloudflare-pilot-check.mjs --private-dir C:\Users\admin\Documents\Codex\html-share-platform-private\cloudflare-pilot
node scripts/cloudflare-pilot-clerk-probe.mjs --private-dir C:\Users\admin\Documents\Codex\html-share-platform-private\cloudflare-pilot
```

After private edits, explicitly run `node scripts/cloudflare-pilot-configure.mjs --private-dir <directory>` to verify Clerk, set API secret and insert missing allowlist entries without overwriting existing policy. It accepts Desktop Development keys only, never prints identity/secret values and does not create/revoke sessions. Provider mint probe uses existing active sessions; authenticated upload remains a separate gate. Stop if fresh token lacks exact Studio azp; do not weaken validation.

Refresh only this standalone Desktop service, never the lab Compose project:

```powershell
docker compose --env-file C:\Users\admin\Documents\Codex\html-share-platform-private\cloudflare-pilot\.env.generated --env-file C:\Users\admin\Documents\Codex\html-share-platform-private\cloudflare-pilot\.env.desktop -f deploy/compose.cloudflare-pilot.yaml config --quiet
docker compose --env-file C:\Users\admin\Documents\Codex\html-share-platform-private\cloudflare-pilot\.env.generated --env-file C:\Users\admin\Documents\Codex\html-share-platform-private\cloudflare-pilot\.env.desktop -f deploy/compose.cloudflare-pilot.yaml up -d --no-build web
```

Build the standalone service first when no matching image exists. Do not print full Compose config or container env. `cloudflare-pilot.mjs` defaults to read-only inventory; `--provision --private-dir <directory>` explicitly creates/migrates/deploys **only** the owned pilot names and must not be used as a status command. It refuses an unrecorded existing name, another account or changing the Workers namespace. Secret/deployment propagation has bounded health retry; provider check saves current deployed versions privately. Cron and observability remain disabled. OAuth cannot manage R2 tokens: Node needs Object Read & Write scoped only to the pilot bucket, entered privately. Real login/refresh/upload/lifecycle, budget, logging, browser and rollback gates remain open.

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

## Provisioning prerequisites — retained reference

Namespace `odsusercontent.workers.dev` is now verified and independent provisioning was authorized; see the current section above. No subscription change was authorized/performed; budget/limits still need measurement. Full500-file finalize performs up to500R2 HEAD operations. Count native internal-service calls separately from external fetch: [current Workers limits](https://developers.cloudflare.com/workers/platform/limits/#subrequests) list1000internal-service subrequests on Free, so500R2HEAD alone does not establish a Paid requirement. Verify total R2/D1/external calls, CPU, duration and account limits; use bounded verification or a lower quota if required before claiming full500-file support on the chosen plan. Local timings cannot establish edge latency or billing cost.

Create private R2 with public r2.dev/custom-bucket-domain access disabled. Scope Node S3 credentials to the pilot bucket with object access, never account Admin. No presigned GET or storage-prefix route. Native Worker bindings remain broader than GET-only code; read-only IAM gate is not satisfied by this design choice.

Populate D1 through its **separate** `cloudflare/migrations/` sequence, including0002cleanup/system identity and additive0003cleanup_resweeps/schedule/backfill. Never apply these to PostgreSQL and never edit SQL0001–0003 of the lab. Initialize the D1 allowlist with selected synthetic/test identities using parameterized operator tooling; do not copy lab users, ownership or share history. The Worker creates an internal user only after verified Google/Clerk identity and active allowlist match.

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

R1 token provider mints via Clerk BAPI sessions.getToken(sessionId), with default TTL and no template, when the verified seed has20seconds or less left. Before operational pilot, prove actual freshly minted tokens carry the same sub/sid and exact Studio azp. Missing/wrong azp or insufficient remaining lifetime is denied; do not relax authorizedParties or extend JWT TTL to make a provider test pass. Worker active-session/Google/D1 policy checks still run on every RPC. [Fix evidence](validation/2026-10-23-cloudflare-upload-fixes.md).

`GET /internal/health` is service-token-only and returns aggregate D1 readiness, not metadata. All `/v1/*` calls require service token plus independently verified Clerk session; browser never calls these directly. Readiness in pilot does not instantiate pg. The PostgreSQL factory additionally rejects pilot mode, so provider failure cannot silently fall back.

## Upload failure, reconciliation and rollback

Node preflights before multipart ingest, creates an intent, validates ZIP, writes create-only R2 objects, streams readback verification and finalizes with a stable idempotency key. Finalize rechecks policy/site revision in its transaction. Storage/validation failures before finalize attempt use terminal abort before cleanup. Once finalize has been attempted, an uncertain outcome retains objects and looks up the actor-scoped receipt; it never performs speculative deletion.

`reconcileExpired(env)` defaults to **dry-run** and returns counts only. A scheduled API Worker entrypoint can invoke it with `dryRun:false`, but no Cron is configured in templates. Operator must review/approve enabling a schedule. It fences expired open/aborted intents in a guarded batch, checks absence of version/grant references, audits as disabled `system:cleanup` identity, then deletes only that intent prefix. Failure/interruption keeps the due time eligible for retry. cleanup_at records the last sweep; cleanup_after schedules another after5minutes, then daily once intent expiry is>24hours old. The default limit is10/max50intents per invocation, with an indexed due schedule. Aborted tombstones remain eligible indefinitely because Node cancellation is not a provider write fence; measure their resweep/audit/storage cost and backlog before enabling Cron or defining a separate purge policy. Finalized/active/version-referenced/grant-referenced objects are excluded. Never replace this with a blanket R2 lifecycle rule over published prefixes.

**Code/local re-review accepted at headc581ccb, implementation0ad5152:** [review scope and next steps](reviews/2026-10-23-cloudflare-rereview.md). [R1/R2 fixes and regressions](validation/2026-10-23-cloudflare-upload-fixes.md) replace the [old0a3c9d0 findings](reviews/2026-10-23-cloudflare-upload-review.md). Node pipeline after intent creation is bounded to15minutes and intent expiry minus60seconds; PUT/readback each30seconds including the body, each RPC attempt15seconds with max2attempts. Request cancellation is forwarded; readback streams are destroyed on abort. Late provider writes are still possible and are reswept. Keep Cron disabled until provider/cost/schedule approval; preserve unknown-commit objects and committed-version/preview protections. Real Clerk azp/token issuance remains the first provider gate; code review acceptance is not operational pilot approval.

To stop the pilot, disable new Node mutations and public/preview routing after operator approval; keep D1 schema/receipts/tombstones/R2 objects. Roll back only to a tested compatible Worker/D1 version. Never redirect pilot metadata to PostgreSQL or revive old aliases. Existing lab remains independently available. Already-loaded content/in-flight requests cannot be recalled.

## Gates before any production claim

Real namespace/resource/IAM/public-bypass checks; actual Clerk/OAuth/revoke/quota/outage; remote maxquota/load/concurrency/cost; real-domain Safari/iOS/Android/Zalo/crawler; complete access/error/DNS/SNI/analytics/collector redaction of preview paths; abuse/takedown and security review; rollback and limited pilot acceptance. Production uses a dedicated content domain separate from Studio's registrable domain. HTTP sandbox and relative-assets/no-persistence support restrictions are not negotiable compatibility switches.

[Local evidence](validation/2026-10-23-cloudflare-pilot.md) distinguishes emulator/SDK fixtures from provider and owner evidence. [Provider preflight](validation/2026-10-23-cloudflare-desktop.md) records subsequent independent provisioning/deployment and the limited checks actually passed. #10 stays OPEN; ADR-0001/0003/0005 remain Proposed. No production/lab deployment was performed.

## Final project handoff — local Cloudflare login

Owner reported successful `npx wrangler login` on this machine on2026-10-23. Do not record or print its credentials. At project completion/final handoff, remind the owner to run `npx wrangler logout` from the project environment and verify sign-out. Review completion alone is not project completion.
