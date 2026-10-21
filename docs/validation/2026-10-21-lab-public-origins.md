# Public origins lab sẵn sàng — 2026-10-21

Refs [Issue #10](https://github.com/cfotel2604/html-share-platform/issues/10), [#8](https://github.com/cfotel2604/html-share-platform/issues/8), [#14](https://github.com/cfotel2604/html-share-platform/issues/14), [Draft PR #15](https://github.com/cfotel2604/html-share-platform/pull/15). Snapshot theo Asia/Saigon; kiểm VM qua SSH `lab-b` chỉ đọc tại `/opt/hsp/src`.

## Owner xác nhận

Studio `https://studio-lab.ods.vn` và viewer canonical `https://view-lab.ods.vn/<code>` đã có public HTTPS; tunnel/DNS/hostname routing end-to-end hoạt động, toàn bộ step-5 retests đã pass, private preview vẫn hoạt động. Direct content giữ `https://<host-id>.lab-space-ods.cfvn.cloud/`. Không yêu cầu owner cấu hình lại hai hostname.

Đây là xác nhận của owner cho browser/preview/retests; lần kiểm tra này không dùng session owner, không tự coi các real-session RBAC, mobile hoặc provider gates khác đã hoàn tất.

## Agent đã kiểm chứng

- VM source HEAD `417c50dcfdd30c6ec5b387b43b6fb61b5bcc2661`, branch `codex/8-10-auth-origin-gates`. Giữ nguyên `compose.lab.yaml` và `compose.edge.yaml` untracked.
- Web/gateway chạy `html-share-studio:security-417c50d`, image ID `sha256:9d4b698d598daa34dc5a21e05b94e4250fa58425d26856635f343b0bf13fc39c`; cùng DB/MinIO healthy. Web 3100/gateway 4100 chỉ bind loopback, DB/storage không publish ports.
- Effective web AUTH_MODE=clerk, AUTH_TRUSTED_ORIGINS có Studio HTTPS cùng loopback cũ, VIEWER_PUBLIC_ORIGIN đúng viewer HTTPS. Content domain/scheme/frame-src đúng lab; PUBLIC_SITE_PORT rỗng ở web và gateway. Gateway preview origin đúng Studio HTTPS, viewer origin đúng viewer HTTPS.
- Từ máy agent và VM, GET Studio HTTPS 200; viewer của một site published HTTPS 200, no-store/CSP chỉ iframe content lab, không Set-Cookie. GET viewer `/api/sites` trả 404, không Set-Cookie. TLS xác minh theo CA mặc định, không bỏ qua certificate validation; không đọc/log HTML upload hoặc credentials.
- Direct content của site published HTTPS 200, no-store/no-referrer, không Set-Cookie; HTTP CSP `sandbox allow-scripts` không allow-same-origin, frame-ancestors đúng `https://view-lab.ods.vn`.
- DB transaction READ ONLY: migrations `0001`, `0002`; chưa có `site_share_links`. Có 2 sites không deleted/2 versions; đây là inventory VM riêng, không đối chiếu với 10 sites/17 versions Docker Desktop lịch sử.
- GitHub live: main vẫn `78cb7ca`; PR #5/#12 Ready, #13/#15 Draft, tất cả OPEN/MERGEABLE/checks SUCCESS tại các head `235cc62`, `4ab546a`, `4ac9689`, `9d363c1`. #8/#9/#10/#11/#14 vẫn OPEN. Không suy check xanh thành review/merge approval.

Probe dùng Python User-Agent mặc định ban đầu nhận edge 403 trên trusted hosts; cùng URL với User-Agent browser-style trả 200 trên cả máy agent và VM. Không đổi WAF/edge policy hoặc kết luận nguyên nhân. Kiểm crawler Open Graph/Zalo và browser thật là phần compatibility cần ghi nhận trước pilot.

## Kết luận và bước tiếp theo

Gate **khả dụng public HTTPS Studio/viewer lab** đã đạt. Code short-link candidate chưa deploy: VM hiện vẫn resolve viewer bằng host ID 32 hex, không có migration 0003/mapping/rotate/revoke/reissue.

1. Review PR #13/#15 trong stack #5 → #12 → #13 → #15; xác nhận candidate image/revision và kế hoạch đổi viewer URLs cũ. Giữ Draft/chưa tự merge; unit/integration/browser của candidate là bằng chứng mốc 09/10, chưa rerun local ngày 21/10. CI xanh ở head trước cập nhật docs được xác minh live; CI head docs mới kiểm riêng sau push.
2. Khi được giao cutover lab, làm theo [SHARE_LINKS](../SHARE_LINKS.md): ghi baseline DB/assets/pointers, stop web ngắn, migration 0003 + metadata backfill bằng candidate, recreate web giữ gateway/storage/volumes và public-origin overlays. Giữ policy Clerk và keys, không fallback local-demo. Link dài cũ trả 404, gửi canonical link ngắn mới.
3. Nghiệm thu trên HTTPS thật bằng fixtures riêng: copy/update giữ code; rotate/revoke/reissue/aliases trả 404; unpublish chặn cả viewer/direct; sandbox/preview. Real-session Employee owner-only/Admin, deny/revoke/logout và audit để hoàn tất bằng chứng #8. Không sửa site cũ hoặc thu hồi người dùng thật trong lần kiểm tra chỉ đọc.
4. Trước staging/pilot/production: private R2/IAM/cleanup thay MinIO legacy, edge limits/crawler compatibility, cookie cfvn.cloud sibling/cross-environment, DNS/reserved inventory/regression, hostname log redaction toàn pipeline, mobile/Safari/Zalo, rollback/renewal drill và security review #10. Public HTTPS sẵn sàng không đóng toàn bộ #10 hoặc đổi ADR-0001/0003 sang Accepted.

Lần này chỉ kiểm/readiness docs; không deploy, migrate/backfill, đổi DNS/nginx/WAF, restart containers, thay policy/user/data, merge hoặc chuyển PR Ready. Thu hồi mã viewer không thu hồi direct content khi published; unpublish/delete mới chặn request nội dung mới.
