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

- **Mốc đã xong:** P0 PR #2 và P1 PR #4 đã merge. Local MVP PR #5 được đổi base sang `main`, giải quyết conflict trong `README.md`, push commit `1506241`. CI `application` và `validate-docs` đã pass; GitHub báo `CLEAN`. PR #5 **vẫn Draft** và chưa merge.
- **Ghi nhận thử nghiệm:** owner đã xác nhận Studio, HTML upload và preview chạy được tại máy cá nhân ở phiên trước. Không suy diễn đây là kiểm tra security hoặc production deployment.
- **Việc hiện tại:** [Issue #6](https://github.com/cfotel2604/html-share-platform/issues/6), [Draft PR #7](https://github.com/cfotel2604/html-share-platform/pull/7) chuẩn hóa tài liệu bàn giao (`AGENTS.md`, `PROJECT_STATUS.md`, `AI_HANDOFF.md`, liên kết trong `README.md`) trên branch `codex/ai-handoff` dựa trên `origin/main` commit `40eb104`. Chỉ được coi là có trong `main` **sau khi PR tài liệu này được merge**.
- **Workspace lưu ý:** checkout mặc định `C:\Users\admin\Documents\Codex\html-share-platform` được thấy ở `e2b98e4`, chậm hơn `origin/main` 8 commit và có file chưa theo dõi; không được tự xóa hay ghi đè. Worktree Local MVP nằm riêng; tránh ảnh hưởng Docker/data của owner.
- **Bước kỹ thuật kế tiếp:** review PR #5 trước khi merge; sau đó lập kế hoạch P2 Google/Clerk + email allowlist/RBAC. Cloudflare R2, DNS wildcard và cookie isolation cần gate riêng; chưa làm production.

## Cách bàn giao khi kết thúc phiên

Cập nhật trong PR/branch được giao:

- `docs/PROJECT_STATUS.md`: ngày giờ kiểm chứng, PR/Issue, commit, CI, các quyết định mới, phần đã hoàn thành và các gate còn mở.
- `docs/AI_HANDOFF.md`: đang ở branch/worktree nào, thay đổi và kiểm tra vừa làm, việc nào chưa chạy, lỗi/giới hạn thực tế, 1–3 bước tiếp theo.
- Nếu có thay đổi kiến trúc, cập nhật ADR tương ứng; nếu có tính năng mới, cập nhật README và liên kết Issue/PR.

Phân biệt rõ kết quả **đã chạy trong phiên** với **ghi nhận từ phiên trước**. Không viết secrets hay thông tin khách hàng. Không tự merge PR/đổi DNS/deploy production. Khi tài liệu bàn giao còn trên Draft PR, Agent sau phải đọc trực tiếp branch đó hoặc lấy nội dung PR; checkout `main` sẽ chưa chứa các file mới.
