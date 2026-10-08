# Project status — HTML Share Platform

> Snapshot kiểm tra ngày **2026-10-08 (Asia/Ho_Chi_Minh)**. GitHub là nguồn xác minh trạng thái PR/Issue; file này có thể cũ sau mỗi lần merge hoặc push. Đọc cùng [AI_HANDOFF](AI_HANDOFF.md), [PLAN](../PLAN.md) và [AGENTS](../AGENTS.md).

## Tiến độ đã kiểm chứng

| Hạng mục | Trạng thái tại snapshot | Bằng chứng |
| --- | --- | --- |
| P0 — Planning | PR #2 đã merge vào `main` | [PR #2](https://github.com/cfotel2604/html-share-platform/pull/2) |
| P1 — Foundation | PR #4 đã merge vào `main` | [PR #4](https://github.com/cfotel2604/html-share-platform/pull/4) |
| `main` từ remote | HEAD `78cb7ca`; PR #7 đã merge | Git log và GitHub đã đối chiếu trong phiên |
| Local HTML Share MVP | PR #5 **Draft**, base `main`, head `codex/local-mvp`, chưa merge | [PR #5](https://github.com/cfotel2604/html-share-platform/pull/5) |
| PR #5 conflict / CI | Sync `origin/main`, giải quyết README tại `c30c55a`; `MERGEABLE` / `CLEAN`, hai checks `SUCCESS` | [application](https://github.com/cfotel2604/html-share-platform/actions/runs/37776296488), [validate-docs](https://github.com/cfotel2604/html-share-platform/actions/runs/37776296510) |
| Review PR #5 | Hai finding upload còn mở; giữ Draft dù CI pass | [Báo cáo review](reviews/2026-10-08-pr5.md), [Issue #9](https://github.com/cfotel2604/html-share-platform/issues/9) |
| Issue hoàn tất | #1 (P0), #3 (P1), #6 (handoff) đã **CLOSED** | Đóng phạm vi planning/foundation; các gate tiếp tục ở #8/#9/#10 |
| Issue kế tiếp | #8 Auth/RBAC; #9 upload hardening; #10 P4 gates; #11 UI ODS | [Danh sách Issue mở](https://github.com/cfotel2604/html-share-platform/issues) |

