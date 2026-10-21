# Public origins lab sẵn sàng — 2026-10-21

Refs [Issue #10](https://github.com/cfotel2604/html-share-platform/issues/10), [#8](https://github.com/cfotel2604/html-share-platform/issues/8), [#14](https://github.com/cfotel2604/html-share-platform/issues/14), [Draft PR #15](https://github.com/cfotel2604/html-share-platform/pull/15). Snapshot theo Asia/Saigon; kiểm VM qua SSH `lab-b` chỉ đọc tại `/opt/hsp/src`.

## Đính chính phạm vi public — network gate chưa đạt

Sau câu hỏi của owner về UFW, SSH chỉ đọc xác minh: default deny incoming, allow office/VPN và IPv4 Cloudflare TCP, không có public443 rule; public53 phục vụ acme-dns. Studio/viewer resolve IP Cloudflare; content hostname resolve trực tiếp IP VM. Port443 do nginx host listen IPv4/IPv6. NS cfvn.cloud thuộc cloudfone.vn, runbook quản lý DNS bằng PowerDNS.

Trình duyệt tải iframe bằng kết nối riêng từ IP khách, không kế thừa đường Cloudflare của viewer shell. Vì vậy khách ngoài allowlist sẽ không tải được content direct theo cấu hình hiện tại. Các HTTP200 từ máy agent trong mạng cho phép/VM bên dưới không chứng minh Internet end-to-end. Chưa có probe thành công từ mạng ngoài allowlist; kết luận gate public ở phần lịch sử dưới đây bị giới hạn bởi finding này.

Các phương án để owner chọn: (1) proxy public cho wildcard content, giữ UFW origin giới hạn; (2) public reverse proxy/IP riêng nếu giữ PowerDNS và không đưa zone vào Cloudflare; (3) public443 trên VM hiện tại, nhưng UFW không phân biệt hostname nên cần kiểm/restrict từng nginx vhost hoặc tách gateway. Không đổi eTLD+1/sandbox để xử lý mạng. Nếu dùng Cloudflare, phải có DNS onboarding và edge certificate phủ `*.lab-space-ods.cfvn.cloud`; certificate Let's Encrypt trên VM chỉ phục vụ origin leg, Universal SSL của full zone cfvn.cloud không tự phủ hostname hai cấp. [Proxy status](https://developers.cloudflare.com/dns/proxy-status/), [TLS limits](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/), [partial DNS setup](https://developers.cloudflare.com/dns/zone-setups/partial-setup/) và [Tunnel DNS](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/dns/) là tài liệu tham chiếu; chưa chấp nhận phương án hạ tầng mới.

Nghiệm thu bổ sung: từ 4G/mạng ngoài office và tắt VPN, mở viewer và content direct, kiểm HTML/CSS/JS/iframe/private preview, sandbox/frame-ancestors/no-store và unpublish. Nếu thêm proxy/CDN cần kiểm không cache vượt policy hoặc thay CSP/cookie headers. Lần kiểm này không đổi UFW/DNS/nginx/tunnel hoặc runtime ứng dụng.

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
