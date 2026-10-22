# Lab VM: domain và nghiệm thu TLS — 2026-10-09

Refs #8, #10, [Draft PR #13](https://github.com/cfotel2604/html-share-platform/pull/13); [domain decision ADR-0004](../adr/0004-domains-and-share-codes.md).

## Nguồn và phạm vi

Owner cung cấp runbook vận hành ngoài repository `RUNBOOK_LAB_VM_TLS_ACME_DNS.vi.md`, xác nhận tự nghiệm thu thành công mục 10 và Google login Employee. Runbook SHA-256 lúc đọc: `b84db8282d6bd908532b261e661bde88d6400da518cb0eb87352282808993f6e`. Bản gốc giữ nguyên trong workspace tài liệu vận hành; ghi chép này lưu kết quả và quyết định trong Git, không sao chép secrets hay dữ liệu upload.

Agent kiểm tra HTTPS trực tiếp từ máy Windows với xác minh certificate bình thường, không `-k`/bypass; SSH host `lab-b` chỉ đọc cấu hình được lọc, trạng thái container/nginx/timer. Không in HTML, env đầy đủ, session, private key, ACME account hay log thô; không đổi DNS, deploy, reload hoặc xóa dữ liệu.

## Owner-confirmed

- Google Admin đăng nhập/thấy danh sách đã xác nhận phiên trước; Google Employee đăng nhập thành công được owner xác nhận ngày 2026-10-09.
- Mục 10 runbook: wildcard TLS, upload/direct response, link HTTPS không port 4100, tunneled viewer/iframe, POST denial, application port binding, access-log hostname count, website nginx hiện hữu và lịch gia hạn.
- Chưa suy ra Employee ownership/mutations, deny/revoke/logout session thật hoặc public viewer domain end-to-end từ việc đăng nhập thành công.

## Kiểm tra độc lập

| Kiểm tra | Kết quả |
| --- | --- |
| GET direct URL do owner cung cấp tại `*.lab-space-ods.cfvn.cloud` | HTTP 200; `text/html; charset=utf-8`; body được bỏ, không ghi vào chứng cứ |
| TLS peer | Authorized; issuer Let's Encrypt; SAN `DNS:*.lab-space-ods.cfvn.cloud`; hết hạn 2027-01-07 10:55:05 UTC |
| HTML response | `sandbox allow-scripts`; `worker-src/frame-src/object-src/form-action 'none'`; `Cache-Control: no-store`; không Set-Cookie |
| Frame ancestors hiện tại | `http://127.0.0.1:3100` — tương ứng tunnel, chưa phải `view-lab.ods.vn` |
| Host 32 hex không tồn tại | HTTPS/TLS authorized; HTTP 404, no-store, không cookie |
| VM source | `/opt/hsp/src`, branch `codex/8-10-auth-origin-gates`, HEAD `417c50dcfdd30c6ec5b387b43b6fb61b5bcc2661`; giữ file untracked `compose.lab.yaml` |
| VM runtime | Project `hsp-lab`; web/gateway healthy; image `html-share-studio:security-417c50d`, image ID `sha256:9d4b698d598daa34dc5a21e05b94e4250fa58425d26856635f343b0bf13fc39c` |
| App/storage ports | Web 127.0.0.1:3100, gateway 127.0.0.1:4100; PostgreSQL/MinIO không publish host port; không phải kết luận cho mọi service khác trên VM |
| Effective domain config | Hostname mode, lab content domain, HTTPS, public port rỗng ở cả web/gateway; `AUTH_MODE=clerk`; viewer origin rỗng; trusted auth/iframe origin loopback |
| nginx | `nginx -t` PASS; proxy tới loopback4100, giữ Host, xóa Cookie/Authorization và ẩn Set-Cookie |
| Logging | Lab access format không Host/query; error log level crit. Chưa kiểm pipeline DNS/error/analytics/collector hoặc chứng minh grant redaction dưới lỗi |
| Renewal | `lab-space-ods-renew.timer` active, daily, persistent, randomized 1h; script dùng ACME-DNS, renew 30 ngày, nginx -t trước reload. Chưa chạy ép renewal/failure drill |

Không đánh đồng VM image này với image Docker Desktop `security-613f2b7`. Kiểm tra chỉ đọc không rebuild/recreate bất kỳ stack nào.

## Đối chiếu runbook

nginx hiện hữu + lego/ACME-DNS là baseline lab đã chạy; không cần mở thêm Traefik tranh cổng 80/443. Delegation DNS-01 và wildcard phù hợp [tài liệu Let's Encrypt](https://letsencrypt.org/docs/challenge-types/). Production dùng wildcard `*.space-ods.cfvn.cloud` phải có certificate/renewal riêng; không dùng certificate lab cho production.

Runbook override public port rỗng là cần thiết với compose.security.yaml hiện tại. Studio/viewer giữ tunnel cho đến khi cấu hình các hostname lab chính thức và kiểm Clerk/CSRF/frame-ancestors.

Access-log không Host/query là bước hữu ích; kiểm một file có count 0 chưa chứng minh toàn pipeline không lộ preview bearer hostname. Cần review error log (crit vẫn có thể có sự kiện), DNS logs, metrics và forwarded logs; `$uri` còn giữ đường dẫn nên thiết kế mã viewer phải cân nhắc log/referrer. Xem [nginx log format](https://nginx.org/en/docs/http/ngx_http_log_module.html).

MinIO legacy đang chạy trên VM và chỉ trong network Docker, là hiện trạng lab theo runbook. Không dùng nghiệm thu TLS để coi private R2/IAM gate đạt hoặc chấp thuận legacy image cho staging/pilot/production.

## Kiểm tra mốc tài liệu

`python scripts/check_docs.py`, `python scripts/check_yaml.py` và `git diff --check` PASS. Kiểm thêm 64 local links trong 11 Markdown files thay đổi/bổ sung (gồm ADR và validation ngoài danh sách mặc định của checker) PASS. Gọi `publicOriginConfig` hiện tại với cấu hình production và lab mới đều PASS, HTTPS/public port rỗng; không cần nới PSL boundary. Chỉ đổi tài liệu, không chạy lại suite application/integration local hay thay runtime.

## Tiếp theo

1. Cấu hình/kiểm trusted `studio-lab.ods.vn`, `view-lab.ods.vn` và Clerk redirects; chạy browser direct/iframe/preview trên domain thật, sibling/cross-environment cookie, Safari/Android/Zalo.
2. Triển khai mã base62/mapping/rotation trong thay đổi riêng theo ADR-0004; hiện viewer còn dùng site ID 32 hex.
3. Hoàn tất #8 smoke quyền/mutations/audit/deny/revoke/logout thật; #10 DNS inventory/website regression/rollback, private R2, log redaction và owner/security review trước staging/pilot.
