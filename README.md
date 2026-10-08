# HTML Share Platform

Nền tảng nội bộ để nhân viên tải lên HTML/CSS/JavaScript hoặc website tĩnh đóng gói ZIP và nhận **URL HTTPS công khai** để chia sẻ qua Zalo, Messenger, email hay trình duyệt mobile.

**Mô hình A:** Employee/Admin cần đăng nhập để quản lý và upload; người xem đường dẫn public không cần đăng nhập. Hệ thống chỉ phục vụ static assets; không chạy mã backend được upload.

## Trạng thái

**P0 — Planning (Draft PR):** repository đã được khởi tạo, tài liệu và GitHub workflow đang review. Chưa có ứng dụng triển khai hay domain production.

- [PLAN và roadmap P0–P7](PLAN.md)
- [Kiến trúc và luồng upload/publish](docs/ARCHITECTURE.md)
- [ADR-0001 — cô lập origin HTML được upload](docs/adr/0001-public-site-origin-isolation.md)
- [Quy trình GitHub Issue → Branch → Draft PR → Review](docs/WORKFLOW.md)
- [Hướng dẫn cho coding agents](AGENTS.md)

## Nguyên tắc bảo mật

Dashboard và các site public chạy trên **hai registrable domain riêng**; mỗi site trên hostname publish riêng, tách session/cookies/storage và service worker. Đường dẫn công khai là public với người có link; chỉ upload nội dung được phép chia sẻ.

## Kiểm tra tài liệu

Yêu cầu Python 3:

```sh
python scripts/check_docs.py
```

GitHub Actions chạy kiểm tra trên pull request và push vào `main`. Các giai đoạn tiếp theo bổ sung application CI (lint, typecheck, tests, build).

YAML workflow và Issue templates được parse bằng `scripts/check_yaml.py` (yêu cầu `PyYAML==6.0.2`), cùng với kiểm tra tài liệu Markdown. Check YAML sẽ fail nếu cú pháp sai hoặc top-level không phải mapping.

## Quyết định triển khai MVP (owner, 2026-10-08)

- Dashboard và Next.js API: `studio.ods.vn` (`/api/*` cùng container), đăng nhập Google qua Clerk Development khi lab và email allowlist server-side.
- Link gửi khách: `https://view.ods.vn/<site-id>` chỉ hiển thị viewer shell tin cậy, nhúng HTML từ `https://<site-id>.matbao.one/` trong iframe sandbox. HTTP response HTML upload cũng phải bật CSP sandbox ở chế độ mở trực tiếp.
- Một DNS wildcard `*.matbao.one` có thể trỏ mọi site hợp lệ về gateway; tạo site bằng ID trong database, không tự tạo DNS record cho từng site. Named records hiện có của `matbao.one` ưu tiên hơn wildcard nhưng phải kiểm kê trước P4; chưa đổi DNS production.
- Object storage private Cloudflare R2; VPS/Docker Compose khi triển khai, lab trên PC. Quota ZIP 20 MiB, giải nén 100 MiB, tối đa 500 file, depth 12. Retention configurable; không làm backup/restore trong MVP theo yêu cầu owner.

Cookie parent-domain `matbao.one` và tính tương thích iframe/opaque-origin trên mobile/Zalo còn là P4 security gates bắt buộc. Xem [PLAN](PLAN.md) và [ADR-0001](docs/adr/0001-public-site-origin-isolation.md).

## Làm việc với GitHub

Tạo Issue, branch theo phạm vi nhỏ, mở Draft PR và ghi rõ vấn đề, thay đổi, kết quả kiểm thử, các điểm còn mở. Quyết định kiến trúc được lưu dưới `docs/adr/` thay vì chỉ nằm trong chat.
