# Cloudflare Desktop pilot — provider preflight

2026-10-23; Refs #20/#10. Operations branch `codex/cloudflare-pilot-operations`, stacked on PR #23 head `187f4f5` / application implementation `0ad5152`. This is limited provider evidence, not operational acceptance or production approval. ADR-0001/0003/0005 remain Proposed.

## Authorization and isolation

Owner explicitly authorized independent Cloudflare provisioning/deployment and local Docker/SSH operations to advance the pilot. Source merges, changes to existing lab/unrelated resources, DNS/UFW and production cutover remain separate decisions. Credentials supplied privately never enter Git, Docker build context or this record. The provided Clerk Development instance contains two existing Google users; no Clerk users/sessions were fabricated, revoked or disabled.

Primary checkout remains at local main78cb7ca; fetched origin/main is72e048e. Worktrees, untracked files, env and volumes remain. Read-only SSH inventory verified `lab-b` still runs web `share-dc7560ea1c34` and gateway `security-417c50d`. No VM runtime/source/env/SQL changes were made.

## Provider resources actually created

Namespace `odsusercontent.workers.dev` was verified through the authenticated API; its account-global setting was not changed. Only these independent resources were provisioned:

| Resource | Verified result |
| --- | --- |
| D1 `hsp-pilot-desktop` | New database; remote0001_pilot/0002_cleanup/0003_cleanup_resweeps applied and queried back |
| R2 `hsp-pilot-desktop` | New private bucket; managed r2.dev disabled, no custom bucket domains |
| Public Worker | `https://hsp-pilot.odsusercontent.workers.dev` |
| Preview Worker | `https://hsp-pilot-preview.odsusercontent.workers.dev` |
| API Worker | `https://hsp-pilot-api.odsusercontent.workers.dev`; service + Clerk secrets configured |
| API deployed version | `30c92d9d-dd75-4b95-8328-759c58a9fe1a`, including secret updates |
| Public deployed version | `35d8c10b-c8fd-481e-b29f-b6da0044baaa` |
| Preview deployed version | `101793f3-6ee4-415d-97a3-b9a878749ee2` |
| Routing/logging | workers.dev only for pilot names; preview deployment URLs and observability disabled; no Cron |

These versions are inventory, not tested rollback targets. Account/database IDs and refreshed deployment receipts stay in private `resources.json` / `provider-check.json`. Existing unrelated buckets were inventoried only. No paid subscription/budget change was made; subscription inventory and token administration return403 with current Wrangler OAuth. Native bindings remain code-limited, not read-only IAM.

## Desktop and Clerk

Standalone Compose project `hsp-cf-desktop` runs only Node Studio at `http://localhost:3101`, bound127.0.0.1, image `html-share-studio:cf-pilot-desktop`. No PostgreSQL/MinIO/volumes are part of this project. Image built from reviewed application source plus operations scripts; app/auth/Worker implementations are unchanged here. Docker health/live/ready and Clerk sign-in return200; guest `/api/sites` returns401. Readiness traverses API Worker to D1 without PostgreSQL fallback.

Private configuration directory on this machine:

```text
C:\Users\admin\Documents\Codex\html-share-platform-private\cloudflare-pilot
```

`.env.desktop` is owner-maintained. Setup accepts `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and maps it to this application's runtime `CLERK_PUBLISHABLE_KEY` in `.env.generated`; conflicts fail closed. Desktop keys must be Development (`pk_test_` / `sk_test_`). Backend verification succeeded; two selected users have verified primary Google identity and are enabled. Their selected pilot emails/roles were inserted only into the **new D1** allowlist with bound SQL parameters; existing policy is never overwritten. No identity appears in output or this record.

At the provider probe both users had **zero active sessions**. Browser login, fresh BAPI token azp/lifetime, expired-seed finalize/recovery and revocation remain unproven. Probe does not create a session or relax verification. Provider-mint result is separate from authenticated upload acceptance. If real minted tokens lack exact Studio azp, stop that gate and review implementation; do not remove the check or extend TTL.

Node S3 access/secret remain missing: owner must add `CLOUDFLARE_R2_ACCESS_KEY` and `CLOUDFLARE_R2_SECRET_KEY` to `.env.desktop`. Current OAuth can provision D1/R2/Workers but cannot administer API tokens. Scope **Object Read & Write only to `hsp-pilot-desktop`**, never account Admin. [Official S3 setup](https://developers.cloudflare.com/r2/get-started/s3/). No credential was created via an administrative workaround; do not paste keys in chat.

Future `studio.ods.vn` can keep Node in Docker VM with Clerk Production keys from the same production instance, configured custom domain and owner's Google OAuth credentials. `.env.vm` is a private placeholder; no VM cutover occurred. Production content domain must be outside Studio's registrable domain. [Clerk environment guide](https://clerk.com/docs/guides/development/managing-environments), [production requirements](https://clerk.com/docs/guides/development/deployment/production).

## Checks and limits

- **99unit tests PASS**, including four configuration/retry/redaction tests; lint/typecheck PASS. Docker production image build and Compose config validation PASS. Production dependency audit0; five inherited development-only audit findings remain as previously recorded.
- Remote API service health200; health without credential401. Metadata without credentials401; service credential alone still401. Unknown public code, root asset, legacy32hex alias and unknown preview grant404. Each denial has no-store and no Set-Cookie.
- Secret propagation initially returned a non-ready health result. Subsequent probe200; setup now retries with a bound and no raw provider payload logging. This is not an outage/recovery or rollback drill.
- No real upload/asset lifecycle,500-file quota/load/cost test, remote resweep drill, Safari/mobile/Zalo test or full logging/security matrix passed here. No public content was seeded to bypass Clerk. Cron remains off.

## Continue safely

From the operations worktree, inspect existing resources without provisioning again:

```powershell
node scripts/cloudflare-pilot-check.mjs --private-dir C:\Users\admin\Documents\Codex\html-share-platform-private\cloudflare-pilot
node scripts/cloudflare-pilot-clerk-probe.mjs --private-dir C:\Users\admin\Documents\Codex\html-share-platform-private\cloudflare-pilot
```

After operator edits `.env.desktop`, `cloudflare-pilot-configure.mjs --private-dir <directory>` verifies Clerk, initializes missing allowlist entries and sets API secret without printing values/rewriting owner file. Refresh Node using standalone Compose, both private env files, `config --quiet`, then `up -d --no-build web`. Never dump full Compose config/inspect env. Secret updates create a new Worker version; rerun check for the current private receipt.

Next: owner Google login once + scoped R2 credential, then real token/finalize/receipt recovery before asset lifecycle/race/budget/browser tests. Do not disable existing Clerk users/sessions shared with lab. Source merge remains an owner decision; all PRs were Draft at latest check. #20/#10 stay OPEN. If a gate fails, stop pilot mutations, retain D1/R2 receipts/tombstones/objects and do not fall back to PostgreSQL. Rollback first needs a tested compatible Worker/D1 version, with no destructive volume/bucket cleanup. Remind owner `npx wrangler logout` at final project handoff, not during pilot work.
