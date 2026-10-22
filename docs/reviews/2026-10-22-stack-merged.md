# Chốt merge auth/origin/share và lab handoff — 2026-10-22

Refs [#13](https://github.com/cfotel2604/html-share-platform/pull/13), [#15](https://github.com/cfotel2604/html-share-platform/pull/15), #8/#10/#14/#16; [review trước merge](2026-10-22-auth-and-share-retarget.md), [status](../PROJECT_STATUS.md), [handoff](../AI_HANDOFF.md).

## Quyền và kết quả

Owner xác nhận đầy đủ detailed real-session/lifecycle cases, sau đó cho phép chuyển Ready/merge #13 → #15 bằng merge commit, kiểm CI sau đổi base #15 và chốt handoff sau merge. Agent thực hiện đúng thứ tự, xác minh live base/head/3checks SUCCESS trước --match-head-commit; không force-push/delete branch hoặc deploy lab/production.

| PR | Exact tested head | Merge commit/main milestone | Bằng chứng |
| --- | --- | --- | --- |
| #13 | 8f204c3953f35d22d66ce515c7ff587954d5c996 | 6d30d227a52b9230f9190a701e066c436475473b | 79unit/15integration groups, all3checks PASS; main tree equals head |
| #15 | b21ea1299622037897853ac43684c7bf853d4991 | 0c17a09b68960d785f8b67b2a1585b0f3af919b8 | 86unit/20integration groups, all3checks PASS; main tree equals head |

#13 final-head [application](https://github.com/cfotel2604/html-share-platform/actions/runs/39779645546), [docs](https://github.com/cfotel2604/html-share-platform/actions/runs/39779645553), [security](https://github.com/cfotel2604/html-share-platform/actions/runs/39779645733) SUCCESS; main6d30d22 [application](https://github.com/cfotel2604/html-share-platform/actions/runs/39781287660), [docs](https://github.com/cfotel2604/html-share-platform/actions/runs/39781288158), [security](https://github.com/cfotel2604/html-share-platform/actions/runs/39781287780) SUCCESS.

#15 đã retarget main sau #13, sync4da65a7 không content change/conflict, docs b21ea12 ghi mốc/authority. Final-head [application](https://github.com/cfotel2604/html-share-platform/actions/runs/39781500278), [docs](https://github.com/cfotel2604/html-share-platform/actions/runs/39781500292), [security](https://github.com/cfotel2604/html-share-platform/actions/runs/39781500263) SUCCESS. Lint/typecheck/build PASS; integration9upload+6auth/origin+5share và restrictive-checkout/non-root image preflight. Source/src/scripts/db/dependencies/Docker/Compose/securityCI/attributes so e834f13 giữ nguyên; SQL0001–0003 blobs không đổi. Fixdc7560e là ancestor main, sandbox/auth/early-upload/tombstones không bị lùi. [CI main milestone](https://github.com/cfotel2604/html-share-platform/commit/0c17a09b68960d785f8b67b2a1585b0f3af919b8/checks) kiểm riêng, không suy head cũ thành CI mới.

Main0c17a09 sau merge cũng đã SUCCESS cả3jobs: [application](https://github.com/cfotel2604/html-share-platform/actions/runs/39782399284), [docs](https://github.com/cfotel2604/html-share-platform/actions/runs/39782399487), [security](https://github.com/cfotel2604/html-share-platform/actions/runs/39782399272). Handoff docs kiểm30Markdown files/local links,6GitHub YAML, git diff check và runtime/config/schema equality PASS. Operator runbook sửa7dòng được chọn,8Bash blocks mục8.2/8.3 syntax PASS; backup trước sửa và toàn bytes còn lại/credential lines giữ nguyên.

## Acceptance, Issues và handoff

Owner xác nhận Employee owner-only; Admin mutation/audit đúng actor; email ngoài allowlist deny; revoke/disable/logout chặn phiên cũ; rotate/revoke/reissue/unpublish chặn link cũ. #8 scope lab/P2 đã đạt/code main nên CLOSED; production Clerk/OAuth giữ #10. #14 short-link và #16 EACCES đều acceptance PASS, lab cutover0003/backfill đã xong và code main nên CLOSED. #9/#11 đã CLOSED trước đó. #10 OPEN cho release gates, ADR0001/0003 vẫn Proposed.

PROJECT_STATUS/AI_HANDOFF/MERGE_PLAN/LAB_HANDOFF/README/PLAN/WORKFLOW/SHARE_LINKS/SECURITY_LAB/ARCHITECTURE, status notes trong ADR0001/0003 và operator runbook được chốt trạng thái hiện tại; hồ sơ lịch sử vẫn giữ. Docs-only handoff đi feature PR từ main sau #15, không sửa main trực tiếp; docs/local-link/YAML/diff và runtime equality checks là kiểm phù hợp, CI current head theo Checks. Không rerun browser hoặc thu credentials thật chỉ vì docs.

Lab giữ source/webdc7560e, gatewaysecurity-417c50d, schema0003/env/volumes/operator overlays. Không SSH mutation, rebuild/restart, migration/backfill, DNS/UFW/secret change trong mốc merge. Image VM khác docs/main HEAD có chủ đích. [Lab baseline](../LAB_HANDOFF.md) và [owner/agent evidence](../validation/2026-10-22-lab-acceptance.md) ghi phạm vi lần kiểm22/10.

## Việc tiếp theo

#10: DNS/reserved/nginx443inventory/regression; R2 private/IAM/cleanup và productionClerk/OAuth; domain thật cookie sibling/cross-environment/mobile/Safari/Zalo/crawler; preview-hostname log redaction toàn pipeline; edge/concurrency/cache/unpublish; TLSrenewal/failure/rollback, securityreview và staging/pilot trước production. Giữ sandbox, schema/tombstones; rollback share ưu tiên kill switch, không mở lại alias32hex.
