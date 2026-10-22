# Review #13/#15 sau đồng bộ main — 2026-10-22

> Sau report này, owner đã giao merge; #13/#15 nay MERGED, #8/#14/#16 CLOSED, #10 OPEN. [Report sau merge](2026-10-22-stack-merged.md) là trạng thái mới; các gate/quyền chờ ở dưới là snapshot lúc review.

Refs [#13](https://github.com/cfotel2604/html-share-platform/pull/13), [#15](https://github.com/cfotel2604/html-share-platform/pull/15), #8/#10/#14/#16; [review auth](2026-10-22-pr13-retarget.md), [handoff](../LAB_HANDOFF.md), [merge plan](../MERGE_PLAN.md).

## Quyền, dependency và conflict

Owner giao retarget/review #13 rồi xử lý #15. Main6bdd298 đã chứa #5/UI qua #17. #13 đã retarget main và merge sync ad4b7e2, report auth bổ sung8f204c3; #15 sync dependency đó, giữ base #13 đến dependency merge. Cả hai nhánh chỉ conflict PROJECT_STATUS/AI_HANDOFF; đã hợp nhất main/PR metadata mới cùng implementation/security evidence, không đổi runtime để giải quyết docs. Không force-push, không reset owner files/env/volumes.

Git equality trước/sau: #13 src/scripts/db/dependencies/Compose/attributes không đổi so4ac9689; #15 tương ứng cộng Dockerfile/runtime-permission CI không đổi soe834f13. Migration blobs0001/0002/0003 giữ nguyên, không chạy migration/backfill hoặc deploy lab. Commit docs/report mới hơn image VM là bình thường; lab giữ web/source dc7560e, gateway security-417c50d và env pin đã xác minh.

## Kết quả review

Chưa phát hiện blocker mới trong implementation auth/origin/share sau đọc routes/services/proxy/gateway/policy/schema/backfill/operator scripts, UI adapter/workflow và test coverage. Auth chi tiết tại report13; phần share/permissions được đối chiếu:

- Code10base62 CSPRNG randomInt phân phối đều, COLLATE C/format CHECK/primary key; partial UNIQUE một active/site, giữ tombstone. Allocate bounded collision retries, revoke/rotate/reissue cùng fresh actor/policy/site lock và audit transaction. COMMIT unknown503/refresh/discard connection, không compensate unsafe.
- Backfill riêng additive, khóa site rồi query history fresh trước cấp; không reissue nếu từng revoke, exclude deleted, concurrent/idempotent. Create site cấp cùng transaction; update/publish không phục hồi link revoked. Ownership/active pointer/immutable storage không đổi khi đổi mã.
- Canonical URL chỉ từ server, không fallback host-ID, invalid/legacy aliases404 trước DB. Viewer lookup active + published, no-store/no-referrer, CSP/iframe sandbox không Clerk/session trên viewer. Budget600/min mỗi process không được mô tả là edge per-IP/distributed protection.
- Share API yêu cầu session/Origin/Host/server ownership, kill switch khóa mutation sau auth; UI warning phân biệt viewer revoke với direct content published, confirm rotate/revoke và reset copied state theo code. Unpublish/delete chặn request nội dung mới, không thu hồi tab đã tải.
- Dockerfile chỉ chuẩn hóa a+rX cho scripts/db sau COPY, giữ root ownership/USER node/SQL bytes. Checker dùng default non-root, read-only/no-network/no data mount; CI cố ý restrictive checkout rồi verify image trước integration. Không chmod storage volumes hoặc migrate root.

## Kiểm chứng và nghiệm thu

#13 sync ad4b7e2: 79 unit tests, lint/typecheck/build và 15 isolated groups (9upload+6auth/origin) PASS, ba CI jobs SUCCESS; report13 có exact-run links. #15 source trước sync e834f13: 86unit/20integration groups CI SUCCESS; CI final sync head kiểm riêng sau push, không suy head cũ thành head mới. Docs/YAML/local links, git diff check, conflict/equality/schema checks thực hiện trong mốc này. Không rerun browser hoặc dùng credentials/HTML người dùng thật chỉ để test merge docs.

**Owner xác nhận đầy đủ ngày22/10:** Employee không sửa site người khác; Admin mutation/audit đúng actor; email ngoài allowlist bị chặn; revoke/disable/logout chặn phiên cũ; rotate/revoke/reissue/unpublish link cũ bị chặn. Đây là real-session/lifecycle evidence do owner cung cấp, tách khỏi CI synthetic và Chrome/.test lịch sử. Không biến xác nhận này thành full cookie sibling/mobile/browser matrix chưa kiểm.

## Gate và bước tiếp

Implementation review + owner cases đạt; có thể chốt Ready khi CI đúng final heads PASS. Chưa merge #13/#15 hoặc deploy ở mốc retarget/review này; merge cần quyền cụ thể cho chuỗi #13 → #15. #15 chỉ retarget main sau #13 vào main, kiểm diff/CI lại khi đó.

ADR0001/0003 vẫn Proposed; #8/#10 chưa tự đóng. R2 private/IAM/cleanup, production Clerk/OAuth, cookie cfvn.cloud sibling/cross-environment, Safari/iOS/Android/Zalo/crawlers, edge/concurrency/cache/log redaction toàn pipeline, DNS/vhost/renewal/rollback/pilot còn riêng. Giữ schema/tombstones và sandbox; ưu tiên SHARE_LINK_MUTATIONS_ENABLED=false nếu sự cố, không rollback binary bật lại aliases sau revocation.

## Thực hiện merge theo owner giao

Owner sau đó cho phép Ready/merge #13 → #15 và chốt handoff. Agent xác minh live đúng base/head/3checks SUCCESS, chuyển Ready và merge #13 bằng merge commit, tạo main `6d30d227a52b9230f9190a701e066c436475473b` lúc19:47:35 Asia/Saigon; tree bằng tested head `8f204c3953f35d22d66ce515c7ff587954d5c996`. CI final auth head: [application](https://github.com/cfotel2604/html-share-platform/actions/runs/39779645546), [docs](https://github.com/cfotel2604/html-share-platform/actions/runs/39779645553), [security](https://github.com/cfotel2604/html-share-platform/actions/runs/39779645733), cả3 SUCCESS. #15 sau đó retarget main và sync dependency merge không conflict/runtime changes. CI final #15 kiểm lại sau push, rồi merge đúng head theo quyền đã nhận. Mốc này không deploy/migrate/backfill hoặc đổi lab.
