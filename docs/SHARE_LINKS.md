# Mã viewer ngắn — Issue #14

Implementation [Draft PR #15](https://github.com/cfotel2604/html-share-platform/pull/15), [Issue #14](https://github.com/cfotel2604/html-share-platform/issues/14), branch `codex/14-short-viewer-links`, dựa trên PR #13 vì dependency chưa merge. [ADR-0004](adr/0004-domains-and-share-codes.md) là quyết định owner. [Kiểm chứng local](validation/2026-10-09-short-viewer-links.md) đã pass; VM/Docker owner chưa được cập nhật trong mốc này.

## Thiết kế

`site_share_links` giữ mã 10 base62, site ID, thời điểm tạo/thu hồi; primary key theo exact case và unique partial index cho một link active/site. Giữ mã đã thu hồi làm tombstone để không tái cấp. Tạo/rotate/revoke khóa actor/policy và site, audit bằng site ID; update version/publish không tự cấp lại link bị thu hồi.

Migration 0003 chỉ tạo schema. Backfill riêng dùng CSPRNG phía Node, khóa site và chỉ cấp nếu site chưa từng có mã; không sửa metadata site, version, ownership hoặc asset. Các migration cũ không thay đổi.

Viewer chỉ nhận share code, resolve active + published; không redirect alias host ID cũ. API/Studio nhận URL canonical từ server, kể cả loopback `/view/<code>`. Thu hồi link không unpublish direct content; UI cần giải thích rõ và tiếp tục có action tắt xuất bản.

Lookup phải no-store/no-referrer, bounded trước DB; giới hạn nhiều replica/per-IP vẫn cần edge policy. Kiểm rotate/revoke/rollback/collision/ownership/race, revoked-code 404, code case, sandbox và upload regression trước hoàn tất.

## API và Studio

| Endpoint | Thành công |
| --- | --- |
| GET `/api/sites` | Site có `share_code: string \| null`, `share_url: string \| null`; URL canonical do server sinh |
| POST `/api/sites/:host-id/share` | Tạo/đổi link: `{ id, share_code, share_url }`; body rỗng |
| DELETE `/api/sites/:host-id/share` | Thu hồi link: `{ id, share_code: null, share_url: null }` |

Session và exact Origin/Host bắt buộc cho mutation; Employee owner-only, Admin scope theo policy DB mới nhất. Mỗi transaction giữ actor/policy FOR SHARE và site FOR UPDATE. Mã cũ revoked, mã mới/audit cùng COMMIT; lỗi trước commit rollback giữ link cũ, mất response COMMIT trả 503 yêu cầu refresh, không tự cấp lại để bù.

Update phiên bản và publish/unpublish giữ nguyên lịch sử mã; không tự bật link đã revoked. Audit chỉ site ID/actor/action, không mã hoặc URL. Studio dùng typed adapter, có “Link chia sẻ” → “Đổi link xem”/“Thu hồi link xem”/“Tạo link xem”, cảnh báo tác động và confirmation. Copy/open không fallback sang host ID; mã đổi làm reset trạng thái copied.

Viewer tại `view*/<code>`; nếu chưa có VIEWER_PUBLIC_ORIGIN thì canonical `/view/<code>` trên trusted loopback shell. Host-ID alias 32 hex ở cả root và /view trả 404, không redirect. Có HTTP/iframe sandbox, no-store/no-referrer, không Clerk/session admin trên viewer. Direct content hostname vẫn dùng host ID 32 hex, không bị rotation/revoke viewer tác động.

## Backfill và deploy được giao sau review

Migration 0003 chỉ tạo bảng/index, không sinh mã bằng SQL random. Operator phải chạy backfill bằng candidate image trước mở viewer mới cho các site cũ. Không xóa lịch sử mã để cấp lại: backfill chỉ site không có **bất kỳ** history, kể cả revoked.

1. Chốt candidate commit/image đã kiểm; giữ rollback images và Compose/env/volumes đúng môi trường. Không build checkout owner cũ.
2. Stop web ngắn để tránh tạo site giữa backfill và đổi runtime; gateway có thể tiếp tục phục vụ content đang published.
3. Với Compose owner + security overlay + overlay VM hiện hữu, chạy `run --rm --no-deps migrate`, rồi `run --rm --no-deps --entrypoint node web scripts/backfill-share-links.mjs` bằng candidate image. Không dump config/env đầy đủ.
4. Kiểm count/historical rows, đối chiếu metadata/active pointers/ownership và object keys; backfill audit không chứa mã. Nếu lỗi, dừng cutover và giữ dữ liệu; rerun backfill an toàn kể cả lost COMMIT.
5. Recreate web bằng candidate, giữ gateway/DB/storage/ports; migration mới không đổi gateway. Kiểm login/list, canonical share URL/code, aliases 404, rotation/revoke/unpublish với fixture riêng. Các viewer URL dài cũ sẽ 404 sau cutover; owner cần gửi link ngắn mới cho người nhận.

Hostname TLS/Clerk/CSRF/frame-ancestors chuyển theo [SECURITY_LAB](SECURITY_LAB.md), không nới sandbox. HTTPS443 vẫn cần override PUBLIC_SITE_PORT rỗng ở web/gateway. Chưa thực hiện các bước này trên VM hoặc owner Desktop ở mốc code/test.

## Limits và rollback

`VIEWER_REQUESTS_PER_MINUTE` mặc định 600, range 1–100000: budget fixed-window mỗi process proxy, chỉ cho paths mã hợp lệ, trả 429/Retry-After/no-store trước DB. Không tin client forwarded IP. Đây không phải per-IP, distributed limit hoặc anti-DDoS; cần edge per-IP policy trên nginx trước public pilot. Lookup active/status qua indexed code, invalid formats/legacy aliases không query DB. Dynamic request có tối đa hai lookup cho metadata/page.

`SHARE_LINK_MUTATIONS_ENABLED=false` trong env private + security overlay tạm khóa POST/DELETE share sau auth (503), giữ viewer lookup, alias denial và mapping hiện hữu. Đây là rollback vận hành ưu tiên; không drop migration/table/tombstones.

Rollback web về image PR #13 sẽ khôi phục viewer alias theo host ID và mất UI/API share lifecycle. **Không rollback binary đó khi viewer còn mở và đã có revocation** nếu chưa chặn cả `/<host-id>` và `/view/<host-id>` 32 hex tại Studio/viewer và được review. Có thể tạm chặn viewer/mutations tại edge, giữ candidate lookup hoặc triển khai fix trên cùng schema. Direct content không bị thu hồi bằng viewer code, nội dung đã tải không thể thu hồi.

## Kiểm chứng

Lint/typecheck/build, 86 unit tests, 9 nhóm upload + 6 auth/origin + 5 share-link integration đã pass. Chrome 154.0.8037.99: 4 nhóm Studio lifecycle/copy/viewport và 6 nhóm sandbox/origin regression pass. Chi tiết candidate commit/image và giới hạn trong [validation](validation/2026-10-09-short-viewer-links.md). Public trusted hostname và VM integration chờ owner cấu hình DNS/TLS. Mobile/Zalo, R2/IAM, toàn log pipeline và pilot còn #10/P6/P7; không đánh đồng code/test local với release.
