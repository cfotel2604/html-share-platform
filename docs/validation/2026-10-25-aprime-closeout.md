# A-prime issue cleanup and pilot decision record — 2026-10-25

Refs #37 / #38. Base main `71c57b9dcd5710b87a9d49526aa251787cf81390`, after owner merged PR58. Documentation-only closeout; no application, applied SQL, deployment, credential, data or runtime change.

## Direct owner decisions in this chat

Owner confirms the mobile / Employee / Safari / Zalo matrix is OK. Record this as owner-confirmed PASS, not agent-observed device traces or an exhaustive version/session inventory. Existing independent desktop, Node authorization and origin evidence retains its own scope.

Owner permits omitting the remaining elaborate live fault drills after collecting convenient available evidence. We will retain measured/injected/local distinctions and list unrun live D1 drift, Worker corrupt-pin, provider-generated prolonged429 and emergency active-token fault as owner-waived for this pilot, not tested PASS. No deliberate pilot corruption, quota exhaustion or token revocation is needed. This narrows pilot evidence scope without changing code, ADR-0006 invariants, healthy revoke p95≤60s or the >60s pending warning. No outage-time60s guarantee is added.

Owner asks to clear obsolete/completed Issues50/40/33/34/36/37 before #38 acceptance; #10 remains separate. This does not yet sign off #38 or approve production. Oldviewer4100 is retained until the owner's later cleanup.

## Issue and PR disposition

| Item | Decision and evidence |
| --- | --- |
| #50 | CLOSED / completed, merged PR#51; [closure receipt](https://github.com/cfotel2604/html-share-platform/issues/50#issuecomment-6397545985) |
| #40 | CLOSED / completed, merged PR#49; [closure receipt](https://github.com/cfotel2604/html-share-platform/issues/40#issuecomment-6397546798) |
| #33 | CLOSED / completed, merged PR#42; [closure receipt](https://github.com/cfotel2604/html-share-platform/issues/33#issuecomment-6397547722) |
| #34 | CLOSED / completed, merged PR#43; [closure receipt](https://github.com/cfotel2604/html-share-platform/issues/34#issuecomment-6397548599) |
| #36 | CLOSED / completed, merged PR#44; [closure receipt](https://github.com/cfotel2604/html-share-platform/issues/36#issuecomment-6397549482) |
| #52 / #54 | Already CLOSED / completed after merged53/55 and bounded pilot readbacks; upload throughput and Node preview remain in use |
| #37 / Draft59 | Final documentation cleanup in this PR; closes on owner merge, not an agent merge |
| Draft47 | CLOSED without merge as superseded by59; exact historical closure receipt preserved from87566b2 [here](2026-10-24-legacy-closeout.md). No branch/ref/worktree deletion |
| #38 / Epic31 | Stay OPEN pending owner pilot acceptance after this cleanup |
| #10 / auditPR19 | Stay OPEN and separate; no body, state, release decision or production change |

Issues50/40/33/34/36 were completed in A', not abandoned. Only the old D1-primary/API/preview/token-bridge stack is obsolete. Fresh GitHub reads confirm PR21/22/23/24/27/29 remain CLOSED unmerged, Issues20/25/26/28 CLOSED not_planned. Main contains all source commits; exact heads/check counts are in the adjacent JSON. PR45 had3CI checks; the five implementation PRs each had4.

## Proportionate fault evidence

| Case | Existing actual / fresh local evidence | Remaining live drill |
| --- | --- | --- |
| D1 drift / recovery | Fresh local empty-target rebuild, intentional valid drift repair and conflict/source guards pass; independent runbook reader previously12/12PASS. Real pilot audited populated21-row rebuild and final reconcile0diff recorded | No deliberate pilot drift or emptying; omitted by owner, not PASS |
| R2 pin corruption | Fresh actual-workerd local tests deny missing/size/ETag corruption before content. Real R2reader correctGET/SHA200, missing404, wrongIfMatch412 recorded | No alteration of a deployed manifest/object; omitted by owner, not PASS |
| Prolonged429 | Actual pilot transport-injected429 retained full300s cooldown across restart, then503/lostACK/replay; actual final COMMIT→projected314865.149ms disclosed separately. Local Retry-After600s/shared cooldown passes with fixture clock control | No quota exhaustion or provider-generated repeated429; omitted by owner, not PASS |
| Emergency token fault | Fresh local revoked-token403 retains queue/cooldown and redacts errors. Real approved normal replacement rotation completed25/10 with before/after drain and operator old-token revocation | No new live active-token emergency revocation; omitted by owner, not PASS |

The five focused local files passed41/41,0failed in10.417s. This is fresh local evidence, not new remote failure injection. Existing fault receipts remain [here](2026-10-25-projector-faults.md); normal rotation [here](2026-10-25-projector-token-rotation.json). Token scope/storage/90-day and incident rotation policy is unchanged; next regular rotation2027-01-23. No token value/fingerprint, raw grant/code, identity or uploaded content is in this report.

## Runtime, measurements and limits

Read-only recheck: source2734de5/image2fd14ccc unchanged; db/web/preview healthy, projector running.3sites/5versions/PGledger4 with canonical checksums; pending/errors/overdue0. Web and preview have no D1credentials; projector current credential still matches approved D1target/disabledreplication and has no Clerk/R2writer env. Oldlab images/states and nginx fingerprint unchanged. No runtime change, migration, Worker deploy, D1write, token action or R2deletion in this packet.

Published healthy20sample/500manifest CSV remains unchanged: COMMIT→public404 p50=4928ms/p95=5298ms; COMMIT→projected p50=4195.561ms/p95=4691.001ms. The107.961s and314.865s outages remain separate. No60s blocking guarantee during projector/REST failure: public can retain old state until projection recovers; Studio pending warning/owner containment runbook remain relevant. Studio-only warnings have no closed-tab/VM-outage notification promise.

Actual service-off proof stopped only new web/preview/projector/PG and public assets remained200/integrity-correct, then same services recovered. No whole-host shutdown or newly captured paired-side production traffic trace is claimed. Worker has no callback path by code/static/negative-network and actual-workerd tests. Legacy viewer/test4100 stays owner-retained; no exhaustive old-link retest or deletion is implied.

Both fresh `npm audit --json` and `npm audit --omit=dev --json` exit0/report0findings; this is a point-in-time audit, not a release guarantee. Owner-confirmed500file HTTPpublish/copy/view and GUIrevoke are retained;11.862s is a Node/operator upload sample, not a fresh12-transfer GUIlatency trace. Owner confirms mobile/Employee/Safari/Zalo OK without supplying device versions/traces; record owner-confirmed coverage rather than inventing an agent/device matrix.

## Commands, review and next decision

Commands: repository status/worktrees/remotes/fetch/log and GitHub item/head/check views; focused41test command and both audits listed in JSON; read-only VM metadata/PGledger/credential-presence/Cloudflare metadataGET checks; docs/YAML/link/diff checks. No new timing benchmark or destructive fault drill was run. Documentation base is71c57b9; application/SQL/config/package files stay byte-identical to that main. Final Draft59 head and its own CI are recorded in the PR.

Owner reviews/merges59 to finish37, then explicitly accepts/rejects pilot38. Matrix confirmation and permission to omit extra drills are not that final sign-off; leave38/31 open.10/audit19 and production remain separate. Historical receipts keep their original limitations; current policy above supersedes old pending-matrix/mandatory-extra-live-drill wording for this pilot only. Rollback is documentation/metadata review, never resurrection of the obsolete runtime or data reset.