Tài liệu handoff ban đầu đã vào `main` qua [PR #7](https://github.com/cfotel2604/html-share-platform/pull/7), [Issue #6](https://github.com/cfotel2604/html-share-platform/issues/6) đã đóng. Bản cập nhật sync/review này nằm trong PR #5, chưa vào `main` đến khi PR đó được merge. Owner đã đồng ý công việc sync/review và chuẩn hóa tracking, chưa chỉ định merge/deploy.

Theo báo cáo test của phiên trước và xác nhận của owner: Local MVP đã thử Studio, upload file HTML và preview thành công. Đây là **kết quả lịch sử**, không phải kiểm thử runtime mới trong lần cập nhật tài liệu này. PR #5 còn Draft nên chưa coi MVP đã được duyệt merge hoặc sẵn sàng cho Internet.

**Đã chạy lại trong phiên sync/review:** lint, typecheck, 4 tests và build pass; ZIP hợp lệ và 11 nhóm rejection pass qua production-function probes. Tái hiện body upload >23 MiB không Content-Length vẫn được chấp nhận và storage write xảy ra trước ownership check (DB/storage stubs). Chưa chạy lại Docker/browser smoke; chi tiết và giới hạn trong [báo cáo review](reviews/2026-10-08-pr5.md).

## Quyết định owner đã ghi nhận

- **UI, 2026-10-08:** owner chọn **Studio tập trung**, giao thay UI và deploy lại stack Docker Desktop `html-share-local-mvp` tại cổng 3100. Branch UI `codex/11-studio-ui` dựa trên head PR #5 `192d1af`, PR riêng sẽ base `codex/local-mvp` để review đúng phần UI; đổi base về main sau khi #5 merge. Đã triển khai presentation/API adapter tách biệt theo [ADR-0002](adr/0002-replaceable-studio-ui.md). Lint/typecheck/build, 9 tests và docs/YAML pass; Docker/browser validation đang chờ thực hiện tại thời điểm commit triển khai đầu tiên.

- Dashboard/API nội bộ cùng Next.js: `studio.ods.vn`, API `/api/*` chung container; đăng nhập Google qua Clerk Development giai đoạn lab, allowlist email kiểm tra server-side.
- Link gửi khách: `https://view.ods.vn/<site-id>` là viewer shell tin cậy, nhúng nội dung upload từ `https://<site-id>.matbao.one/` qua sandbox iframe.
- Một wildcard DNS `*.matbao.one` có thể sử dụng về sau; chưa thay đổi DNS. Kiểm kê hostname/record/route cũ và chứng minh an toàn cookie parent-domain trước khi bật public gateway.
- Storage production: **Cloudflare R2 private**. Image MinIO legacy chỉ được phép dùng local lab; chưa tích hợp R2 thật.
- Hạ tầng giai đoạn đầu: Docker/VPS, thử nghiệm trên máy cá nhân. ZIP tối đa 20 MiB nén, 100 MiB giải nén, 500 file, depth 12.
- Retention có thể cấu hình; **không làm backup/restore trong MVP** theo quyết định owner, đồng nghĩa chấp nhận rủi ro mất dữ liệu.

Chi tiết và điều kiện bảo mật bắt buộc: [kiến trúc](ARCHITECTURE.md), [ADR-0001](adr/0001-public-site-origin-isolation.md). ADR về origin isolation hiện là **Proposed** và cần kiểm chứng trước khi triển khai công khai.

## Chưa hoàn thành / cần review

1. **PR #5 / [#9](https://github.com/cfotel2604/html-share-platform/issues/9):** sửa byte cap trước multipart parsing và ownership trước storage writes, thêm regression/integration tests; giữ Draft cho đến khi review findings được xử lý và có smoke/browser proof phù hợp.
2. **P2 — [#8](https://github.com/cfotel2604/html-share-platform/issues/8):** Google/Clerk, email allowlist phía server, Employee/Admin và API ownership tests; demo password không phải cơ chế production. Chưa triển khai P2 trong đợt review.
3. **P4 — [#10](https://github.com/cfotel2604/html-share-platform/issues/10):** R2/gateway/domain/TLS, cookie isolation, reserved DNS/route inventory, browser/Zalo và cache gates; ADR vẫn Proposed. P5/P6/P7 còn retention, audit/atomicity, hardening, staging/pilot/rollback theo [PLAN](../PLAN.md).
4. **UI — [#11](https://github.com/cfotel2604/html-share-platform/issues/11):** khả thi áp dụng ODS SIP2 tokens/patterns (blue action, neutral/graphite surfaces, small radius, Geist/Mono; green chỉ trạng thái). Đã khảo sát code hiện tại; hai layout Studio/Console đang là đề xuất, chưa đổi giao diện runtime.

## Cách kiểm chứng lại trong phiên tiếp theo

Từ đúng repository/worktree, dùng `git status --short --branch`, `git worktree list`, `git fetch origin --prune`, `git log -1 origin/main`, `gh pr list --state open`, `gh pr view 5 --json state,isDraft,baseRefName,headRefName,mergeable,mergeStateStatus,statusCheckRollup` và `gh issue list --state open`. Nếu không có quyền GitHub/network, ghi rõ **chưa xác minh** thay vì khẳng định snapshot còn hiệu lực.

Khi PR/Issue đổi trạng thái hoặc quyết định được chốt, cập nhật ngày kiểm chứng và dẫn chứng trong file này trên branch công việc, đồng thời cập nhật [AI_HANDOFF](AI_HANDOFF.md).
