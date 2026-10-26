> **Phạm vi đọc26/10/2026:** Decision record về origin/sandbox; các mô tả VMviewer/per-site published hostname là topology lab cũ. A' publicWorker/path serving theo ADR-0006 và code đã nghiệm thu; isolation/sandbox invariants không nới. Proposed broader release status không là pilot đang chờ. Xem [bản đồ](../DOCUMENTATION_MAP.md) và [share contract](../SHARE_LINKS.md).

# ADR-0001: Cô lập origin cho HTML được upload

> **A' scope clarification25/10:** ADR-0006 governs current Node/PostgreSQL administration, public code-path Worker and Nodegrant preview. Trusted VMviewer/public-hostname descriptions here remain historical for the retained oldlab, not a parallel A' serving path. Isolation/sandbox/actor/grant/security invariants stay unchanged. Owner accepted38pilot; the Proposed broader release status does not imply production approval. [Current pilot-only review](../validation/2026-10-25-aprime-pilot-security.md).

- **Status:** Proposed
- **Date:** 2026-10-08
- **Updated:** 2026-10-09 — domain/link đã chốt theo [ADR-0004](0004-domains-and-share-codes.md); security/release gates còn Proposed.
- **Owners:** Project maintainers

## Context

Nhân viên tải lên HTML/CSS/JS tùy ý để người khác xem qua URL HTTPS. HTML có thể chạy JavaScript, truy cập localStorage/cookies trên origin và tải script từ mạng. Dashboard chứa session quản trị và dữ liệu về site, vì vậy cần boundary rõ ràng.

## Decision

1. Dashboard và Next.js Route Handlers `/api/*` chạy tại `studio.ods.vn`; Google Sign-In qua Clerk Development cho lab và email allowlist/role được kiểm tra server-side. URL chia sẻ có thương hiệu là `https://view.ods.vn/<share-code>`, nơi **chỉ chạy trusted viewer shell**. Không render, reverse proxy hay nhúng raw HTML upload vào cùng origin `ods.vn`.
2. Viewer nhúng iframe từ `https://<site-id>.space-ods.cfvn.cloud/` với `sandbox="allow-scripts"` nhưng **không** `allow-same-origin`, form, popup hoặc top-navigation. Gateway phục vụ **mọi HTML upload** (kể cả trang phụ) với **HTTP header** `Content-Security-Policy: sandbox allow-scripts` **kể cả khi trang được mở trực tiếp**; không dùng `<meta>` để áp CSP sandbox. Các định dạng có khả năng script không được bảo vệ bởi policy này (SVG, XHTML, XML chủ động, PDF nhúng...) phải bị chặn trước publish/direct navigation hoặc có security review riêng. Cấu hình CSP viewer `frame-src https://*.space-ods.cfvn.cloud`; gateway `frame-ancestors https://view.ods.vn`. Không chuyển session/token quản trị từ parent vào iframe, không tin `postMessage` có `origin: null`.
3. Mỗi site sử dụng ID ngẫu nhiên >=128 bits (hostname DNS hợp lệ). Một wildcard DNS record `*.space-ods.cfvn.cloud` trỏ tới cùng gateway; **không tạo DNS record mới cho từng site**. Record cụ thể đang có được ưu tiên hơn wildcard, nhưng phải kiểm kê DNS/Workers routes và các hostname đang được sử dụng trước khi bật. Reserved hostnames không được cấp làm site ID, gateway chỉ nhận host đúng mẫu và site `published` tồn tại trong DB, còn lại trả 404. Lab dùng wildcard riêng `*.lab-space-ods.cfvn.cloud`, nginx + Let's Encrypt DNS-01/ACME-DNS đã kiểm. Production cần SAN `*.space-ods.cfvn.cloud` và gia hạn riêng; không bắt buộc Cloudflare proxy/Origin CA. Record/route hiện hữu vẫn cần inventory/regression/rollback trước thay đổi.
4. **Hostname riêng chưa cô lập cookie parent-domain**: JavaScript độc hại chạy trực tiếp tại `a.space-ods.cfvn.cloud` có thể tạo cookie `Domain=cfvn.cloud`, gây ảnh hưởng đến site khác của owner tại `space-ods.cfvn.cloud` hoặc sibling hosts dưới `cfvn.cloud`, kể cả content lab/production. Chính sách `sandbox` trên HTTP response HTML là lớp bắt buộc ngăn truy cập cookie/storage trong cả chế độ iframe lẫn direct browsing; test trên trình duyệt thực trước P4. Không bật direct unrestricted mode hoặc bỏ `allow-same-origin` restriction nếu không có phương án bảo vệ thay thế đã được review (có thể cân nhắc PSL PRIVATE nếu đủ điều kiện, nhưng không được giả định được chấp thuận).
5. Dashboard dùng cookie `__Host-` host-only, `HttpOnly`, `Secure` và `SameSite` phù hợp, không gán `Domain` chung. Viewer không gửi/đòi hỏi session admin, gateway không phát Set-Cookie hoặc dùng cookie client như quyền truy cập site.
6. Gateway chỉ đọc static assets sau kiểm tra manifest/publish/version từ Cloudflare R2 private, không thực thi backend upload, không public listing hoặc credential. Preview chưa publish dùng grant TTL ngắn và phạm vi hẹp; Open Graph metadata được escape/tạo bởi server tin cậy.

