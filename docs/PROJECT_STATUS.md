# Project status — HTML Share Platform

> Snapshot **2026-10-09 (Asia/Saigon)**, đã đối chiếu GitHub, CI và Docker local. Đọc cùng [AI_HANDOFF](AI_HANDOFF.md), [PLAN](../PLAN.md) và [AGENTS](../AGENTS.md). Markdown không thay GitHub live.

## Tiến độ đã kiểm chứng

| Hạng mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| P0/P1/handoff | PR #2/#4/#7 merged; origin/main `78cb7ca` | Git log và GitHub |
| Local MVP | PR #5 Ready, head `235cc62`, base main; chưa merge | [PR #5](https://github.com/cfotel2604/html-share-platform/pull/5) |
| Upload #9 | Findings đã sửa; integration regression vẫn pass sau auth mới | [Validation #9](validation/2026-10-09-upload-hardening.md) |
| Studio UI | PR #12 Ready, head `4ab546a`, base codex/local-mvp; chưa merge | [PR #12](https://github.com/cfotel2604/html-share-platform/pull/12) |
| Auth/RBAC #8 | Clerk/session, verified Google email, allowlist, Employee/Admin, revoke và CSRF; chưa smoke Google thật | [Draft PR #13](https://github.com/cfotel2604/html-share-platform/pull/13) |
| Origin #10 | Hostname, manifest/digest, HTTP/iframe sandbox, trusted viewer và private preview; Chrome local pass | [Validation](validation/2026-10-09-auth-origin-gates.md); DNS/TLS/R2/Safari/Zalo còn mở |
| Kiểm thử | 79 unit tests; lint/typecheck/build; 9 nhóm upload + 6 nhóm DB/S3 integration; CI cả 3 jobs SUCCESS tại `5ab1807` | [application](https://github.com/cfotel2604/html-share-platform/actions/runs/37890933623), [docs](https://github.com/cfotel2604/html-share-platform/actions/runs/37890933664), [security](https://github.com/cfotel2604/html-share-platform/actions/runs/37890933672) |
| Docker owner | Web/gateway healthy, image html-share-studio:security-613f2b7; AUTH_MODE=local-demo | http://127.0.0.1:3100; [deploy/rollback](validation/2026-10-09-auth-origin-gates.md) |
| Preservation | 9 site trước deploy giữ metadata; DB/MinIO IDs/mounts không đổi; 17 legacy versions backfill manifest | 6 published serve sandbox/no-store, 3 private 404; thêm 1 fixture để unpublished |
| Tracking | #1/#3/#6 CLOSED; #8/#9/#10/#11 OPEN | #9/#11 chờ review/merge; #8/#10 còn gate bên ngoài |

Owner đã giao #8/#10 và cập nhật Docker Desktop local. Chỉ web/gateway recreate; migration **0002 bổ sung**, không sửa 0001 hoặc storage bytes/site pointers. Checkout owner `b3f8119`, `.env` và dữ liệu giữ nguyên; foundation project cổng 3000 không đổi. Không sửa main, merge PR, đổi DNS hoặc deploy production.

## Kết quả và giới hạn

API kiểm session server, allowlist/role DB; mutation yêu cầu exact Origin/Host. Ownership trước ingest và fresh actor/role dưới transaction locks. Clerk không fallback demo; online session revoke được kiểm mỗi request, provider lỗi fail closed. Unit dùng SDK/JWT RS256 thật với provider fixtures và integration dùng PostgreSQL/MinIO thật; **chưa có Google end-to-end**. Owner có Clerk Development, sẽ đặt keys và gửi email/role; tại deploy chưa nhận inputs.

Gateway chỉ serve manifest bất biến sau kiểm size/SHA-256, hostname và trạng thái. Private preview: grant 128-bit, DB hash, actor/site/version scope, TTL 3 phút. HTTP sandbox mọi HTML, iframe không allow-same-origin; viewer host riêng không mở API/sign-in/preview. Chrome 154 HTTPS `.test` chứng minh cookie/storage/workers/popup/top navigation bị chặn, root CSS/classic/modules/fetch/HTTPS CDN hoạt động. Self-signed/DNS override chỉ local, không thay chứng cứ domain/TLS thật. Owner dùng `*.uploads.localhost:4100`, viewer `/view/<id>` giữ nguyên.

Regression #9 giữ cap stream 22 MiB trước parser, file 20 MiB, denied zero writes, rollback/cleanup và hostile ZIP tests. API auth dùng Clerk SDK trực tiếp; Next proxy không chạy API để tránh body buffering/truncation làm hỏng early 413. COMMIT unknown giữ objects/trả 503; cleanup failure/crash còn cần reconciliation, lifecycle/rate/concurrency P5/P6 chưa triển khai. `no-store` chặn request mới sau unpublish, không thu hồi tab đã tải.

## Quyết định owner

- Studio ODS blue, sáng/tối; presentation → workflow → typed HTTP adapter → backend. ESLint enforce ADR-0002; Next cùng web container lab, gateway riêng, có thể thay UI sau.
- Dashboard studio.ods.vn, Google/Clerk Development + allowlist server; viewer view.ods.vn/site-id trusted shell; HTML site-id.matbao.one với sandbox. ADR-0001/0003 vẫn Proposed; chưa đổi DNS/TLS.
- Production R2 private; MinIO legacy chỉ local. Docker/VPS giai đoạn đầu. ZIP 20 MiB nén / 100 MiB giải nén / 500 files / depth 12 / 1000 entries.
- Retention configurable; backup/restore ngoài MVP theo owner.

## Việc tiếp theo

1. Owner đặt CLERK_PUBLISHABLE_KEY/CLERK_SECRET_KEY vào `.env` checkout **html-share-platform-local-mvp** và gửi email kèm role Admin/Employee. Operator cấp allowlist, bật Clerk rồi smoke Google/deny/revoke/logout theo [SECURITY_LAB](SECURITY_LAB.md); không gửi key vào chat/Issue. Giữ demo loopback khi chưa đủ cấu hình.
2. Review chain #5 → #12 → #13; #13 Draft, base codex/11-studio-ui. Sau dependency merge đổi base/check CI; chưa được giao merge tự động. #8/#10 chưa đóng.
3. #10: read-only DNS/Workers/reserved inventory, staging TLS/Origin CA, R2 IAM/cleanup, preview hostname log redaction, Safari/iOS/Android/Zalo và owner/security review ADR-0001; staging/pilot trước production. P5/P6 lifecycle/orphan/rate/concurrency còn mở.

## Kiểm chứng lại

Fetch origin --prune, log origin/main, gh pr view 5/12/13 với state/isDraft/headRefOid/mergeable/statusCheckRollup, gh issue list. Runtime revision `613f2b77ac00179f33d6bf13c08007a87b910963`; test/CI fix `5ab1807` không đổi runtime. Các lần up owner phải giữ **compose.security.yaml và SECURITY_IMAGE đúng tag**, không build checkout owner cũ. Bàn giao trong branch được giao, không main.
