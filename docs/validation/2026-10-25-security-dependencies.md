# Issue40 — dependency remediation, separate from pilot38

Refs #40 / #10 / #38. Base main `9010dc56957a34f74d8cf7f8b4e35792b26bfcf2`. Preparing this independent remediation while pilot/source Draft48 awaits review; no source from abandoned legacy PR23 is ported. Owner merges; no VM/Docker/Cloudflare/runtime/production action belongs here.

The initial audit reported Next16.4.0 critical and transitive Zod4.6.5 high. The patch pins Next and eslint-config-next to **16.4.3**; the lockfile resolves **Zod4.6.7**, within the existing peer ranges. Zod remains **dev-only** via eslint-config-next→eslint-plugin-react-hooks/zod-validation-error, with no application runtime import. Clerk7.9.13 and geist deduplicate to Next16.4.3. Application exploitability was not established. No abandoned PR23 code, forced audit upgrade, new override or runtime change is included.

Primary references: [Next advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw), [Server Actions advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r), [typed-array advisory](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr), [Zod4.6.6release](https://github.com/colinhacks/zod/releases/tag/v4.6.6) and [maintainer fix](https://github.com/colinhacks/zod/commit/a0ebf970f2d752e5f58527cd2942ff48be4f46bd). Registry metadata confirmed available versions/engines. Vendor notes distinguish unpublished reverted repository commits from the npm release; the checks below verify registry signatures/available attestations, not absence of every possible vulnerability.

## Commands and local results —2026-10-25 Asia/Saigon

Run in the isolated Issue40 worktree, based on main `9010dc56957a34f74d8cf7f8b4e35792b26bfcf2`:

- `npm pkg set dependencies.next=16.4.3 devDependencies.eslint-config-next=16.4.3`; `npm install --package-lock-only`; `npm update zod --package-lock-only`; `npm ci` — PASS. Actual Zod resolution is4.6.7, rather than the initially proposed4.6.6.
- `npm ls next eslint-config-next zod --depth=4` — PASS, versions and deduplication as above.
- `npm audit --json` and `npm audit --omit=dev --json` — both report **0 total findings**, including0 high/critical. This is the registry's point-in-time result, not a release/security acceptance for10.
- `npm audit signatures` — PASS:438 packages with verified registry signatures;119 with verified attestations. Remaining packages were not claimed to have attestations.
- `npm run lint`, `npm run typecheck`, `npm test` — PASS, **162/162** tests.
- `npm run build:public-worker` — PASS, local175478-byte artifact; no provider call/deployment.
- `npm run build` — PASS, Next16.4.3 production build and standalone postbuild completed; the earlier16.4.0 SecurityFatalError did not recur.

`python scripts/check_docs.py`, `python scripts/check_yaml.py` and `git diff --check` also PASS. Implementation head **`e9bd24ffcf2283a6be52e96641bd14734a3b8286`** passed all4CI checks: [application/public-outbox](https://github.com/cfotel2604/html-share-platform/actions/runs/40116467131), [auth-upload-origin](https://github.com/cfotel2604/html-share-platform/actions/runs/40116467253), [validate-docs](https://github.com/cfotel2604/html-share-platform/actions/runs/40116467122). The final documentation head and its own CI results are recorded in DraftPR49; implementation-head results are not substituted for them.

This branch does not contain the unmerged Node/preview changes from Draft48. Before a new Node pilot runtime, owner must merge the dependency patch, then refresh and validate the Draft48 candidate from updated main. The pilot may use that exact CI-validated Draft48 artifact under the existing pilot authority and separate VM-write approval; source48 merge remains an owner decision, not a new prerequisite invented here. Existing VM, credentials, D1/R2 and production were untouched;10 and actual pilot gates remain OPEN.
