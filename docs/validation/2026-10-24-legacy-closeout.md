# Issue37 — owner-authorized legacy disposition closeout

Refs #37 / Epic31. Base main `9010dc56957a34f74d8cf7f8b4e35792b26bfcf2` after PR46 merged. Owner's consolidated A' instruction supersedes the earlier proposal-only disposition: close PR21/22/23/24/27/29 and Issues20/25/26/28 as superseded/abandoned. Keep Issue10 and its auditPR19; no automatic merge/production release.

Reason: Node/PostgreSQL administration (PR41), transactional outbox/projector (PR42), recovery (PR43) and public-only serving (PR44) already replaced D1-primary/API/preview/token-bridge architecture. No compatibility, legacy data import or old code port is retained. Closing GitHub items does not delete refs, change source branches or itself retire resources; pilot resource cutover is tracked separately in Issue38.

## Executed disposition and readback

All10items are CLOSED, not merged: six PRs and four Issues. Issues closed with state_reason `not_planned`. The request was one owner disposition, executed without per-item questions. Descriptions received a marked final owner-decision note with a short source-based reason; all original text remains an exact suffix. Fresh readback verified state, body and unchanged number/title/url; PR head/base/Draft/mergedAt remain unchanged (`mergedAt=null`), no source branch/ref deleted or rewritten. Issue10 and auditPR19 were read before/after and remain OPEN with identical metadata/body.

| Item | Preserved head (PR) / state | Original body SHA256 | Closed body SHA256 |
| --- | --- | --- | --- |
| pr21 | `77ae10a3fdafe2a0f5b5818ad1ea5e826b886606` / CLOSED | `418843275ad331a73833dff6b8b17c89ba9c3927304d744e38534d142fa2c163` | `4c7223bb4e9ffbfe49f100d271d45d65742effbcc8a812c44f7a81b771b001d1` |
| pr22 | `3b74981698d9d3090fa11e430d4ba912ebbf8bc1` / CLOSED | `41234b6f3f492eeb3bb14b9eafaa1a440466967330ff89aaf81c62e98865ae2d` | `8058362b85acc74d559d37c0a1147f087f47d2237a72c1b15ace86d85aa9a9dd` |
| pr23 | `187f4f5cf5b7dd7c74a77f89125d5b63fc09141c` / CLOSED | `9c8bfcbe66619d003a34c7755558c9f2c9183bfba355221974d81a98415ac7e7` | `34cda5fcc6bbbcb4f11a43fa22556d94ebfd878bb8215401fe735a257ede962d` |
| pr24 | `bb0327d267e38a6149bf90b6b286293f2e02e934` / CLOSED | `621702c078586d96fe83a7bb87033d42c8076ce3378e7e75180d4705a9958f07` | `96f9a07c10beedaa36a53deb30128a970e446ee3f6c425c16d8c5c736c9c0842` |
| pr27 | `62e80906d0f59a8a7dd69ccd976b06192e665db4` / CLOSED | `659ed4ff0391fc387821ca4699e7e772b08c0b1e1494fe2f83b182a484872fb0` | `7fca4a018641e650733f5af45458cbbeb4e9d52807b0e7ab714254ce9cade977` |
| pr29 | `618226222e50a7e25cc1c3da93455a1ce5c7dece` / CLOSED | `5b764c96c0db9e3406a07b40d380f87fb62475eb9a74e9f66798cd3c14831d62` | `a2a1cd666f13cc21555c65ed688dd862858e6947ba61ba295951b610dc450d2e` |
| issue20 | CLOSED | `07f922c2710fc632b2e24f912244bb0a1554c70e1d979fab2d16c6924d4b6bea` | `35359d19601de3cecbbed2208ac930078747fac5f90d1ec92802fcc559f94dc6` |
| issue25 | CLOSED | `1d874f3bdb5c22ddd4980edcfdf6b364cb9e93682d9cc6f67eeb12feeefe0601` | `00c4f2a8bea228f98c8f1880473e76a628c8e38f8bcf0e667131e5712b833020` |
| issue26 | CLOSED | `c37b147b1be5838f647c8a4e0caa8a2d8d13e84b5259dc1077f75443ced003dd` | `3df1091fa4f62c1346cdd70959687bf265f065e73f640342f0708a614ea4a11e` |
| issue28 | CLOSED | `66ab8767faee3770482c6449a1dafc23b3adc4a6ceaa7654f97e17fc119bee00` | `7332ea14539c57aab569d7ca31ea24b38b7865eb9b0a392552de39e37373e68f` |

Commands: live `gh pr/issue view`; structured `gh api --method PATCH repos/.../pulls/<n> --input <task-json>` (state/body), or issues endpoint (state/body/state_reason); immediate fresh `view` assertions. No comments/messages or secret/user-content output. Full pre-edit descriptions and JSON requests stay in ignored task tmp; only fingerprints and safe metadata are checked in. Receipts verified2026-10-24; exact final source head/CI in DraftPR47. No runtime/resources/data were deleted by this disposition, no VM/Docker/production or private owner files accessed.

Validation: `python -B scripts/check_docs.py`, `python -B scripts/check_yaml.py`, all-tracked Markdown links and `git diff --check`; exact final results in PR47. Docs-only change; do not infer pilot gates from CI. Rollback, only if owner changes the disposition: reopen the specific item and remove only the final marked block after checking intervening edits; never restore whole old descriptions or resurrect legacy code/runtime automatically.

PR47 stays Draft for owner merge. Issue38 remote execution continues independently in DraftPR48 under the new consolidated pilot authority; no need to wait for this documentation merge. #10 remains a separate security/release decision, production and VM/private-file gates unchanged.
