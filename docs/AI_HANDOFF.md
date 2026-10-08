# AI Agent handoff — HTML Share Platform

> Cập nhật **2026-10-08 (Asia/Ho_Chi_Minh)**. Đây là ghi chú tiếp nối giữa các phiên, không phải nguồn live cho GitHub. Đối chiếu [PROJECT_STATUS](PROJECT_STATUS.md) trước khi quyết định tiếp tục công việc.

## Đọc và kiểm tra khi bắt đầu

1. Mở đúng repository `cfotel2604/html-share-platform`; xác nhận `pwd`, nhánh và worktrees. Đọc [AGENTS](../AGENTS.md), [README](../README.md), [PLAN](../PLAN.md), [ARCHITECTURE](ARCHITECTURE.md), [WORKFLOW](WORKFLOW.md), [ADR-0001](adr/0001-public-site-origin-isolation.md) và [PROJECT_STATUS](PROJECT_STATUS.md).
2. Kiểm tra thay đổi local trước khi đồng bộ. Không chạy `git reset --hard`, `git clean`, xóa `.env`, volumes hay dừng Docker lab của owner. Dùng `git fetch origin --prune` và so sánh HEAD với `origin/main`; chỉ fast-forward một checkout sạch khi an toàn, hoặc tạo worktree/branch riêng từ remote mới nhất.
3. Dùng `gh pr list`, `gh issue list`, `gh pr view` và kiểm tra CI/mergeability hiện tại. Tránh dựa vào số commit, trạng thái CI hoặc các dòng “Draft” cũ trong tài liệu khi GitHub đã thay đổi.
4. Báo cáo ngắn điều đã kiểm chứng, điều chưa chắc và công việc đề xuất. Chỉ thay đổi file trong branch được giao và kiểm tra đúng phạm vi trước commit/push.

```powershell
git status --short --branch
git worktree list
git remote -v
git fetch origin --prune
git log -1 --oneline origin/main
gh pr list --state open
gh pr view 5 --json state,isDraft,baseRefName,headRefName,mergeable,mergeStateStatus,statusCheckRollup
gh issue list --state open
```

## Bàn giao tại mốc này

- **Mốc đã xong:** P0 PR #2, P1 PR #4 và handoff PR #7 đã merge. `origin/main` là `78cb7ca`. Đồng bộ lại PR #5 với main, giải quyết conflict `README.md` và push `c30c55a`; CI `application` và `validate-docs` đều SUCCESS, GitHub báo MERGEABLE/CLEAN. PR #5 **vẫn Draft**, chưa merge.
- **Ghi nhận thử nghiệm:** owner đã xác nhận Studio, HTML upload và preview chạy được tại máy cá nhân ở phiên trước. Không suy diễn đây là kiểm tra security hoặc production deployment.
- **Review hoàn tất ở phạm vi code/function probes:** [báo cáo](reviews/2026-10-08-pr5.md). Lint/typecheck/build và 4 tests pass; ZIP hợp lệ + 11 rejection probes pass. Hai finding: body cap bypass khi thiếu Content-Length, object writes trước ownership. Theo dõi [#9](https://github.com/cfotel2604/html-share-platform/issues/9); chưa sửa runtime, chưa có browser/Docker proof mới. Không đổi PR sang Ready chỉ vì hết conflict/CI xanh.
- **Tracking:** #1/#3 được cập nhật kết quả và đóng theo đồng ý của owner; #6 đã đóng sau merge #7. Issue mới: [#8 P2](https://github.com/cfotel2604/html-share-platform/issues/8), [#9 upload](https://github.com/cfotel2604/html-share-platform/issues/9), [#10 P4](https://github.com/cfotel2604/html-share-platform/issues/10), [#11 UI](https://github.com/cfotel2604/html-share-platform/issues/11). ADR-0001 vẫn Proposed.
- **Workspace:** checkout mặc định `C:\Users\admin\Documents\Codex\html-share-platform` sạch tại `78cb7ca`, không sửa trực tiếp main. Đợt sync/review dùng worktree `C:\Users\admin\Documents\Codex\html-share-platform-pr5-sync`, branch local `codex/pr5-review-sync`, push `HEAD:codex/local-mvp` để cập nhật PR #5. Worktree `html-share-platform-local-mvp` của owner vẫn tại `b3f8119`; không reset/chuyển/dừng stack đó. Kiểm tra lại status trước mọi thao tác.
- **Giao diện:** owner muốn phong cách của `D:\codex\00000_outsource\ods-sip2-dashboard`. Source khảo sát hiện dùng primary blue `#0F7EC1` light / `#2A9DDE` dark, neutral/graphite, radius 2–4px, Geist/Mono; lime dùng status. Khả thi tái dùng visual patterns vì cùng Next/React/Tailwind 4, nhưng không copy tenant state/auth/business logic. Hướng đề xuất: Studio thoáng, upload + list là chính; Console/sidebar là phương án khác. Chưa chọn layout cuối hoặc sửa UI app; theo dõi #11.
- **Ba bước tiếp:** (1) sửa findings #9 và test lại PR #5, (2) PR UI riêng theo #11 sau khi chốt layout, (3) triển khai P2 #8; giữ #10 làm gate public, không merge/deploy tự động.

## Cách bàn giao khi kết thúc phiên

Cập nhật trong PR/branch được giao:

- `docs/PROJECT_STATUS.md`: ngày giờ kiểm chứng, PR/Issue, commit, CI, các quyết định mới, phần đã hoàn thành và các gate còn mở.
- `docs/AI_HANDOFF.md`: đang ở branch/worktree nào, thay đổi và kiểm tra vừa làm, việc nào chưa chạy, lỗi/giới hạn thực tế, 1–3 bước tiếp theo.
- Nếu có thay đổi kiến trúc, cập nhật ADR tương ứng; nếu có tính năng mới, cập nhật README và liên kết Issue/PR.

Phân biệt rõ kết quả **đã chạy trong phiên** với **ghi nhận từ phiên trước**. Không viết secrets hay thông tin khách hàng. Không tự merge PR/đổi DNS/deploy production. Khi tài liệu bàn giao còn trên Draft PR, Agent sau phải đọc trực tiếp branch đó hoặc lấy nội dung PR; checkout `main` sẽ chưa chứa các file mới.
