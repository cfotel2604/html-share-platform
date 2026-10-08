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
gh pr view 12 --json state,isDraft,baseRefName,headRefName,mergeable,mergeStateStatus,statusCheckRollup
gh issue list --state open
```

## Bàn giao tại mốc này

- **UI đã triển khai và deploy:** owner chọn Studio tập trung và giao deploy Docker Desktop local. [Draft PR #12](https://github.com/cfotel2604/html-share-platform/pull/12), branch `codex/11-studio-ui`, worktree `C:\Users\admin\Documents\Codex\html-share-platform-pr5-sync`, base `codex/local-mvp` tại `192d1af`. Code deploy `908901b48f663d33fcc2eafb40add70b574ee312`, image `html-share-studio:ui-908901b`; web healthy tại `http://127.0.0.1:3100`. Chỉ thay web, không chạy migration. 6 site cũ giữ nguyên metadata; DB/MinIO/gateway giữ container IDs/mounts. Hai fixture kiểm thử mới để unpublished; không xóa dữ liệu owner. [Validation và rollback](validation/2026-10-08-studio-ui.md).
- **Kiến trúc thay UI:** `components/studio` chỉ presentation/browser state, `features/studio` chứa workflow hook và typed HTTP adapter/DTO. ESLint chặn import server services/DB/storage vào UI. [ADR-0002](adr/0002-replaceable-studio-ui.md) Accepted; Next API/backend vẫn chung container web, gateway riêng. API/schema/sandbox/gateway không đổi.
- **Checks UI đã chạy:** lint/typecheck, 9 tests (5 adapter tests mới), production build local và Docker, docs/YAML/diff pass. CI #12 tại code `908901b`: application [37789109277](https://github.com/cfotel2604/html-share-platform/actions/runs/37789109277) và docs [37789109290](https://github.com/cfotel2604/html-share-platform/actions/runs/37789109290) SUCCESS; GitHub MERGEABLE/CLEAN. Chrome runtime: form login/logout, HTML/ZIP, update giữ URL, clipboard success/fallback, filter, theme persistence, keyboard refresh/filter/logout, guest API/401, cross-origin mutation/403, sandbox/no-store, unpublish/404 rồi republish/200. 1280/390/320 px không overflow; đã xem screenshots light/dark/mobile với dữ liệu fixture tổng hợp. Safari/Zalo, production domains/cookies và R2 chưa kiểm chứng.

- **Mốc đã xong:** P0 PR #2, P1 PR #4 và handoff PR #7 đã merge. `origin/main` là `78cb7ca`. PR #5 head `192d1af`, MERGEABLE, CI application/docs SUCCESS khi kiểm tra lại ngày 2026-10-08. PR #5 và #12 **vẫn Draft**, chưa merge.
- **Ghi nhận thử nghiệm:** owner đã xác nhận Studio, HTML upload và preview chạy được tại máy cá nhân ở phiên trước. Không suy diễn đây là kiểm tra security hoặc production deployment.
- **Review MVP trước UI:** [báo cáo](reviews/2026-10-08-pr5.md), 4 tests và ZIP hợp lệ + 11 rejection probes pass. Hai finding #9 vẫn chưa sửa: body cap bypass khi thiếu Content-Length và object writes trước ownership. Browser/Docker proof UI mới không giải quyết các finding này. Không đổi #5 sang Ready chỉ vì CI xanh hoặc UI đã chạy.
- **Tracking:** #1/#3 được cập nhật kết quả và đóng theo đồng ý của owner; #6 đã đóng sau merge #7. Issue mới: [#8 P2](https://github.com/cfotel2604/html-share-platform/issues/8), [#9 upload](https://github.com/cfotel2604/html-share-platform/issues/9), [#10 P4](https://github.com/cfotel2604/html-share-platform/issues/10), [#11 UI](https://github.com/cfotel2604/html-share-platform/issues/11). ADR-0001 vẫn Proposed.
- **Workspace/Compose:** checkout mặc định `html-share-platform` vẫn tại `78cb7ca`, không sửa main. Worktree owner `html-share-platform-local-mvp` vẫn tại `b3f8119`; `.env` và compose gốc ở đó được giữ nguyên. Stack MVP đang chạy image web từ branch UI qua `compose.studio-ui.yaml`; các lần `up` sau cần giữ override để tránh build lại UI cũ. Stack Foundation `html-share-platform` cổng 3000 không đổi. Kiểm tra lại status trước thao tác; không reset/clean/xóa volumes.
- **Giao diện:** ODS blue `#0F7EC1` light / `#2A9DDE` dark; action light `#0D76B5` tăng contrast chữ trắng. Neutral/graphite, radius nhỏ, Geist/Mono bundled; green chỉ trạng thái. Source tham khảo `D:\codex\00000_outsource\ods-sip2-dashboard` không bị sửa; không copy tenant/auth/business logic.
- **Ba bước tiếp:** (1) sửa findings #9 và kiểm thử PR #5; (2) review #12, sau #5 merge đổi base UI về main rồi chạy lại CI/mergeability; (3) triển khai P2 #8. Giữ #10 làm gate public. Deploy local đã được giao và hoàn tất; chưa được giao merge/deploy production.

## Cách bàn giao khi kết thúc phiên

Cập nhật trong PR/branch được giao:

- `docs/PROJECT_STATUS.md`: ngày giờ kiểm chứng, PR/Issue, commit, CI, các quyết định mới, phần đã hoàn thành và các gate còn mở.
- `docs/AI_HANDOFF.md`: đang ở branch/worktree nào, thay đổi và kiểm tra vừa làm, việc nào chưa chạy, lỗi/giới hạn thực tế, 1–3 bước tiếp theo.
- Nếu có thay đổi kiến trúc, cập nhật ADR tương ứng; nếu có tính năng mới, cập nhật README và liên kết Issue/PR.

Phân biệt rõ kết quả **đã chạy trong phiên** với **ghi nhận từ phiên trước**. Không viết secrets hay thông tin khách hàng. Không tự merge PR/đổi DNS/deploy production. Khi tài liệu bàn giao còn trên Draft PR, Agent sau phải đọc trực tiếp branch đó hoặc lấy nội dung PR; checkout `main` sẽ chưa chứa các file mới.
