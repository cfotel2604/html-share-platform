# Chuẩn bị merge stack sau nghiệm thu lab — 2026-10-22

Đây là kế hoạch review/merge để owner thực hiện hoặc giao tiếp; chưa merge, đổi base, chuyển Ready hoặc triển khai production. [Lab handoff](LAB_HANDOFF.md) ghi runtime `dc7560e`; head tài liệu/PR có thể mới hơn image đang chạy. [Workflow](WORKFLOW.md) vẫn áp dụng.

## GitHub đã kiểm trực tiếp

Main `78cb7ca`. Cả bốn PR OPEN, MERGEABLE, CI hiện tại SUCCESS; chưa có review approval ghi nhận. #13/#15 vẫn Draft. Re-query đúng head ngay trước mỗi merge, không dùng snapshot này làm approval.

| Thứ tự | PR | Base hiện tại | Head kiểm ngày 22/10 | Trạng thái |
| --- | --- | --- | --- | --- |
| 1 | [#5 — local MVP/upload](https://github.com/cfotel2604/html-share-platform/pull/5) | main | `235cc62597a15b437e4db11cfc1fced4890483b1` | Ready, 2 checks SUCCESS |
| 2 | [#12 — Studio](https://github.com/cfotel2604/html-share-platform/pull/12) | codex/local-mvp | `4ab546adba17cea8c0d298e786a652a0b2277bc3` | Ready, 2 checks SUCCESS |
| 3 | [#13 — auth/origin](https://github.com/cfotel2604/html-share-platform/pull/13) | codex/11-studio-ui | `4ac96894b3ac75d0a80c7190d8c70d1c00602a61` | Draft, 3 checks SUCCESS |
| 4 | [#15 — short viewer/permissions](https://github.com/cfotel2604/html-share-platform/pull/15) | codex/8-10-auth-origin-gates | `c2da87f7ae64650ef3a4e60bbfd5c3d6cd83fee6` trước cập nhật handoff | Draft, 3 checks SUCCESS; head docs mới cần kiểm sau push |

Repo cho phép merge commit, squash và rebase; đề xuất **merge commit** cho stack này để giữ ancestry. Nếu squash/rebase dependency, không chỉ đổi base vì có thể xuất hiện lại commits/conflicts; cần re-stack/review trong worktree riêng, giữ owner files và rerun checks. Không xóa dependency branches giữa chuỗi.

## Trình tự sau khi owner chấp thuận merge

1. Reviewer xem diff #5 với main và kết quả #9; merge #5 vào main khi scope đạt. Đây là local-only/demo build, không deploy intermediate main đó ra public.
2. Fetch origin, đổi base #12 về main, kiểm diff chỉ còn UI/API boundary dự kiến, mergeability và CI trên head/base mới; review rồi merge #12.
3. Đổi base #13 về main, review auth/gateway/migration0002 và checklist dưới. Chỉ chuyển Ready khi scope/gates review đạt; nếu thiếu evidence thì giữ Draft, bổ sung trước merge.
4. Sau #13 merge, đổi base #15 về main, review short-link/migration0003/EACCES fix và handoff. Kiểm lại diff/CI; chuyển Ready và merge sau review.
5. Sau mỗi bước ghi merge commit/PR/base mới vào PROJECT_STATUS/AI_HANDOFF trên branch được giao. Sau toàn stack, xác minh main có runtime fix `dc7560e`, schema0001–0003 không đổi bytes, links/docs nhất quán. Merge source không tự đổi VM; không cần redeploy chỉ để đổi tên branch.

Lệnh kiểm chỉ đọc dùng ở từng bước:

```bash
git fetch origin --prune
gh pr view 15 --json state,isDraft,baseRefName,headRefName,headRefOid,mergeable,reviewDecision,statusCheckRollup
gh pr diff 15 --stat
gh pr checks 15
```

Thay15 bằng PR đang review. Retarget/Ready/merge là mutation, không nằm trong lần chuẩn bị handoff này. Khi đã được giao merge, kiểm đúng head và base sau dependency merge trước khi thực hiện.

## Review lab cần chốt trước Ready #13/#15

Owner xác nhận dùng thử tổng quát OK, bên ngoài tải iframe; agent kiểm read-only routes/headers/DB. Không suy số active/revoked rows thành toàn bộ test dưới đã PASS.

| Phạm vi | Bằng chứng đã có | Cần reviewer chốt |
| --- | --- | --- |
| Login và RBAC #8 | Owner Admin/Employee login; unit/DB integration ownership/deny/revoke | Session thật: Employee chỉ thao tác site mình, Admin mutation + actor audit, ngoài allowlist bị từ chối, policy revoke/disable và logout; dùng fixture/test identity, không khóa tài khoản thật tùy tiện |
| Origin/private preview #10 | Local Chrome direct/iframe boundary; public headers/sandbox và owner preview/retests | Phạm vi browser thật/domain thật và cookie boundary đã test; liệt kê phần mobile/sibling/production còn gate, giữ ADR-0001/0003 Proposed đến review tương ứng |
| Share lifecycle #14 | 20 integration groups; local Chrome lifecycle; lab canonical200/alias 404, 3 revoked rows | Owner/reviewer ghi case update giữ URL, rotate/revoke/reissue mã cũ404, revoked không tự hồi khi publish/update, unpublish chặn viewer/direct, preview vẫn chạy |
| Permissions #16 | Restrictive checkout/non-root image CI, fixed image UID1000, SQL0003 đã chạy lab | Review Dockerfile/CI/fix và kết quả retry; giữ SQL checksums, không dùng image b1e lỗi |
| Vận hành | Runtime healthy, public 443 do owner mở, origins đúng | Lưu SECURITY_IMAGE private env; rà các nginx vhosts vì443 mở chung IP, cập nhật operator handoff |

Review code/merge vào main không tự phê duyệt pilot/production. Không hạ gate hoặc đánh dấu ADR Accepted để hoàn tất checklist. Nếu reviewer cần thay code, dùng branch/PR đúng scope và test tương ứng.

## Issue và release tiếp theo

- #9 có `Closes` trong #5: chỉ đóng khi merge đúng target/default branch và scope đạt; xác minh trạng thái thực tế sau merge.
- #11 liên quan #12; #14/#16 liên quan #15: chỉ đóng sau review/merge và acceptance tương ứng, không tự đóng từ lab smoke. PR dùng `Refs` không đảm bảo tự đóng Issue.
- #8/#10 tiếp tục mở cho phần evidence/gates chưa hoàn tất; nếu tách phần release thành Issues mới phải ghi mapping và acceptance rõ, không bỏ checklist cũ.
- Trước pilot/production: private R2 (VM MinIO legacy không đạt), production Clerk/OAuth, cookie/mobile/Zalo, edge limits/log redaction, vhost/DNS inventory và renewal/rollback, security/owner review. Chưa được giao thay DNS hoặc triển khai production.
