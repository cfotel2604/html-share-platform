# R1/R2 accepted for code/local regressions — 2026-10-23

Refs #20/#10, Draft PR #23 stacked on #22/#21. Reviewed head **c581ccb511fb9aaeb8f90308d865450cbb20d12d**, implementation **0ad5152a82b594708d50f3eabbb729c83791f190**. [Fix evidence](../validation/2026-10-23-cloudflare-upload-fixes.md), [runbook](../CLOUDFLARE_PILOT_RUNBOOK.md).

## Review received and verification

Owner supplied `hsp-rereview-c581ccb.zip`, SHA-256 `c67f6f4493d8760fd0a61430f244395421ac834e0d60a8b7734dc92ccf3bfb5a`. It contains RE-REVIEW.md and two execution logs. The reviewer accepts R1/R2 at the code/local-regression level, with no new P1/P2 in the reviewed upload-lifecycle delta. This is supplied independent-review evidence, not a GitHub approval, whole-stack security certification or permission to merge/provision/deploy.

The reviewer reports 37 selected tests/groups PASS: 31 Cloudflare groups plus3token/transport groups, then3facade/RPC groups. Their full95unit suite, lint/typecheck/build/browser/audit and CI were not independently rerun. Their source was assembled from the prior baseline and exact implementation patches. Real Clerk token issuance and object transport remain synthetic. Do not label this as independent verification of every earlier check or real-provider acceptance.

This session independently fetched origin and verified GitHub: main72e048e; #21 at77ae10a with2checks PASS, #22 at3b74981 with4checks PASS, #23 atc581ccb with4checks PASS, all OPEN/Draft. #19 audit remains independent; #20/#10 OPEN. No tests were rerun merely to receive the re-review; the prior agent's95unit/31integration/build evidence remains in the fix report. The new handoff commit changes documentation only; compare exact code trees before relying on this review for any later implementation change.

## Next steps and responsibilities

| Order | Agent work | Owner input/decision | Evidence required |
| --- | --- | --- | --- |
| 1. Record acceptance and prepare preflight | Preserve the exact reviewed SHA, update status/handoff and prepare a credential-safe provider checklist/probe. | Choose the isolated Studio pilot origin and Clerk instance/test identities; enter credentials privately in the pilot environment. | No tokens, claims identifying real users, capabilities or uploaded content in chat/log/Git. |
| 2. Real Clerk first | Exercise actual fresh token issuance after seed expiry, revoked session/disabled user denial and lost-ACK recovery. Keep exact sub/sid/Studio azp validation. | Complete Google sign-in/revoke actions using selected test accounts and private Clerk configuration. | Fresh JWT must have the original user/session, exact trusted azp and adequate lifetime; missing/wrong azp blocks operational pilot. No relaxed validation or TTL override. |
| 3. Isolated Cloudflare pilot | After explicit remote authorization, inventory/register the namespace, provision private R2/D1/three Workers, prepare separate Node/Studio Docker config and perform a staged pilot deployment. | Choose account/budget/origin and authorize the concrete resource/deploy scope. Do not replace the current lab. | D1 migrations0001→0002→0003 before code using cleanup_after; private R2/no public bypass; conditional writes/readback, late writes, revoke/unpublish and compatible rollback. |
| 4. Operational acceptance | Run provider lifecycle/race/rollback/load probes, inspect redacted logging and measure due-queue/metadata/audit/R2 operation costs. | Test real Google roles and Safari/iOS/Android/Zalo as available, review abuse/cost limits and accept limited pilot scope. | Keep aborted tombstones and Cron disabled until reviewed capacity/cost/schedule approval. #10 release gates remain open until fulfilled. |

Steps2–4 require private provider configuration and the stated authorization where they mutate remote resources. Preparing scripts/checklists does not authorize provisioning. Source review/merge is a separate track: owner may authorize #21→#22→#23 merge after stack review, with retarget/head/CI checks at each step; operational pilot need not precede source merge. This re-review alone does not grant merge authority or make the whole stack Ready.

Studio/Node retains ZIP processing and can run in a separate Docker instance on the VM; public/preview reads use Workers/D1/R2 directly. Pilot containers/env/data/origin remain separate from the running lab. Do not apply D1 SQL to PostgreSQL, roll back to cleanup_at-only code, purge tombstones, change DNS/UFW or deploy production from this record. ADR0001/0003/0005 remain Proposed.

Owner's successful Wrangler login is recorded as owner-confirmed setup. At final project handoff, remind the owner to run `npx wrangler logout` on this machine. Receiving this re-review is not project completion.
