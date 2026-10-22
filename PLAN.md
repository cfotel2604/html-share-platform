# Kế hoạch triển khai — HTML Share Platform

**Ngày lập:** 2026-10-08

**Trạng thái:** Proposed cho release/security gates; domain và thiết kế mã chia sẻ đã Accepted ngày 2026-10-09 theo [ADR-0004](docs/adr/0004-domains-and-share-codes.md).

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
- Tạo URL chia sẻ **có thương hiệu** `https://view.ods.vn/<share-code>`; nội dung HTML thực thi trong iframe cách ly, tải từ `https://<site-id>.space-ods.cfvn.cloud/` và hỗ trợ đường dẫn tài nguyên tương đối.
- Preview thực thi trên content hostname dưới `space-ods.cfvn.cloud`, không inject HTML upload vào DOM/SSR của `ods.vn`. Link public mặc định ai có link đều mở được.
- Danh sách site cá nhân; tạo bản cập nhật giữ nguyên URL; publish/unpublish và xóa mềm.
- Lưu metadata, version và audit log (người tạo/sửa/xóa, thời điểm, hành động).
- Logging vận hành, health checks, xử lý lỗi có thông báo rõ ràng.
- Kiểm thử trên Chrome desktop, Chrome/Safari mobile và Zalo in-app browser; ghi nhận hạn chế API của từng trình duyệt.

### Ngoài phạm vi MVP

Chạy backend tùy ý của website upload (PHP, Node, Python), xử lý form server-side, xây dựng trang bằng AI, domain tùy chọn của từng nhân viên, phân tích truy cập nâng cao, mật khẩu/TTL cho link và CDN đa vùng. Các khả năng này có thể là phase 2.

## 3. Kiến trúc đề xuất

- **Dashboard/API:** Next.js + TypeScript (Route Handlers `/api/*` cùng ứng dụng tại `studio.ods.vn`), UI với Tailwind CSS. Nội bộ Docker dùng service name, chưa cần `api.ods.vn`.
- **Auth P2:** Clerk Development + Google login để lab; email allowlist do owner cấp/thu hồi, server kiểm tra quyền/role Employee/Admin. Trước production cần Clerk production instance + Google OAuth credentials riêng.
- **Database:** PostgreSQL, migrations có version.
- **Object storage:** Cloudflare R2 private cho production; MinIO legacy chỉ cho local P1, không deploy lên staging/production.
- **Public static gateway:** dịch vụ chuyên phục vụ nội dung tĩnh theo site ID + version đang active, không chạy bất kỳ mã server nào từ gói upload.
- **Branded viewer:** `view.ods.vn/<share-code>` là trang shell HTML tin cậy, không mang session/admin API; nhúng iframe sandbox từ `<site-id>.space-ods.cfvn.cloud` và cung cấp metadata Open Graph an toàn cho Zalo.
- **Proxy/TLS:** lab đã kiểm nginx + Let's Encrypt DNS-01 qua ACME-DNS; đề xuất tái sử dụng với certificate/gia hạn riêng cho production. Không bắt buộc Cloudflare proxy/Origin CA; nếu thêm CDN phải review TLS tới origin/cache riêng.
- **Dev:** Docker Compose trên máy hiện tại; **Prod ban đầu:** VPS + Docker Compose; cấu hình backup/restore ngoài phạm vi MVP theo quyết định owner.

Origin tách biệt: trang quản trị `studio.ods.vn`, link khách `view.ods.vn/<share-code>` (**chỉ shell được kiểm soát**) và origin thực thi HTML `https://<site-id>.space-ods.cfvn.cloud/`. Không bao giờ chạy raw HTML trong `studio.ods.vn/view/*`, `view.ods.vn/*` hoặc proxy raw HTML dưới URL path chung. Hostname riêng ngăn chia sẻ localStorage/service worker theo origin nhưng **không tự chặn cookie `Domain=cfvn.cloud` giữa các site**; iframe sandbox bỏ `allow-same-origin` là chế độ mặc định cho viewer và phải kiểm chứng với trình duyệt trước P4. Chế độ mở site trực tiếp/cho phép storage chưa được phê duyệt khi chưa có biện pháp cô lập cookie (ví dụ PSL đủ điều kiện).

