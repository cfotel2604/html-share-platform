> **Snapshot bằng chứng theo ngày/head.** Môi trường, số liệu và các câu “Draft/chưa/chờ” trong thân thuộc thời điểm đã ghi; không là trạng thái hay quyền vận hành hiện tại. Xem [status](../PROJECT_STATUS.md) và [bản đồ tài liệu](../DOCUMENTATION_MAP.md). Không chạy lại lệnh lịch sử trên pilot đang dùng.

# Issue37 — architecture disposition and metadata validation

Date: 2026-10-24 (Asia/Saigon). Refs37/31, [Draft PR45](https://github.com/cfotel2604/html-share-platform/pull/45). Docs/metadata only; [itemized proposal](../ADR0006_TRANSITION.md). Fresh base main `85f39e21f2dfda8f50239ecfa172369cc98f5845`, owner-reported merge44 independently verified. Draft opened at `65207aac426d5c5da189aa785ebe5ac53947fded`; final exact head and CI run URLs are recorded in PR45 after the final commit to avoid a self-referential commit hash.

## Repository and evidence boundaries

Checked repository/worktree/status/remotes, fetched `origin --prune`, compared origin/main and live GitHub. Separate managed worktree/branch `docs/37-architecture-disposition`; owner primary main `78cb7ca`, previous worktrees, untracked/private env/uploads and volumes preserved. No reset/clean/owner-checkout writes. Live PR44 merged13:23:09UTC, head60f1f74 all four checks SUCCESS. PR39/41/42/43 also merged;32/35 closed,33/34/36 open for pilot gates.

Read AGENTS, ADR0006/clarification, Agent Guide/planIssue6, workflow/architecture and current handoff, live Issue37, and old PR bodies/files plus committed validation records via Git objects. No owner private receipts/config/auth files read. Scope follows live Issue37 **proposals, no automatic closure**, replacing obsolete execute-closures wording. No application/SQL/CI/dependency/runtime changes. The existing Next advisory is tracked separately by #40; no upgrade was attempted here.

## GitHub metadata checks

Commands: `gh pr view` for7PRs with state/Draft/base/head/checks/body/files; `gh issue view` for5Issues; `gh pr edit <id> --body-file <task-owned-temp-file>` / `gh issue edit <id> --body-file <task-owned-temp-file>` for additive notes, followed by fresh `view` verification. No comments/messages, close/merge/Ready/retarget/title/source-branch changes.

Marked blocks `adr0006-transition-37:start/end` link ADR0006, replacements, Draft45 and per-item owner-decision proposals. For every item, compare full returned body to note+original and compare protected title/state/url/Draft/base/head fields to both fresh-before and original inventory. **12/12 PASS**: original description is an exact suffix; all protected metadata unchanged. Completed13:40:52UTC. All7PRs OPEN/Draft and all5Issues OPEN. The first PR19 verification caught Windows newline translation; reissued with exact UTF-8 bytes, then read back exact original and note before continuing. No source/state changes were involved.

Body SHA-256 receipt (not credentials, bodies not copied here) follows. These are metadata checksums, not source commit hashes. The marked note can be removed reversibly after checking for intervening owner edits; never overwrite a whole description from an old snapshot.

| Item | Original body SHA-256 | Noted body SHA-256 | Verified |
| --- | --- | --- | --- |
| pr19 | `31bb7aa93ff03076521cf1a4f0d4881ba665824b483844efc373686dfc8d7a09` | `1c8b5dfa0354462dac62fcf81fb278a841410a4a62857ff1b6782c1ffbc2d6f8` | exact original + protected fields PASS |
| pr21 | `97f0c14ef6c95075f546148d714182110c0effdc0a963c09935591e17f110a20` | `418843275ad331a73833dff6b8b17c89ba9c3927304d744e38534d142fa2c163` | exact original + protected fields PASS |
| pr22 | `da799d6b406183539c6347ea109c2606486d0e604926d61b41c07bd34ab92697` | `41234b6f3f492eeb3bb14b9eafaa1a440466967330ff89aaf81c62e98865ae2d` | exact original + protected fields PASS |
| pr23 | `272b38cf275ba981e43c594fb34c4c7bed3628480251d4287dce4b339c9c0fd1` | `9c8bfcbe66619d003a34c7755558c9f2c9183bfba355221974d81a98415ac7e7` | exact original + protected fields PASS |
| pr24 | `15f71fbf4de9f27fccf156d3f69fd18d08e07f3bb18b6dab71eacb68d3c864e6` | `621702c078586d96fe83a7bb87033d42c8076ce3378e7e75180d4705a9958f07` | exact original + protected fields PASS |
| pr27 | `181600da0d9853abed0b5ed296f880e9ede92ca8ee8ef90a6b25bd55b8f7ba7a` | `659ed4ff0391fc387821ca4699e7e772b08c0b1e1494fe2f83b182a484872fb0` | exact original + protected fields PASS |
| pr29 | `958e7c6993a3b7940fa482066728df58ae17cd71caea3abfe625acce23479dee` | `5b764c96c0db9e3406a07b40d380f87fb62475eb9a74e9f66798cd3c14831d62` | exact original + protected fields PASS |
| issue10 | `6dcf96e94acd0f19cabe3fb02267e17d18630885eb5600d5a00cbbf8ba50403a` | `f3baaf531b9a2f3ed3a1c2183c42f7a0117f9fbb385588e10fbefe9ca9edeee5` | exact original + protected fields PASS |
| issue20 | `4b4faad4bc86eb64a36e82bb89f9100c84933068d5489f2b92a3496f0a44a1b4` | `07f922c2710fc632b2e24f912244bb0a1554c70e1d979fab2d16c6924d4b6bea` | exact original + protected fields PASS |
| issue25 | `50c0bac1706abdffafc318236749e21560d70315cd79120b2665034b2cee9fa0` | `1d874f3bdb5c22ddd4980edcfdf6b364cb9e93682d9cc6f67eeb12feeefe0601` | exact original + protected fields PASS |
| issue26 | `2c399c72894a8014b87710fa062acb0528a9c28f5a1df1909412308707265b1f` | `c37b147b1be5838f647c8a4e0caa8a2d8d13e84b5259dc1077f75443ced003dd` | exact original + protected fields PASS |
| issue28 | `d0ac2d21f7ae88478128a633ba90ab3e1b459dd3b87f49574bd64ac28cea6ac2` | `66ab8767faee3770482c6449a1dafc23b3adc4a6ceaa7654f97e17fc119bee00` | exact original + protected fields PASS |

## Read-only Cloudflare metadata

Pinned Wrangler4.152.0 through `npm exec --yes --package=wrangler@4.152.0 -- wrangler ...`, `CI=1`, metrics disabled, task-owned log location. `deployments list --name <worker> --json`, then `versions view <active-version> --name <worker> --json` for `hsp-pilot`, `hsp-pilot-preview`, `hsp-pilot-api`: **six successful metadata calls**. No token extraction command, no SQL/D1 rows, R2 object read, public-content fetch, tail/log retrieval, provision, deploy or secret-value endpoint. Version/resource/account IDs, emails/authorship and plaintext variable values are filtered in memory and absent from this receipt/PR. Do not paste raw metadata output.

| Worker | Latest deployment UTC (2026-10-23) | Active version / safe binding inventory |
| --- | --- | --- |
| hsp-pilot |12:25:40.129656|one at100%; DB(d1), ASSETS(r2_bucket), API_ORIGIN/PREVIEW_ORIGIN/PUBLIC_ORIGIN/STUDIO_ORIGIN(plain_text names only); zero secret_text listed|
| hsp-pilot-preview |12:25:52.887474|one at100%; same DB/ASSETS/origin names; zero secret_text listed|
| hsp-pilot-api |14:31:35.861692|one at100%; same DB/ASSETS/origin names + CLERK_SECRET_KEY/HSP_SERVICE_TOKEN(secret_text names only)|

All3ASSETS bucket names matched `hsp-pilot-desktop`. This proves old deployed topology/binding metadata still exists. It does not prove public availability, source/hash equivalence, Worker behavior, secret scope/rotation, database/account-ID match, R2 privacy/r2.dev, data/replication or Desktop/VM runtime state. No A' deploy/legacy retirement claimed. Historical provider/lab evidence remains linked in transition table with dates/environment/limitations.

## Documentation checks and limits

Local checks PASS: `python -B scripts/check_docs.py` (12 required files/8 entry docs); `python -B scripts/check_yaml.py` (6 YAML files); local Markdown-link check covering all tracked Markdown plus the new documents (46 documents/281 local links/zero errors); exact SHA inclusion for all7old PRs and all12 preserved-body/protected-field receipts; `git diff --check`. The checks are rerun after the final commit; final exact head/results and CI URLs are recorded in PR45. No new implementation tests were added for prose/metadata. GitHub's existing CI may run application/integration checks; record only checks actually reported for the final head, not old branch CI.

Outstanding: owner review/Draft45 merge and per-item legacy dispositions; prepare38 only after owner-reported merge. Actual projector/rebuild, D1 data inventory including legacy, Worker deploy, old writer freeze/retirement, Node/VM secret/runtime install, real500file/p50/p95/revoke/429/crash/drift/object-mismatch/VM-off/logging/mobile/cookie/rollback checks all remain gated.60seconds is still proposed, not accepted SLO. Token policy is resolved but real rotation/revoke drill unrun. #10 release/security and #40 dependency work remain separate. No pilot D1 write/reapply0004/VM/localDocker/owner private files or production action occurred.
