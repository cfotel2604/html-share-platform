# ADR-0003: Server RBAC và preview capability theo hostname

- Status: Proposed; implementation lab trong PR #13, chờ security/release review. Clerk Development đã bật; owner xác nhận Admin/Employee login thật. Domain được chốt tại [ADR-0004](0004-domains-and-share-codes.md).
- Date: 2026-10-09
- Refs: #8, #10; [ADR-0001](0001-public-site-origin-isolation.md)

## Decision

API xác minh Clerk session token trực tiếp trong route, chỉ nhận session token, dùng authorized parties từ trusted origins. Không match API upload trong Next proxy: Next 16 tự clone/buffer body khi có proxy và có thể cắt body ở 10 MiB trước bộ đếm #9. Proxy chỉ xử lý trusted UI/viewer/đăng nhập; quyền dữ liệu luôn ở server services. Backend kiểm tra session status online mỗi request để revoke có hiệu lực ngay; verified primary Google email phải có allowlist active. Role/metadata do client/JWT gửi không cấp quyền.

Allowlist, user disabled và Employee/Admin nằm trong PostgreSQL. Policy update qua operator CLI đọc stdin, có audit. Các mutation khóa user/policy bằng FOR SHARE, khóa site khi upload, rồi check role/ownership mới trước ingest/storage. Employee chỉ tác động site của mình; Admin có scope mọi site, mọi mutation/audit ghi actor thật. Không chuyển ownership site cũ tự động khi đổi auth provider.

Hostname public `<site-id>.space-ods.cfvn.cloud` phục vụ root assets, chỉ đọc manifest bất biến đã xác nhận trong private storage. Kiểm tra size/hash trước trả bytes; mọi HTML kể cả trang phụ/direct có HTTP CSP sandbox allow-scripts và không allow-same-origin. Gateway không sử dụng/phát auth cookies, CORS `*` chỉ đọc asset capability/public, không credentials. Registrable domain được kiểm tra bằng PSL (bao gồm private suffixes), fail closed khi UI/viewer và upload chung eTLD+1.

Preview riêng A' dùng hostname `p-<site-id>--<grant>.space-ods.cfvn.cloud` (lab tương ứng): tiền tố `p-` + site ID 32 hex + `--` + grant base32 26 ký tự = **62**, dưới giới hạn DNS label 63. Token entropy 128 bit; DB chỉ lưu SHA-256, scope site + immutable version + actor, TTL 3 phút. Mỗi asset request kiểm expiry, actor/policy active và ownership/Admin. Không cookie, query token, redirect grant hoặc truyền session quản trị vào HTML. Root assets/modules hoạt động mà không rewrite HTML. Hostname grant phải được redaction khỏi access/DNS/log pipeline ở staging; không bật logging raw Host/URL. Đây là bearer capability, không link public lâu dài.

Issue54 làm rõ namespace A' để giữ các link lab cũ theo yêu cầu owner mà không đưa chúng vào gateway A'. Hostname cũ không tiền tố thuộc runtime lab cũ, không là fallback của preview A'. Dùng map nginx với hai upstream loopback cố định: đúng grammar `p-`→4110, legacy→4100; không thử legacy sau khi A' trả404. Wildcard DNS/TLS hiện có vẫn phủ một label62ký tự; không thêm domain, DNS/UFW hoặc giảm sandbox/TTL/entropy. Đây là chuẩn bị source, chưa phải public preview hay release10PASS. [Hồ sơ54](../validation/2026-10-25-preview-namespace.md).

Published HTML chỉ cho iframe từ viewer; preview grant chỉ cho iframe từ Studio. Viewer chỉ trusted metadata và iframe, không Clerk provider/session xử lý. PR #15 resolve `view.ods.vn/<share-code>` và `/view/<share-code>` redirect về viewer khi cấu hình host riêng. Loopback lab có thể giữ trusted shell trên web bằng mã ngắn; alias host ID 32 hex bị tắt. Web lab VM đã cutover viewer10base62 ngày22/10; #13/#15 đã merge main, #8 CLOSED cho lab/P2. Security/release gates #10 và trạng thái Proposed vẫn giữ.

## Consequences and limits

Migration 0002 additive; không sửa 0001. Legacy version chưa manifest bị từ chối đến khi backfill đọc asset, kiểm fingerprint gốc rồi ghi metadata; không sửa upload/site pointer. Rollback image cũ được phép giữ schema additive.

Clerk BAPI mỗi request thêm latency/quota; provider failure fail closed, không fallback demo. Local demo chỉ exact loopback trusted origins. Public deployment cần Clerk production + Google OAuth, host-only/cookie/azp kiểm chứng với instance thật; không coi cookie của SDK là app-owned `__Host-` cookie.

No-store và trạng thái được kiểm mỗi request; unpublish/expiry không thu hồi HTML đã tải trong tab. CSP chặn workers, frames/forms/popups/parent navigation và storage; HTTPS classic CDN được phép, external API chưa allowlist nên bị chặn. HTML tự điều hướng tab trực tiếp không đồng nghĩa có thể truy cập parent cookie. Cache/CDN, rate/concurrency, expiry-row cleanup và orphan lifecycle vẫn cần P5/P6.

ADR-0001 giữ Proposed. Local self-signed TLS/Chrome probes không xác nhận DNS inventory/website regression, private R2 IAM hay Safari/Zalo. [Nghiệm thu VM](../validation/2026-10-09-lab-domain-tls.md) bổ sung content wildcard TLS thật bằng Let's Encrypt/nginx; không còn bắt buộc Cloudflare Full (strict) cho baseline này. Ngày22/10 [web VM đã cutover #15/DB0003](../LAB_HANDOFF.md), Studio/viewer public HTTPS, owner xác nhận khách ngoài tải iframe sau mở443. Việc đó không tự chuyển ADR sang Accepted hoặc đóng các release gates.
