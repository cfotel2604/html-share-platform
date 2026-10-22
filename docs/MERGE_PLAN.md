# Chuẩn bị merge stack sau nghiệm thu lab — 2026-10-22

Owner đã giao Ready/merge #13 → #15 và chốt handoff. #13 MERGED main6d30d22 lúc19:47:35 Asia/Saigon, exact head8f204c3/3checks PASS; #15 đã retarget main và sync dependency merge, chờ final-head CI trước merge. Các bước chuẩn bị bên dưới là lịch sử; quyền merge chuỗi đã có, không hỏi lại. [Lab handoff](LAB_HANDOFF.md) ghi runtime dc7560e đã chạy; merge source không tự đổi containers. [Workflow](WORKFLOW.md) vẫn áp dụng; chưa production.

## GitHub đã kiểm trực tiếp

Main hiện `6bdd298ab89dfe9a9061fb64203d3b3215fe4809` sau owner giao merge recovery #17 lúc19:18:18 Asia/Saigon. #5 trước đó đã merged main1ed0eb0 lúc19:02:23. #12 merged một phút sau vào base cũ `codex/local-mvp`, commit2df738b; UI khi đó chưa main, nay đã khôi phục qua #17. Không mất code, không revert #12. Agent review lại #5, exact-main application/docs SUCCESS (50 tests/0fail/lint/typecheck/build).

| PR | Trạng thái/base hiện tại | Bước tiếp |
| --- | --- | --- |
| [#5](https://github.com/cfotel2604/html-share-platform/pull/5) | MERGED vào main1ed0eb0, #9 CLOSED | Đã review sau merge, không merge lại |
| [#12](https://github.com/cfotel2604/html-share-platform/pull/12) | MERGED vào codex/local-mvp2df738b, tree đúng UI4ab546a | Đã vào main qua #17 |
| [#17](https://github.com/cfotel2604/html-share-platform/pull/17) | MERGED main6bdd298, tested headcc5a85c | Owner giao Ready/merge; 55tests/application/docs SUCCESS; main tree/equality/backend checks PASS |
| [#13](https://github.com/cfotel2604/html-share-platform/pull/13) | MERGED main6d30d22, tested head8f204c3 | 79unit/15groups và3checks PASS, main tree equality PASS |
| [#15](https://github.com/cfotel2604/html-share-platform/pull/15) | Base main sau #13 merge | Sync không conflict/runtime change; CI final head rồi Ready/merge theo owner giao |

[PR recovery và review #5](https://github.com/cfotel2604/html-share-platform/pull/17) giữ ancestry và code22files UI nguyên vẹn từ #12. Repo cho phép merge commit; tiếp dùng merge commit cho recovery/stack. Không squash/rebase hoặc force-push dependencies tùy tiện, không xóa branch gốc giữa chuỗi. Re-query head/base ngay trước merge, không dùng snapshot làm approval.

## Trình tự còn lại

1. Recovery #17 đã review/CI55tests PASS, owner giao Ready/merge và đã merge main6bdd298. Không lặp merge/revert #12; main tree khớp cc5a85c và chứa ancestor UI4ab546a, backend/schema không đổi.
2. Sau #17 vào main, retarget #13 main khi được giao; review auth/gateway/migration0002 và checklist dưới, giải quyết docs conflicts giữ trạng thái mới. Chỉ chuyển Ready khi scope/gates đạt.
3. Sau #13 vào main, retarget #15 main, kiểm diff/CI/share lifecycle/0003/permissions/handoff. Không tự merge #13/#15 từ thao tác recovery UI.
4. Ghi commit/PR/base/checks mới trong PROJECT_STATUS/AI_HANDOFF đúng branch. Main trung gian chỉ local/demo/path gateway, không build/deploy lên lab đang chạy Clerk/hostname/short links. Không chạy lại migration chỉ vì merge source.

Lệnh kiểm chỉ đọc dùng ở từng bước:

```bash
git fetch origin --prune
gh pr view 15 --json state,isDraft,baseRefName,headRefName,headRefOid,mergeable,reviewDecision,statusCheckRollup
gh pr diff 15 --stat
gh pr checks 15
```

Thay15 bằng PR đang review. Retarget/Ready/merge là mutation, không nằm trong lần chuẩn bị handoff này. Khi đã được giao merge, kiểm đúng head và base sau dependency merge trước khi thực hiện.

## Review lab cần chốt trước Ready #13/#15

Owner đã xác nhận chi tiết ngày22/10: Employee owner-only, Admin mutation/audit đúng actor, ngoài allowlist deny, revoke/disable/logout phiên cũ deny, rotate/revoke/reissue/unpublish đều đạt. Đây là owner-confirmed real-session evidence; agent review code và CI đúng heads mới. Không suy số rows hoặc .test thành full browser/mobile matrix. [Review retarget](reviews/2026-10-22-auth-and-share-retarget.md).

| Phạm vi | Bằng chứng đã có | Cần reviewer chốt |
| --- | --- | --- |
| Login và RBAC #8 | Owner Admin/Employee login; unit/DB integration ownership/deny/revoke | Owner xác nhận tất cả các case này đều đạt; không tự revoke tài khoản thật. Production Clerk/OAuth/provider quota vẫn release riêng |
| Origin/private preview #10 | Local Chrome direct/iframe boundary; public headers/sandbox và owner preview/retests | Phạm vi browser thật/domain thật và cookie boundary đã test; liệt kê phần mobile/sibling/production còn gate, giữ ADR-0001/0003 Proposed đến review tương ứng |
| Share lifecycle #14 | 20 integration groups; local Chrome lifecycle; lab canonical200/alias 404, 3 revoked rows | Owner xác nhận rotate/revoke/reissue/unpublish đạt; local Chrome/integration bao gồm update giữ URL/revoked không tự hồi/preview. Giữ giới hạn direct-content và tab đã tải |
| Permissions #16 | Restrictive checkout/non-root image CI, fixed image UID1000, SQL0003 đã chạy lab | Review Dockerfile/CI/fix và kết quả retry; giữ SQL checksums, không dùng image b1e lỗi |
| Vận hành | Runtime healthy, public 443 do owner mở, origins đúng | SECURITY_IMAGE đã lưu/Compose config PASS; rà các nginx vhosts vì443 mở chung IP, cập nhật operator handoff |

Review code/merge vào main không tự phê duyệt pilot/production. Không hạ gate hoặc đánh dấu ADR Accepted để hoàn tất checklist. Nếu reviewer cần thay code, dùng branch/PR đúng scope và test tương ứng.

## Issue và release tiếp theo

- #9 đã CLOSED sau merge #5 vào main; đã xác minh trạng thái trực tiếp.
- #11 đã CLOSED sau recovery #17 vào main và đối chiếu acceptance checklist đã đạt. #14/#16 theo #15, chỉ đóng sau review/merge/acceptance tương ứng; Refs không đảm bảo auto-close.
- #8/#10 tiếp tục mở cho phần evidence/gates chưa hoàn tất; nếu tách phần release thành Issues mới phải ghi mapping và acceptance rõ, không bỏ checklist cũ.
- Trước pilot/production: private R2 (VM MinIO legacy không đạt), production Clerk/OAuth, cookie/mobile/Zalo, edge limits/log redaction, vhost/DNS inventory và renewal/rollback, security/owner review. Chưa được giao thay DNS hoặc triển khai production.
