# Project status — HTML Share Platform

> Snapshot kiểm tra ngày **2026-10-08 (Asia/Ho_Chi_Minh)**. GitHub là nguồn xác minh trạng thái PR/Issue; file này có thể cũ sau mỗi lần merge hoặc push. Đọc cùng [AI_HANDOFF](AI_HANDOFF.md), [PLAN](../PLAN.md) và [AGENTS](../AGENTS.md).

## Tiến độ đã kiểm chứng

| Hạng mục | Trạng thái tại snapshot | Bằng chứng |
| --- | --- | --- |
| P0 — Planning | PR #2 đã merge vào `main` | [PR #2](https://github.com/cfotel2604/html-share-platform/pull/2) |
| P1 — Foundation | PR #4 đã merge vào `main` | [PR #4](https://github.com/cfotel2604/html-share-platform/pull/4) |
| `main` từ remote | HEAD `40eb104` | `git log -1 origin/main` tại lúc kiểm tra |
| Local HTML Share MVP | PR #5 **Draft**, base `main`, head `codex/local-mvp`, chưa merge | [PR #5](https://github.com/cfotel2604/html-share-platform/pull/5) |
| PR #5 conflict / CI | `MERGEABLE` / `CLEAN`; `application` và `validate-docs` đều `SUCCESS` | PR #5, commit `1506241` |
| Issue | #1 (P0) và #3 (P1) vẫn **OPEN** dù PR tương ứng đã merge | [Issue #1](https://github.com/cfotel2604/html-share-platform/issues/1), [Issue #3](https://github.com/cfotel2604/html-share-platform/issues/3) |

Việc chuẩn hóa tài liệu trạng thái/handoff được theo dõi tại [Issue #6](https://github.com/cfotel2604/html-share-platform/issues/6), trên branch `codex/ai-handoff`; chưa có trong `main` khi snapshot này được lập.

Theo báo cáo test của phiên trước và xác nhận của owner: Local MVP đã thử Studio, upload file HTML và preview thành công. Đây là **kết quả lịch sử**, không phải kiểm thử runtime mới trong lần cập nhật tài liệu này. PR #5 còn Draft nên chưa coi MVP đã được duyệt merge hoặc sẵn sàng cho Internet.

## Quyết định owner đã ghi nhận

- Dashboard/API nội bộ cùng Next.js: `studio.ods.vn`, API `/api/*` chung container; đăng nhập Google qua Clerk Development giai đoạn lab, allowlist email kiểm tra server-side.
- Link gửi khách: `https://view.ods.vn/<site-id>` là viewer shell tin cậy, nhúng nội dung upload từ `https://<site-id>.matbao.one/` qua sandbox iframe.
- Một wildcard DNS `*.matbao.one` có thể sử dụng về sau; chưa thay đổi DNS. Kiểm kê hostname/record/route cũ và chứng minh an toàn cookie parent-domain trước khi bật public gateway.
- Storage production: **Cloudflare R2 private**. Image MinIO legacy chỉ được phép dùng local lab; chưa tích hợp R2 thật.
- Hạ tầng giai đoạn đầu: Docker/VPS, thử nghiệm trên máy cá nhân. ZIP tối đa 20 MiB nén, 100 MiB giải nén, 500 file, depth 12.
- Retention có thể cấu hình; **không làm backup/restore trong MVP** theo quyết định owner, đồng nghĩa chấp nhận rủi ro mất dữ liệu.

Chi tiết và điều kiện bảo mật bắt buộc: [kiến trúc](ARCHITECTURE.md), [ADR-0001](adr/0001-public-site-origin-isolation.md). ADR về origin isolation hiện là **Proposed** và cần kiểm chứng trước khi triển khai công khai.

## Chưa hoàn thành / cần review

1. **PR #5:** review tính năng Local MVP và bảo mật (demo password, upload validation, guest/API boundary, CSP iframe/direct navigation). Giữ Draft cho đến khi đủ tiêu chí; không tự merge hoặc deploy production.
2. **P2 — Authentication/RBAC:** Google/Clerk, email allowlist phía server, phân quyền và kiểm thử API quản trị. Local MVP hiện dùng mật khẩu demo, không phải cơ chế production.
3. **P3/P4 và các phase tiếp theo theo [PLAN](../PLAN.md):** tích hợp Cloudflare R2 thật, gateway/domain/TLS, cookie-domain isolation, wildcard ảnh hưởng các site cũ, browser/Zalo compatibility, quota/retention và các gate trước public.
4. **Issue hygiene:** xác nhận với owner khi nào đóng Issue #1/#3; việc merge PR không tự đóng các Issue đang OPEN.

## Cách kiểm chứng lại trong phiên tiếp theo

Từ đúng repository/worktree, dùng `git status --short --branch`, `git worktree list`, `git fetch origin --prune`, `git log -1 origin/main`, `gh pr list --state open`, `gh pr view 5 --json state,isDraft,baseRefName,headRefName,mergeable,mergeStateStatus,statusCheckRollup` và `gh issue list --state open`. Nếu không có quyền GitHub/network, ghi rõ **chưa xác minh** thay vì khẳng định snapshot còn hiệu lực.

Khi PR/Issue đổi trạng thái hoặc quyết định được chốt, cập nhật ngày kiểm chứng và dẫn chứng trong file này trên branch công việc, đồng thời cập nhật [AI_HANDOFF](AI_HANDOFF.md).
