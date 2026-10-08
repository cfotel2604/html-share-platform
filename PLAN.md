# Kế hoạch triển khai — HTML Share Platform

**Ngày lập:** 2026-10-08

**Trạng thái:** Proposed — đang review qua Draft PR

**Mô hình truy cập:** A — nhân viên có tài khoản được upload/quản lý; người có link xem công khai, không cần đăng nhập.

## 1. Mục tiêu

Biến một tệp HTML hoặc một website tĩnh đóng gói ZIP thành URL HTTPS ổn định để chia sẻ qua Zalo, Messenger, email và trình duyệt mobile. Nhân viên có thể xem trước, cập nhật phiên bản nhưng giữ nguyên URL, hoặc vô hiệu hóa nội dung. JavaScript do người upload tạo được chạy trong trình duyệt người xem, vì vậy cô lập origin là yêu cầu thiết kế cốt lõi.

### Người dùng và quyền

| Vai trò | Khả năng |
| --- | --- |
| Guest | Mở URL công khai (nếu nội dung đang published); không thấy dashboard |
| Employee | Đăng nhập; tạo, xem, cập nhật và tắt các site mình sở hữu |
| Admin | Quản lý người dùng, chính sách và mọi site; xem audit log |

Mọi đường dẫn public được coi là **công khai với bất kỳ ai có link**. Không đưa dữ liệu bí mật, token hoặc thông tin định danh nhạy cảm vào file upload.

## 2. MVP (in scope)

- Đăng nhập nhân viên và phân quyền Employee/Admin; khóa API upload và quản trị.
- Upload file `.html` hoặc ZIP chứa `index.html` + tài nguyên tĩnh; kiểm tra cấu trúc, định dạng, giới hạn kích thước và giải nén an toàn.
- Tạo URL HTTPS public có định danh khó đoán; hoạt động với đường dẫn tài nguyên tương đối.
- Preview thực thi trên domain publish, tách biệt hoàn toàn với dashboard.
- Danh sách site cá nhân; tạo bản cập nhật giữ nguyên URL; publish/unpublish và xóa mềm.
- Lưu metadata, version và audit log (người tạo/sửa/xóa, thời điểm, hành động).
- Logging vận hành, health checks, xử lý lỗi có thông báo rõ ràng.
- Kiểm thử trên Chrome desktop, Chrome/Safari mobile và Zalo in-app browser; ghi nhận hạn chế API của từng trình duyệt.

### Ngoài phạm vi MVP

Chạy backend tùy ý của website upload (PHP, Node, Python), xử lý form server-side, xây dựng trang bằng AI, domain tùy chọn của từng nhân viên, phân tích truy cập nâng cao, mật khẩu/TTL cho link và CDN đa vùng. Các khả năng này có thể là phase 2.

## 3. Kiến trúc đề xuất

- **Dashboard/API:** Next.js + TypeScript (server-side API), UI với Tailwind CSS.
- **Database:** PostgreSQL, migrations có version.
- **Object storage:** S3 API (MinIO local/staging, S3-compatible production).
- **Public static gateway:** dịch vụ chuyên phục vụ nội dung tĩnh theo site ID + version đang active, không chạy bất kỳ mã server nào từ gói upload.
- **Proxy/TLS:** Caddy hoặc Nginx và chứng chỉ HTTPS.
- **Dev:** Docker Compose; **Prod:** lựa chọn hạ tầng sau khi chốt DNS, secrets, persistence, backup.

Origin tách biệt: ví dụ `admin.example.com` cho nhân viên và `<random-id>.pages-example.net` cho site công khai; `pages-example.net` phải là registrable domain riêng, không dùng subdomain cùng eTLD+1 với dashboard. Ví dụ chỉ minh họa, chưa cấu hình DNS. Giữ mỗi site trên một hostname riêng để cô lập localStorage, cookies và service worker giữa các site.

Xem [kiến trúc và luồng dữ liệu](docs/ARCHITECTURE.md), [ADR-0001](docs/adr/0001-public-site-origin-isolation.md) và [quy trình GitHub](docs/WORKFLOW.md).

## 4. Lộ trình theo GitHub Issues / PRs

| Phase | Deliverable | Acceptance gate |
| --- | --- | --- |
| P0 — Planning | PLAN, ADR, hướng dẫn agent, Issue/PR templates, GitHub workflow | Tài liệu review qua Draft PR; quyết định chưa chốt được đánh dấu |
| P1 — Foundation | Next.js/TS, migrations, Compose, basic CI, env example, health checks | `docker compose up` chạy được; lint/typecheck/build pass |
| P2 — Auth/RBAC | Employee/Admin, session cookies an toàn, API authorization, audit events | Không có quyền không thể upload/sửa/xóa; test RBAC pass |
| P3 — Ingest | HTML/ZIP, kiểm tra MIME/size/count/path, staging object, version metadata | Bộ case ZIP traversal/zip bomb/symlink/missing index bị từ chối |
| P4 — HTTPS serving | Static gateway, wildcard DNS/TLS, host isolation, public URL, preview | HTML/CSS/JS/image load đúng; cross-origin isolation test pass |
| P5 — Site lifecycle | Quản lý site, update atomic, unpublish, soft delete, audit log | Cập nhật giữ URL, không lộ bản partial; disable chặn nội dung |
| P6 — Hardening | Security tests, PR CI, mobile/Zalo smoke, limit/rate limit, backups | E2E critical flows + threat cases pass; hạn chế Zalo ghi rõ |
| P7 — Release | Staging, pilot cho vài nhân viên, monitoring, rollback & runbook | Pilot được ký duyệt, kiểm tra restore, rollback thử nghiệm |

### Chiến lược phân phối

Mỗi issue có một phạm vi rõ, nhánh riêng, Draft PR để ghi tiến độ và kết quả test. Chỉ merge khi gate của phase đạt. Chạy staging và pilot trước production. Không tự merge/deploy từ tài liệu này.

## 5. Các quyết định đang mở

1. **Domain:** hai registrable domain được tổ chức kiểm soát, wildcard DNS/cert cho public site; phải chốt trước P4.
2. **Đăng nhập:** SSO công ty (ưu tiên nếu có OIDC) hay tài khoản nội bộ cho MVP; quyết định trước P2.
3. **Hạ tầng:** VPS/Docker Compose hay cluster sẵn có, chọn nhà cung cấp S3; trước P7.
4. **Giới hạn upload ban đầu (đề xuất):** 20 MiB ZIP nén, 100 MiB giải nén, tối đa 500 files, max depth 12; cần đo theo nhu cầu thực tế.
5. **Chính sách lưu trữ:** retention cho version và soft-delete, backup và quyền admin.
6. **Nhu cầu kết nối ngoài:** một số trang cần external API/JS CDN, phải xác định để cấu hình CSP và kiểm thử.

## 6. Tiêu chí hoàn thành MVP

Employee tạo site từ HTML/ZIP và nhận link HTTPS; guest mở ngay trên điện thoại không cần tài khoản; JS/CSS/assets tải đúng theo khả năng trình duyệt; Employee update giữ nguyên link và có thể unpublish; Admin giám sát/audit; kiểm thử bảo mật upload và phân tách origin pass; phục hồi từ backup được kiểm chứng trên staging.
