# Bàn giao lab HTTPS — 2026-10-22

Refs [PR #15](https://github.com/cfotel2604/html-share-platform/pull/15), #8/#10/#14/#16. Đây là baseline lab đã chạy, không phải phê duyệt production. [Bằng chứng](validation/2026-10-22-lab-acceptance.md), [kế hoạch merge](MERGE_PLAN.md), [share lifecycle/rollback](SHARE_LINKS.md).

## Baseline đã kiểm trực tiếp

SSH alias `lab-b`, source `/opt/hsp/src`, Compose project `hsp-lab`. Source detached tại `dc7560ea1c34cbe060779fbe69bb2f574e170431`, tracked files sạch; không đổi sang docs HEAD để build lại khi chưa cần.

| Thành phần | Runtime hiện tại |
| --- | --- |
| Web/Studio/API/viewer | `html-share-studio:share-dc7560ea1c34`, revision đúng fix SHA, healthy |
| Gateway | `html-share-studio:security-417c50d`, healthy; giữ image cũ có chủ đích trong cutover web-only |
| PostgreSQL | `postgres:17-alpine`, healthy, không publish host port |
| Storage lab | `bitnamilegacy/minio:2025.7.23-debian-12-r5`, healthy, không publish host port; chưa đạt private R2 gate |
| Database | migrations 0001/0002/0003; 3 sites/7 versions; 3 active/3 revoked links; thiếu share history/manifest đều 0 |
| Firewall | UFW active, `443/tcp` ALLOW Anywhere IPv4/IPv6 do owner mở; app ports vẫn loopback |

Web image ID `sha256:7967815b1c25611fc4237f929bc3cf21c21243f242524073f1509e3a3654232a`. Gateway image ID `sha256:9d4b698d598daa34dc5a21e05b94e4250fa58425d26856635f343b0bf13fc39c`. Đây là inventory ngày 22/10, không phải baseline bất biến để so với những lần upload sau này. Docker Desktop là môi trường khác, không được kiểm lại ở mốc này.

## Origins và ingress

| Vai trò | Lab |
| --- | --- |
| Studio/API/login | `https://studio-lab.ods.vn` |
| Viewer canonical | `https://view-lab.ods.vn/<10-base62>` |
| Direct content | `https://<32-hex-host-id>.lab-space-ods.cfvn.cloud/` |
| Private preview | Grant hostname cùng content namespace, TTL 3 phút; không đưa grant vào báo cáo |

Studio/viewer đi qua Cloudflare; content DNS trỏ VM → nginx HTTPS → `127.0.0.1:4100`. Web bind `127.0.0.1:3100`. Owner xác nhận sau khi mở443, khách ngoài đã tải iframe và dùng thử lab OK. SSH xác minh firewall và các HTTP headers; agent không có probe độc lập từ mạng 4G. Mở443 ảnh hưởng mọi nginx vhost trên IP đó: cần review các site hiện hữu trước mở rộng phạm vi/pilot. Không chuyển raw HTML sang Studio/viewer để giải quyết mạng.

## Cấu hình lưu bền — đã xác minh sau owner cập nhật

Owner đã bổ sung SECURITY_IMAGE ngày22/10. SSH xác nhận đúng tag bên dưới, Compose config từ process không có shell override PASS và web vẫn running. Finding thiếu biến trước đó đã xử lý; không cần nhập lại, restart hoặc chạy migration/backfill. Giá trị lưu trong `/opt/hsp/src/.env`:

```dotenv
SECURITY_IMAGE=html-share-studio:share-dc7560ea1c34
```

Tham khảo [public env mẫu](../deploy/lab-public.env.example), không copy đè `.env` hiện hữu. Keys Clerk Development và DB/storage credentials giữ private; không cấp lại allowlist hoặc chuyển ownership. Template chỉ có public settings, không đủ để tạo stack mới.

Compose đang dùng bốn file theo thứ tự: `compose.yaml`, `compose.security.yaml`, `compose.lab.yaml`, `compose.edge.yaml`. Hai file cuối thuộc operator, untracked; giữ nguyên. [Overlay mẫu](../deploy/compose.lab-public.example.yaml) ghi các invariant HTTPS/storage, chỉ dùng sau đối chiếu; không tự thay overlays đang chạy. `PUBLIC_SITE_PORT=` trong env một mình không đủ vì security overlay lấy từ GATEWAY_PORT; overlay cuối phải đặt chuỗi rỗng cho web/gateway.

Kiểm env lưu bền, không dump secrets và không restart:

```bash
env -u SECURITY_IMAGE docker compose -p hsp-lab --env-file /opt/hsp/src/.env \
  -f /opt/hsp/src/compose.yaml -f /opt/hsp/src/compose.security.yaml \
  -f /opt/hsp/src/compose.lab.yaml -f /opt/hsp/src/compose.edge.yaml config --quiet
```

Lưu tag không đổi containers. Khi cần cập nhật riêng web đã được giao, dùng cùng files/project/env, `up -d --no-deps --no-build --wait web`. SECURITY_IMAGE hiện chọn cả migrate/web/gateway trong security overlay; chạy up toàn stack có thể recreate gateway theo tag web. Không làm việc đó chỉ để chuẩn hóa tài liệu.

## Trạng thái cutover và vận hành tiếp

8.2.2 migration/backfill đã đạt, 8.2.3 web đã chạy candidate và owner dùng thử OK. Không chạy lại migration/backfill chỉ vì merge docs hoặc mở phiên shell mới. Runner có checksum/idempotency, nhưng mỗi upgrade mới vẫn phải review image/schema và có baseline riêng. Không sửa SQL đã áp dụng, không chạy migrate root, không xóa schema/volumes. [Sự cố EACCES và fix](validation/2026-10-21-runtime-permissions.md).

3 revoked links chứng minh đã có lịch sử thu hồi, chưa thay thế bằng chứng actor/quyền của từng thao tác. Giữ tombstones. Link viewer cũ 32hex trả404; share rotation không chặn direct content còn published. Unpublish/delete mới chặn request nội dung mới, không thu hồi tab đã tải. Rollback ưu tiên `SHARE_LINK_MUTATIONS_ENABLED=false` trên candidate; image cũ có thể bật lại alias host-ID, không dùng tùy tiện sau revocation.

## Nghiệm thu và việc còn lại

- Đã kiểm trực tiếp: bốn services healthy, migrations/history/manifest, canonical short viewer 200, sandbox/no-store/no-cookie, viewer API 404, legacy alias 404, origins/loopback/storage ports, public 443 rules.
- Theo owner: Admin/Employee login, preview/retests trước đó; sau mở443 khách ngoài tải iframe, dùng thử lab OK. Chưa có checklist chi tiết cho từng case RBAC/mobile.
- Trước chốt review #13/#15: reviewer đối chiếu real-session ownership/Admin audit/deny/revoke/logout và link lifecycle theo [MERGE_PLAN](MERGE_PLAN.md); ghi rõ case nào do owner xác nhận thay vì suy từ số rows.
- Trước pilot/production: private R2/IAM/cleanup, production Clerk/OAuth, real-domain cookie/sibling/mobile/Zalo, edge limits/cache/unpublish, toàn pipeline log redaction, DNS/vhost inventory, TLS renewal/rollback, ADR-0001/0003 và release review. Lab vận hành tốt không tự đóng #8/#10.

Operator runbook ngoài Git: `C:\Users\admin\Documents\Codex\html-share-platform-docs\RUNBOOK_LAB_VM_TLS_ACME_DNS.vi.md`, mục8 nâng cấp và bàn giao ứng dụng; mục11 tháo hạ tầng không phải rollback app. Không đưa `.env`, share codes, preview grants, cookies, payload hoặc thông tin khách vào Git/Issue/log.
