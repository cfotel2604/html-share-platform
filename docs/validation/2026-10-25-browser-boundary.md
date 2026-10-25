# A-prime browser boundary and read-only R2 packet —2026-10-25

Refs #38. Owner reported56merged; GitHub confirms merge `e50cbebe220f48d1860b2c511b8dd2954991c6dc`, headac646f7/3CI. Main application/config still matches deployed2a396ae/image d927742b. Token scope is owner-confirmed; no repeated account/scope question.

## Bounded work

Use the checked-in synthetic [HTML probe](../../tests/fixtures/pilot-origin-probe.html), first on a credential-free loopback server with the existing gateway sandbox headers, then upload one new, separately named pilot fixture through the owner's authenticated Studio. Do not overwrite the existing500file fixtures or oldviewer. Test actual public direct navigation and Node private preview iframe/direct navigation. Read only rendered diagnostic results, never cookie/storage values, tokens or raw capability URLs. The probe has short-lived synthetic markers, no external data transmission and no auth/API access; unexpected boundary allowance stops the test rather than weakening headers.

Report cookie getter/host/parent-domain setter, local/session storage, popup, worker and iframe parent-DOM outcomes. Popups/workers may be denied by additional browser policies; do not attribute every denial solely to sandbox. HTTPS/HTTPheader/iframeflag evidence is separate. One desktop engine does not close Safari/mobile/Zalo or release10.

Use the existing Node preview R2reader for a missing-key GET and deliberately incorrect If-Match GET on the new fixture, plus correct readback. No object deletion/overwrite, manifest corruption, token lifecycle or Worker change. Provider404/412proves those R2responses, not a full live Worker corruption drill. Existing Worker contract/local negative tests remain separate.

## Local-first results

The HTML probe passed direct navigation and same-origin trusted-shell iframe under the actual gateway HTTPsandbox on an empty loopback server: cookies/storage denied with SecurityError; popup/worker blocked; iframe parent-DOM access denied. No PG/R2/Clerk/Cloudflare or .env used. Structured local and pilot results will be added after actual readbacks.

## Remaining operator token drill — prepared, not executed

The settled policy remains90day/incident rotation. A one-off early rotation for acceptance needs a timing approval; this is not another scope/account decision. Operator creates a replacement token with the same approved name/scope/account and updates only D1_PROJECTOR_API_TOKEN directly in `/opt/hsp-aprime/secrets/node.env` (root0600, parent0700); no value/export in chat/log/Git. Do not read/print the file, Docker environment or expanded Compose config.

After operator reports completion, agent rechecks active deployment/source/image, target/disabledreplication, queue, nonsecret role booleans and quiet config. Recreate only the new projector with the existing pinned source/image and `up --detach --no-deps projector` so it receives the new startup environment; do not use Compose start with dependencies, rerun migrations or change web/preview/PG. Run a bounded synthetic publish/revoke via the existing Node operations and observe ordinary outbox drain/public404. Only then operator revokes the old token on Dashboard and records date/token name/result without value. Existing public Worker does not consume this token.

If validation fails, retain outbox/source/tombstones and stop only projector if necessary. Operator may restore the previous secret while old token is still valid; do not revoke it before successful drain. If already revoked, fail closed and follow the agreed replacement process. No production/wholeVM/DNS/UFW/oldviewer action or ownerpilot/#10acceptance follows.

## Actual browser and provider results