## Consequences

- Dùng registrable domains `ods.vn` và `cfvn.cloud`, content namespaces `space-ods.cfvn.cloud` / `lab-space-ods.cfvn.cloud`; cần wildcard/TLS đúng mỗi môi trường, kiểm tra tác động lên những hostname hiện hữu và test cross-origin/cookie trước deploy. Chưa cấu hình DNS production trong P0.
- HTML/CSS/JS client-side và URL tài nguyên bắt đầu bằng `/` có thể chạy từ root riêng cho từng site.
- Branded URL `view.ods.vn/<share-code>` nằm trên thanh địa chỉ của khách; PR #15 đã có mã ngắn, runtime VM/owner trước cutover còn site ID dài. Iframe không cùng origin với viewer. Sandbox opaque origin có thể gây lỗi cho localStorage, ES modules, CORS/fetch, một số SPA và Web APIs; kiểm thử Chrome/Safari/Zalo và báo giới hạn rõ ràng trước P4, không tự nới sandbox.
- HTTPS không loại bỏ giới hạn của trình duyệt tích hợp Zalo hoặc cho phép server-side code.
- Hostname là public. Không dùng tính không thể đoán ID để thay thế xác thực cho dữ liệu bí mật.
- Có thể áp CSP, quotas, content policy và reporting sau khi đo compatibility; luôn giữ origin isolation dù CSP được nới cho nội dung tương tác.

## Alternatives considered

- `https://studio.ods.vn/view/<id>` trả raw HTML: loại bỏ vì cùng origin quản trị; URL đó chỉ có thể redirect về viewer tin cậy.
- `https://view.ods.vn/<id>` reverse proxy raw HTML: loại bỏ vì tất cả site upload chia sẻ origin và chung eTLD+1 với dashboard.
- `https://space-ods.cfvn.cloud/p/<id>/` trả raw HTML: các site chia sẻ origin/cookie/storage.
- Redirect `view.ods.vn/<id>` đến `<id>.space-ods.cfvn.cloud`: khách sẽ thấy domain thứ hai, có thể dùng fallback có kiểm soát khi iframe không tương thích và gate P4 pass.
- Cloudflare proxy/Origin CA như lựa chọn domain trước đây: không bắt buộc cho baseline nginx + DNS-01 đã chạy; nếu thêm proxy/CDN phải kiểm TLS tới origin và cache/unpublish. Wildcard TLS phải khớp đúng content namespace, cookie parent-domain vẫn cần sandbox.

## Validation / revisit

Trước P4, chứng minh bằng browser test rằng: các hostname/website hiện hữu dưới `cfvn.cloud` và sibling/cross-environment hosts không bị ảnh hưởng bởi wildcard; iframe và direct HTML đều nhận CSP sandbox, không đặt/đọc parent-domain cookie hoặc localStorage, không bật popup/top-navigation; không credential forwarding; TLS wildcard và `frame-ancestors` hợp lệ; root assets, scripts, CORS và link preview hoạt động trong giới hạn đã xác nhận. **ADR vẫn Proposed** cho đến khi browser/DNS gate đạt và được owner review. Xem lại nếu cần full-page mode hoặc custom domains. Domain/mã link được owner Accepted tại ADR-0004; việc đó không đóng gate P4. PR #15 triển khai mã viewer/mapping/rotation với [kiểm chứng local](../validation/2026-10-09-short-viewer-links.md), đã merge main và web lab VM đã cutover ngày22/10 theo LAB_HANDOFF; đổi mã không thu hồi direct URL khi published. #10 vẫn theo dõi security/release gates, ADR giữ Proposed.
