# ADR-0004: Domain Studio/viewer/content và mã chia sẻ độc lập

- **Status:** Accepted — quyết định domain và thiết kế link được owner chốt; không phải phê duyệt release.
- **Date:** 2026-10-09
- **Refs:** #8, #10, #14, PR #13/#15; [ADR-0001](0001-public-site-origin-isolation.md), [ADR-0003](0003-server-rbac-and-preview-capabilities.md).
- **Supersedes:** lựa chọn `matbao.one` và yêu cầu Cloudflare Edge/Origin CA bắt buộc trong kế hoạch domain trước đây; giữ nguyên các boundary bảo mật.

## Decision

| Vai trò | Production | Lab VM |
| --- | --- | --- |
| Studio: dashboard, API, đăng nhập | `https://studio.ods.vn` | `https://studio-lab.ods.vn` |
| Link gửi khách: trusted viewer | `https://view.ods.vn/<share-code>` | `https://view-lab.ods.vn/<share-code>` |
| Origin chạy HTML upload | `https://<host-id>.space-ods.cfvn.cloud/` | `https://<host-id>.lab-space-ods.cfvn.cloud/` |

Studio/viewer thuộc registrable domain `ods.vn`; content thuộc `cfvn.cloud`. Backend kiểm tra bằng PSL, không chỉ so chuỗi suffix. Viewer chỉ serve shell tin cậy; raw HTML không được chạy trên Studio/viewer. Mọi HTML upload, kể cả mở trực tiếp/trang phụ, giữ HTTP CSP `sandbox allow-scripts`; iframe không có `allow-same-origin`. Không chuyển cookie/token quản trị sang gateway.

Lab và production content vẫn chung parent `cfvn.cloud`. Wildcard và hostname riêng không ngăn cookie `Domain=cfvn.cloud`; browser gate phải kiểm sibling hosts, các website hiện hữu và hai môi trường. Không nới sandbox để sửa compatibility.

### Hai loại mã

- **Host ID:** giữ site ID hiện tại, 128 bit ngẫu nhiên, 32 ký tự hex lowercase; dùng trong hostname, ownership và immutable storage. Không đổi ID hoặc di chuyển dữ liệu khi đổi mã viewer.
- **Share code:** chốt thiết kế 10 ký tự base62, phân biệt hoa/thường, sinh bằng CSPRNG với phân phối đều (khoảng 59,5 bit). Server ánh xạ mã sang site; DB có UNIQUE constraint và retry khi collision. Không dùng counter, cắt host ID hoặc random không mật mã.
- Viewer/API/UI lấy link canonical từ server. Schema/migration mới phải additive; không sửa migration đã áp dụng. Kiểm authorization, published state, collision, link rotation và rate limiting/enumeration trước release tính năng.
- Update version giữ share code hiện tại; cấp/đổi/thu hồi mã phải kiểm Employee owner-only/Admin phía server và ghi audit.
- Đổi/revoke mã chỉ làm link viewer cũ không còn resolve. Khi triển khai rotation, các alias viewer theo host ID phải bị tắt hoặc có chính sách migration hữu hạn; không giữ đường dẫn bypass lâu dài.
- Direct URL vẫn truy cập được khi site còn published. Muốn chặn request nội dung mới phải unpublish/delete; không thu hồi được nội dung đã tải. Rotation host ID là thay đổi riêng cần thiết kế/review. Mã ngẫu nhiên không thay thế authentication cho nội dung bí mật.

**Trạng thái implementation:** PR #15/Issue #14 triển khai share code/mapping/rotate/revoke/reissue, migration0003/backfill và alias host ID404. [Kiểm chứng local](../validation/2026-10-09-short-viewer-links.md) pass. Ngày22/10 [web VM đã chạy fixed runtime dc7560e và DB0003](../LAB_HANDOFF.md); owner xác nhận bên ngoài tải iframe sau mở443 và dùng thử lab OK. Desktop chưa xác minh cutover, production chưa triển khai; bảng domain là quyết định cấu hình, không phải release approval.

Runtime hỗ trợ domain mới qua cấu hình; default trong `origin-config.mjs` vẫn là domain cũ, còn `.env.example` là loopback lab. Khi triển khai phải đặt PUBLIC_SITE_DOMAIN rõ theo môi trường; PR #15 không đổi default domain hoặc redeploy owner.