Mã viewer ngắn đã triển khai trong Draft PR #15/Issue #14: mapping server/UNIQUE/CSPRNG, migration0003 additive, backfill và rotate/revoke; không giữ alias host ID cũ. [Kiểm chứng local](docs/validation/2026-10-09-short-viewer-links.md) đã pass; ngày22/10 [VM đã cutover web/DB](docs/LAB_HANDOFF.md), owner xác nhận khách ngoài tải iframe sau mở443 và dùng thử OK. Desktop chưa xác minh cutover. Đổi mã không thu hồi direct URL khi site còn published; unpublish/delete chặn request mới, không thu hồi tab đã tải.

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
| P6 — Hardening | Security tests, PR CI, mobile/Zalo smoke, limit/rate limit | E2E critical flows + threat cases pass; hạn chế Zalo/iframe ghi rõ |
| P7 — Release | Staging, pilot cho vài nhân viên, monitoring, rollback & runbook | Pilot được ký duyệt, rollback thử nghiệm; rủi ro không có backup/restore đã được owner chấp nhận |

### Chiến lược phân phối

Mỗi issue có một phạm vi rõ, nhánh riêng, Draft PR để ghi tiến độ và kết quả test. Chỉ merge khi gate của phase đạt. Chạy staging và pilot trước production. Không tự merge/deploy từ tài liệu này.

## 5. Quyết định owner (2026-10-08; domain cập nhật 2026-10-09) và các gate còn mở

1. **Domain / chia sẻ:** chọn `studio.ods.vn` cho dashboard, `view.ods.vn/<share-code>` cho link gửi khách và `<site-id>.space-ods.cfvn.cloud` cho origin chạy HTML; Lab tương ứng `studio-lab.ods.vn`, `view-lab.ods.vn/<share-code>`, `<site-id>.lab-space-ods.cfvn.cloud`. Quyết định mới thay `matbao.one`; viewer10base62 độc lập host ID128bit đã chạy lab VM ngày22/10, Studio/viewer có public HTTPS; tunnel chỉ là đường vận hành tùy chọn. Xem ADR-0004 và [handoff lab](docs/LAB_HANDOFF.md). Studio/viewer chỉ serve trusted shell, không render raw HTML upload trên origin quản trị.
2. **Đăng nhập:** Google qua Clerk Development cho lab; owner quản lý allowlist email, roles Employee/Admin trên server. Chuyển sang Clerk production instance và Google OAuth credentials riêng trước production.
3. **Hạ tầng:** Docker Desktop và VM lab dùng Docker Compose; VPS/Docker Compose lúc triển khai. Cloudflare R2 private vẫn là provider production; VM hiện có MinIO legacy network nội bộ theo runbook, không coi đây là gate R2 đạt hay ngoại lệ cho staging/production.
4. **Upload:** giới hạn ban đầu tối đa 20 MiB ZIP nén, 100 MiB giải nén, 500 file, đường dẫn sâu 12; yêu cầu check và chặn trước publish.
5. **Retention / soft-delete:** có cấu hình, khởi đầu đề xuất giữ tối đa 10 version cũ/site (luôn giữ active), soft-delete 30 ngày, dọn staging sau 24 giờ. **Không triển khai backup/restore trong MVP** theo quyết định owner; dữ liệu có thể mất vĩnh viễn khi hỏng/xóa.
6. **CSP/external content:** ưu tiên demo HTML tương tác, cho phép HTTPS CDN phù hợp; mặc định chặn plugin, top navigation và chức năng nhạy cảm, external API cần allowlist. Cấu hình cụ thể cần kiểm chứng Chrome/Safari/Zalo.

**Gate P4 chưa đạt:** kiểm chứng iframe sandbox (mặc định `allow-scripts` nhưng không `allow-same-origin`, không form/popups/top-navigation), CSP sandbox trên **mọi** HTML kể cả direct navigation, chặn active content types khác (SVG/XHTML...), cookie parent-domain/cookie tossing giữa public hosts, storage/service worker, module scripts/CORS, relative/root assets và hiệu quả unpublish. Viewer chỉ có trusted metadata; CSP của viewer giới hạn `frame-src` ở `https://*.space-ods.cfvn.cloud`; gateway cho phép `frame-ancestors https://view.ods.vn`, không phát/cấp auth cookies. Test bằng browser thực trước khi mở production. Nếu demo cần storage/Web APIs bị sandbox chặn, phải đưa ra thiết kế bảo mật riêng được review trước khi nới sandbox hoặc cung cấp full-page mode.

## 6. Tiêu chí hoàn thành MVP

Employee tạo site từ HTML/ZIP và nhận link `https://view.ods.vn/<share-code>`; guest mở trên điện thoại không cần tài khoản; HTML chạy trong iframe từ origin publish độc lập; JS/CSS/assets hoạt động theo mức sandbox đã công bố; Employee update giữ nguyên link và có thể unpublish; Admin giám sát/audit; kiểm thử upload, chia sẻ preview, cô lập origin/cookie và rollback pass. Không có backup/restore trong MVP.
