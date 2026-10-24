# Issue #36 — public serving core, 2026-10-24

Refs #36 / [Draft PR #44](https://github.com/cfotel2604/html-share-platform/pull/44). Base main `f6c78340983060687b969d7aae0e2f7e80ebd381` after owner reported PR43 merged; live GitHub merge verified2026-10-24T11:42:38Z. Source core `336dc748795a5a2b187e124d098c3323c61e4d2f`. [Scope and binding decision](../PUBLIC_READ_MODEL_WORKER.md).

## Executed independent work

- `npm ci`: PASS, existing package versions unchanged. `npm run lint`, `npm run typecheck`, `npm test`: PASS,153tests/0fail (142existing +11serving core/policy). Local Node unit readers are synthetic; no D1 provider call or credentials are used.
- `npm run build`: first attempt compiled but stopped on inherited Next16.4.0 security nudge; retry PASS including standalone postbuild. Existing #40 tracks the dependency risk; no upgrade performed.
- `python scripts/check_docs.py`, `python scripts/check_yaml.py`, `git diff --check`: PASS. `git diff origin/main -- db/migrations cloudflare/read-model package-lock.json` empty; applied migrations and resolve/project SQL unchanged.
-11new cases cover registrable-origin/private-suffix rejection, raw/decoded hostile paths, closed manifest/prefix/ETag/size/format checks, nested/direct HTML sandbox, canonical redirect after lookup, missing/filtered reader result, route/method rejection, no R2 outside manifest, HEAD metadata/no body, ignored caller cache/range headers, R2 metadata failures, static sanitized failures and no outbound fetch/logs in the core.

The current core accepts a reader interface; there is **no production Worker entrypoint/native binding/config** yet. Primary D1 lookup, real D1 status/replay behavior through serving, Miniflare D1/R2 end-to-end and deployed VM-offline/log evidence are not proven by mock readers. Next build validates the existing app; it does not bundle a Worker. Do not mark Issue36 serving/deployment acceptance complete from these unit results.

CI links/results at exact heads are recorded in PR44; no real D1 read/write/projector/rebuild, Worker deploy/provision, VM/local Docker, owner private-file/worktree change or token creation/retrieval occurred. No merge, automatic Ready, scheduled merge following or #37 work performed.

## Required owner clarification

The plan/Agent Guide says Worker has no write bindings; native R2/D1 binding APIs expose write capability. [R2 reference](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) documents get/head and put/delete on the same bucket object; [D1 reference](https://developers.cloudflare.com/d1/worker-api/d1-database/) documents SQL/exec on the database binding. PR21 ADR0005 had already warned that application read-only is not IAM read-only. Serving ideas were reviewed from PR22 `origin/codex/cloudflare-path-core`; its management-table/preview/auth imports are not reused.

Owner question is pending: accept fixed-SELECT/get/head-only application code with tests and an explicit native-capability limitation, or require provider-enforced read-only IAM and stop for a new design? Native adapter/config and dependent tests are paused until that decision; no exception to ADR0006 is inferred. Remote deployment and actual binding inventory remain separately gated in either case.60second revoke target remains a proposal; token policy from #33/#34 is unchanged.