### DNS/TLS

Mỗi môi trường dùng wildcard riêng `*.space-ods.cfvn.cloud` / `*.lab-space-ods.cfvn.cloud`, không tạo record từng site. Kiểm kê record/route/reserved hosts, không ghi đè website hiện hữu; gateway chỉ nhận host hợp lệ và site/grant còn hiệu lực. Preview `<host-id>--<grant>` giữ label 60 ký tự.

Lab đã chạy nginx hiện hữu + Let's Encrypt DNS-01 qua ACME-DNS, không cần Cloudflare proxy/Origin CA. Baseline đề xuất cho production là tái sử dụng cơ chế này với chứng chỉ/cấu hình/gia hạn riêng, kiểm chứng trước triển khai. Chứng chỉ phải bao phủ đúng wildcard mỗi môi trường; `*.cfvn.cloud` không bao phủ các content host sâu này. Nếu bổ sung CDN/proxy, review TLS tới origin và cache/unpublish riêng.

## Configuration và chuyển tiếp

Effective production configuration dự kiến:

```dotenv
AUTH_MODE=clerk
STUDIO_PUBLIC_ORIGIN=https://studio.ods.vn
AUTH_TRUSTED_ORIGINS=https://studio.ods.vn
VIEWER_PUBLIC_ORIGIN=https://view.ods.vn
GATEWAY_MODE=hostname
PUBLIC_SITE_DOMAIN=space-ods.cfvn.cloud
PUBLIC_SITE_SCHEME=https
PUBLIC_SITE_PORT=
GATEWAY_FRAME_SOURCE=https://*.space-ods.cfvn.cloud
GATEWAY_VIEWER_ORIGIN=https://view.ods.vn
GATEWAY_PREVIEW_ORIGIN=https://studio.ods.vn
```

Không ghi Clerk/S3 secrets vào tài liệu. Compose security overlay hiện lấy public port từ `GATEWAY_PORT`; chỉ đặt `PUBLIC_SITE_PORT=` trong env chưa đủ. Cần overlay cuối ghi đè `web.environment.PUBLIC_SITE_PORT` và `gateway.environment.PUBLIC_SITE_PORT` bằng chuỗi rỗng cho HTTPS 443, giữ gateway nội bộ loopback 4100. Xem [SECURITY_LAB](../SECURITY_LAB.md).

Ngày 2026-10-09, VM vẫn dùng Studio/viewer qua SSH tunnel `http://127.0.0.1:3100`, `VIEWER_PUBLIC_ORIGIN` rỗng và gateway frame-ancestors là loopback. `studio-lab.ods.vn` / `view-lab.ods.vn` là đích cấu hình đã chốt; chưa xác minh public end-to-end. Chỉ chuyển trusted origins/frame ancestors sau khi vhost/DNS/TLS và Clerk redirect đã kiểm, không thêm `*` để né lỗi iframe/CSRF.

Snapshot09/10 trên là lịch sử: ngày22/10 trusted hosts đã public HTTPS, content direct VM/nginx với public443 do owner mở. [LAB_HANDOFF](../LAB_HANDOFF.md) ghi env mẫu, overlays/image pin và phạm vi bằng chứng; không thay quyết định domain hoặc các boundary bảo mật.

## Evidence và gates còn lại

[Nghiệm thu lab](../validation/2026-10-09-lab-domain-tls.md) ghi riêng owner-confirmed và kiểm tra độc lập: Employee login thành công; direct HTTPS 200/sandbox/no-store/no cookie, unknown host 404, wildcard certificate hợp lệ, loopback ports và timer active.

ADR-0001/0003 giữ Proposed cho security/release review. #10 còn mở: trusted viewer domain thật + browser cookie boundary/mobile/Zalo, DNS inventory/regression/rollback, log redaction toàn pipeline, private R2/IAM/cleanup, production Clerk/OAuth và staging/pilot. VM hiện dùng MinIO legacy nội bộ; đây là hiện trạng lab, không thay quyết định R2 hay mở rộng ngoại lệ legacy sang staging/production.
