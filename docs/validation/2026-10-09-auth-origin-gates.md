# Auth/RBAC và public origin gates — #8 / #10

Ngày: 2026-10-09. Trạng thái: đang triển khai; chưa phải xác nhận release.

## Phạm vi được giao

Owner giao tiếp tục #8 và #10, kiểm thử và cập nhật Docker local, giữ Studio và dữ liệu. Branch `codex/8-10-auth-origin-gates` tạo từ origin/main `78cb7ca`, fast-forward dependency Studio `4ab546a`; PR xếp trên `codex/11-studio-ui` vì #5/#12 chưa merge. Không tự merge hoặc triển khai production.

- #8: Google/Clerk session server-side, verified email allowlist, Employee/Admin, revoke/disabled, ownership trước ingest và kiểm tra lại trong transaction, audit và CSRF.
- #10: gateway hostname riêng, manifest allowlist, trusted viewer host/path, CSP sandbox mọi HTML, preview grant scope/TTL, tests cookie/storage/worker/navigation và compatibility.
- Giữ auth demo chỉ trên loopback để lab hiện hữu tiếp tục hoạt động khi chưa cấu hình Clerk. Clerk mode không fallback sang demo khi key/session không hợp lệ.

## Gate bên ngoài

Owner cho biết đã có Clerk Development và sẽ đặt key vào `.env`, cung cấp email/role. Không ghi keys hoặc email thực vào tài liệu/PR. Google login thật phải smoke sau cấu hình; test mô phỏng không thay bằng chứng này.

DNS/Workers inventory, wildcard TLS/Origin CA Full (strict), private R2 IAM, Safari/iOS và Zalo cần môi trường/credentials và review riêng. Không thay DNS/provision tài nguyên từ Issue này. ADR-0001 vẫn Proposed cho đến khi đủ bằng chứng và owner/security review.

## Bằng chứng

Sẽ cập nhật sau khi code, CI, integration, browser và local deploy hoàn tất. Không đánh dấu #8/#10 hoàn tất khi các gate chưa được kiểm chứng.
