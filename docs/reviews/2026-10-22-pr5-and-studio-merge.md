# Review PR #5 và khôi phục đường merge Studio — 2026-10-22

Refs [#5](https://github.com/cfotel2604/html-share-platform/pull/5), [#12](https://github.com/cfotel2604/html-share-platform/pull/12), [Issue #11](https://github.com/cfotel2604/html-share-platform/issues/11). Owner giao review/merge #5 và báo đã merge #12 trước retarget. Khi kiểm, #5 đã được owner merge, nên review này đối chiếu commit đã vào main; agent không thực hiện lại merge #5.

## GitHub và ancestry đã xác minh

- #5 merged vào main lúc 2026-10-22 12:02:23 UTC (19:02:23 Asia/Saigon), merge commit `1ed0eb0d35961118de6e22f17be13b4bae95cc19`, head `235cc62597a15b437e4db11cfc1fced4890483b1`. Tree main đúng bằng tree head #5, không có runtime changes ngoài PR.
- #12 merged một phút sau vào `codex/local-mvp`, commit `2df738b1b262c89a2652fc01a07f093b7037a418`, parents235cc62/4ab546a. Tree đó đúng bằng head UI `4ab546adba17cea8c0d298e786a652a0b2277bc3`. UI chưa nằm trong main vì #5 đã đóng trước lúc nhánh base nhận UI.
- Không mất code và không cần revert #12. Branch recovery `codex/11-studio-main-recovery` tạo từ origin/main1ed0eb0 rồi merge nhánh local-mvp2df738b, giữ ancestry của UI cho các PR sau.
- Merge recovery `329673884a729b56ca65f6550a39618e93edc434` chỉ là commit trên feature branch; chưa đưa recovery vào main. Runtime tree trước docs recovery đúng bằng tree #12; diff backend/API/scripts/db/compose.yaml/.env.example so main rỗng.

## Kết luận review #5

Không phát hiện thêm blocker trong phạm vi **local MVP/upload hardening** sau đối chiếu code và CI đúng commit main. Hai findings #9 đã có fixes: counter22MiB trước multipart parser và cancellation khi vượt; PUT owner preflight trước đọc body, fresh FOR UPDATE trước ingest/storage; reserve immutable version trước writes; pointer/audit cùng transaction; cleanup đúng attempted keys trước COMMIT, xử lý per-key failures/retry; COMMIT unknown giữ objects/trả503/discard connection. ZIP traversal/link/collision/entry/count/depth/type/size checks và published-state gateway/no-store/HTTP sandbox được đối chiếu.

CI trên exact main `1ed0eb0`: [application](https://github.com/cfotel2604/html-share-platform/actions/runs/39775149932) và [docs](https://github.com/cfotel2604/html-share-platform/actions/runs/39775149938) SUCCESS. Application chạy npm ci, lint/typecheck, **50 tests PASS/0 fail**, production build. Log test summary đã đọc; không suy từ CI head trước merge.

[Docker/DB/browser integration #9](../validation/2026-10-09-upload-hardening.md) là bằng chứng lịch sử, không rerun ngày22/10. Main #5 còn demo auth, gateway theo path, chưa Clerk/hostname production; không deploy main trung gian này lên public lab đang chạy #15. Audit publish/unpublish/real RBAC, R2/origin/mobile và lifecycle cần review các phase/PR tương ứng; kết luận local MVP không phải security/production approval.

## Phạm vi recovery UI

Đưa đúng22files UI từ #12 vào PR mới base main: presentation/workflow/typed HTTP adapter, Geist/Mono, ODS blue/neutral/graphite, sáng/tối/responsive, clipboard/filter và lint import boundary. Không sửa auth/API/schema/upload/storage/gateway; không redeploy hoặc chạy migration. Doc handoff trong recovery ghi nguồn merge và giới hạn, không chép implementation #13/#15 chưa merge vào main.

Đã đọc adapter/hook/components và boundary: chỉ HTTP same-origin, credentials same-origin, multipart browser boundary, React escape metadata, không inject HTML upload vào Studio, UI không import DB/storage/server services. Existing adapter tests kiểm methods/cookies/multipart/errors. Recovery CI cần pass trên head/base mới; vẫn giữ Draft đến owner giao review/merge recovery.

## Lab và bước tiếp

SSH chỉ đọc xác nhận SECURITY_IMAGE private env bằng tag `html-share-studio:share-dc7560ea1c34`; Compose config không có shell override PASS, web vẫn running. Giữ lab image/source/volumes, không rebuild từ main.

Sau recovery vào main, #13 mới có thể retarget main và kiểm diff/CI/conflicts; #15 tiếp tục base #13 đến dependency merge. #13/#15 còn Draft và các gate riêng; không tự retarget/merge hai PR đó từ yêu cầu #5. #9 đã CLOSED sau merge #5; #11 còn OPEN đến UI thực sự vào main và acceptance đạt.
