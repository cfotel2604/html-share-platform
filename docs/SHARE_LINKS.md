# Mã viewer ngắn — Issue #14

Trạng thái: implementation đang thực hiện trên `codex/14-short-viewer-links`, dựa trên PR #13 vì dependency chưa merge. [ADR-0004](adr/0004-domains-and-share-codes.md) là quyết định owner. Không thay hostname/storage hoặc triển khai VM trong mốc này.

## Thiết kế

`site_share_links` giữ mã 10 base62, site ID, thời điểm tạo/thu hồi; primary key theo exact case và unique partial index cho một link active/site. Giữ mã đã thu hồi làm tombstone để không tái cấp. Tạo/rotate/revoke khóa actor/policy và site, audit bằng site ID; update version/publish không tự cấp lại link bị thu hồi.

Migration 0003 chỉ tạo schema. Backfill riêng dùng CSPRNG phía Node, khóa site và chỉ cấp nếu site chưa từng có mã; không sửa metadata site, version, ownership hoặc asset. Các migration cũ không thay đổi.

Viewer chỉ nhận share code, resolve active + published; không redirect alias host ID cũ. API/Studio nhận URL canonical từ server, kể cả loopback `/view/<code>`. Thu hồi link không unpublish direct content; UI cần giải thích rõ và tiếp tục có action tắt xuất bản.

Lookup phải no-store/no-referrer, bounded trước DB; giới hạn nhiều replica/per-IP vẫn cần edge policy. Kiểm rotate/revoke/rollback/collision/ownership/race, revoked-code 404, code case, sandbox và upload regression trước hoàn tất.

## Hoàn tất

Cập nhật endpoint/API contract, lệnh backfill/deploy/rollback, bằng chứng kiểm thử, PROJECT_STATUS và AI_HANDOFF khi implementation đạt. Public trusted hostname và VM integration chờ owner cấu hình DNS/TLS; không dùng điều đó để dừng code/test local.