Prepared head7296e6c passed4/4CI before the recorded follow-up work: [application/public-outbox](https://github.com/cfotel2604/html-share-platform/actions/runs/40173580770), [auth-upload-origin](https://github.com/cfotel2604/html-share-platform/actions/runs/40173580735), [docs](https://github.com/cfotel2604/html-share-platform/actions/runs/40173580747). The runtime image remained2a396ae/d927742b during these browser observations.

Created exactly one separate fixture through the real authenticated AdminStudio: “A-prime browser boundary2026-10-25”,1HTMLfile/3366bytes. Canonical Git and uploaded bytes both SHA256 `0a726ce1f1d93a0d7160ff23a10844c52a2814308a3ef9239f9ca4acead65b9e`. No existing site/version was overwritten. The fixture itself contains no external data transmission or auth access, and no actual cookie/storage values or URL were read into evidence.

| Browser context | Cookie read/host write/parent-domain write | local/session storage | Popup/worker | Parent DOM |
| --- | --- | --- | --- | --- |
| Empty local direct |SecurityError |SecurityError |blocked |not applicable |
| Empty local iframe |SecurityError |SecurityError |blocked |SecurityError |
| Actual HTTPSpublic Worker direct |SecurityError |SecurityError |blocked |not applicable |
| Actual HTTPSNode preview in Studioiframe |SecurityError |SecurityError |blocked |SecurityError |
| Actual HTTPSNode preview direct |SecurityError |SecurityError |blocked |not applicable |

All5contexts completed their visible probe with PASS. Preview on the actual cfvn.cloud domain denied the Domain=cfvn.cloud setter with SecurityError. The real iframe had sandbox=allow-scripts, no allow-same-origin, referrerpolicy=no-referrer and the exact p-namespace. Public/preview TLS validation was normal; no certificate bypass. Popup/worker outcomes are bounded observations, not exclusive attribution to sandbox when additional browser policy may apply. No mobile/Safari/Zalo/production or full#10PASS follows.

Authenticated UIcreate and unpublish succeeded. Opening the revoke confirmation later timed out in CDP; do not count that GUIrevoke as PASS. Read-only PGguard showed the code was still active, so the trusted Nodeoperator called the existing audited revoke function exactly once. Owner closed the browser confirmation. Studio then showed “Cần đăng nhập”; cause was not diagnosed and no cookie/session/credential was extracted or authentication automated. Actual public404and PGprojectedrevoked state were independently checked. The two temporary tabs were closed, retaining the owner's Studio tab.

Existing Node R2reader GETverified the new immutable object against3366bytes/SHA. Missing random key under that fixture prefix returned404; deliberately wrong If-Match returned412. Exactly3GetObject calls, no R2write/delete or manifest mutation in that provider probe. These responses do not claim that the deployed Worker was tested against a deliberately corrupted pinned object. Guest and spoofed-admin-header GET/api/sites both returned401 at Node.

Final fixture events52published,57unpublished,61revoked allprojected/attempt1/last_errorNULL. Finalpublic404. Owner's separate500file published site and its HTML/CSS/JS remained200with matching size/SHA and no-store. New logical totals3sites/5versions/PGledger4, outboxpending/errors0,1publishedsite. New fixture/immutable asset retained,0R2objects deleted. [Safe structured browser/R2/readback receipt](2026-10-25-browser-boundary.json).

## Approved token rotation — completed

Owner explicitly approved one early90day-policy drill, then created and loaded **hsp-projector-pilot-1** directly in Node's secret store while old **hsp-projector-pilot** remained valid. The operator-supplied replacement name supersedes the same-name preparation text above; scope/account were already settled and not asked again. Agent validated protected file permissions, quiet config, exact source/image/target/disabledreplication and both old-running/new-handoff credential reads without outputting a value or fingerprint.

Recreated only the new projector using --no-deps/--force-recreate at the unchanged pinned source2a396ae/image d927742b. DB/web/preview/migrate IDs and migration FinishedAt were preserved. New projector had D1only credentials, no Clerk/R2. A500manifest Nodeoperator cycle produced events54/55/56: publish→public200, revoke→404, all firstattempt/drained. The original500fixture was restored unpublished and other site fingerprints were unchanged.

Only after that PASS, operator confirmed revoking old hsp-projector-pilot and retaining hsp-projector-pilot-1. Creation/secret handoff/old revocation are operator-confirmed evidence; no old token was retrieved to probe its rejection. Agent independently verified current credential/target after old revocation and another500manifest cycle58/59/60projected at firstattempt, public200then404, pending/errors0. No new healthy SLOsample was added or pooled. [Separate sanitized rotation receipt](2026-10-25-projector-token-rotation.json).

Rotation date2026-10-25, next regular90day due2027-01-23, or earlier on the agreed incident triggers. No reminder/automation installed. Normal replacement rotation is complete; an emergency active-token revoke with a queued outbox remains a separate unrun fault scenario. No token value/policy export/Dockerenvironment dump entered Git/log/response/chat.

## Minimal Studio copy correction and runtime gate

Found3legacy explanations saying direct content remains accessible after revoke. A' public code routes become404after projection. Corrected only the explanatory paragraph and rotate/revoke confirmation strings in site-list.tsx: old links are blocked after public synchronization; already loaded tab bytes may remain visible. No handler, authorization, outbox, Worker, grant or sandbox change. This chooses A' semantics over legacy wording as the consolidated owner instruction requires.

Local validation after the copy correction: lint/typecheck,176/176tests, productionbuild, docs/YAML/diff PASS. Those revised strings were not yet live during the browser tests above. Complete local/exact-headCI, then use the already authorized bounded Node rollout to pin a new image and update only web/preview/projector, preserving PG/migrate/oldservices/secrets/data. Record the deployed artifact separately from the final documentation head; no applied migration, Worker/DNS/UFW/tunnel change or R2deletion. Runtime readback after that copy rollout will be appended here.

## Commands and remaining gates

Actual commands/tools: repository/worktree/remote/fetch and live GitHub merge/check reads; credential-free Node local server plus browser DOM/results; authenticated Studio filechooser/upload/unpublish; task-private read-onlyR2probe, supervised projector rotation and post-revoke cycle, guarded Nodecleanup/finalreadbacks; local lint/typecheck/unit/build/docs/YAML/diff as recorded; exact-headCI inPR57. Protected operator/rotation receipts remain under /opt/hsp-aprime/runtime; values were never collected. One-shot scripts must not be blindly replayed against completed events or overwrite the rotation receipt.

Remaining: real mobile/Safari/Zalo and Employee/session matrix, uncovered live D1drift/Worker-pinned-R2corruption/provider-generated prolonged429/emergency-auth-fault cases, owner-deferred legacy viewer retirement, ownerpilotacceptance/#10. Keep PRDraft; no owner signoff/production inference. Normal token scope and replacement rotation are no longer pending.


## Copy rollout — actual current artifact

Source **55b99d153818b5db0bf30c55c2ec997ae90e5871** passed all4checks before mutation: [application/public-outbox](https://github.com/cfotel2604/html-share-platform/actions/runs/40176049850), [auth-upload-origin](https://github.com/cfotel2604/html-share-platform/actions/runs/40176049831), [docs](https://github.com/cfotel2604/html-share-platform/actions/runs/40176049823). Canonical224filearchive SHA256 **1a8a3dda49909581fc0dc3204b765b6040ddb73c62e7d053632d32a36c254a94** matched every Gitblob; appliedSQLhashes unchanged. Built/pinned image **sha256:c3549538754f7c51f07098f4c71198623a81672b3b850c4af8a44404a498c6a2**, nonrootuid1000/30runtimefiles/actual projector-library imports PASS.

Rechecked current secret-store target/disabledreplication immediately before update. Only new web/preview/projector updated with --no-deps; original PG/migratecontainerIDs, ledger,3sites/5versions and every oldhsp-labimage/state remained. No migration, newtoken/rotation step, Worker/DNS/UFW/tunnel change or R2deletion during this copy rollout. Active deployment pointer now names55b99d1and its source/config/image paths; never reuse historical2a/73pins blindly.

After rollout, PG/web/previewhealthy, projector running, migrateexited0; pending/errors/overdue0,3sites/5versions/PGledger4/1publishedsite. Owner500fileHTML/CSS/JS still200with matching size/SHA/no-store; newfixture404/unpublished/revoked and events52/57/61remainprojectedfirstattempt. The post-rollout cleanup/readback was forced read-only and made no second revoke. Current preview-image R2reader again returned correctSHA200/missing404/wrongIfMatch412without writes/deletes. Current projector credential still passes target/replication metadata after oldtokenrevocation and image replacement. No temporary Docker runners remain, temporary browser tabs closed and local loopback listener stopped.

Read the deployed client chunks without executing them: all3corrected share-guidance strings are present, legacy direct-URL claim absent. This proves the shipped artifact content; an authenticated browser render of the newcopy is not claimed because Studio currently requires sign-in after the earlier dialog closure. No session/credential extraction or automatic authentication. Browser security observations above were made on2a396ae; serving/auth/metadata/Worker/backendcode did not change in55, only3UIstrings plus the fixture/evidence.

Actual final commands additionally include `python tmp/rollout_browser_candidate.py`, post-rollout read-only PG/R2/ownerasset/role checks and compiled-copy verification. Final PRdocumentation head may advance beyond deployed55b99d1; its exact CI is recorded in PR57. Both artifact and finalhead stay explicit. The existing policy/token names/rotation dates and unmet matrix remain as stated above; no automatic merge/production/#10acceptance.
