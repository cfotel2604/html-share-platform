# AI Agent handoff — HTML Share Platform

> Bàn giao **2026-10-22 (Asia/Saigon)**. #13 đã retarget main6bdd298 theo owner giao, sync main chỉ conflict hai docs/status/handoff; đang review/tests. #15 tiếp theo, còn base #13. Chưa merge/Ready/deploy từ mốc này. [PROJECT_STATUS](PROJECT_STATUS.md), [validation](validation/2026-10-09-auth-origin-gates.md).

## Việc hiện tại và xác nhận mới

- Worktree managed `C:\Users\admin\.codex\worktrees\studio-main-recovery\html-share-platform` đang branch codex/8-10-auth-origin-gates cho PR13 (đã tái sử dụng worktree sạch sau recovery17). PR15 vẫn ở `C:\Users\admin\Documents\Codex\html-share-platform-pr5-sync`, codex/14-short-viewer-links. Giữ owner Desktop/env/untracked/volumes; main checkout có thể cũ.
- Main6bdd298 đã có #5 + UI #12 qua #17; #9/#11 CLOSED. #13 base main, head4ac9689 trước sync. #15 base codex/8-10-auth-origin-gates; CI trước sync e834f13 SUCCESS. Fetch/re-query head/base/CI mới trước kết luận.
- Owner xác nhận đầy đủ case Employee owner-only, Admin mutation/audit actor, ngoài allowlist deny, policy revoke/disable/logout session cũ deny, rotate/revoke/reissue/unpublish link lifecycle đều đạt. Ghi là owner-confirmed real-session evidence. Không yêu cầu gửi keys/cookies hoặc tự revoke người dùng thật.
- Lab runtime web/source dc7560e, gateway security-417c50d, schema0001/0002/0003 và short links đã chạy; trusted Studio/viewer HTTPS public, direct content VM/nginx/public443. Private env image pin đã lưu và config không shell override PASS. Retarget/review không deploy/migrate/backfill/DNS hoặc đổi dữ liệu lab.
- Resolve docs giữ cả auth implementation/evidence và main merge metadata mới. Không sửa code runtime hoặc SQL để giải quyết merge. Kiểm equality source/security/schema trước-sau, unit79/lint/typecheck/build/15integration theo CI và cập nhật report.
- Tiếp review/sync #15, giữ code share/tombstones/0003/permissions và lab handoff; chỉ retarget main sau dependency merge. User mới giao retarget/review và xử lý dependency; quyền Ready/merge phải theo chỉ dẫn cụ thể và kết quả gates, không suy production approval.
- R2 private/IAM/cleanup, production Clerk/OAuth, cookie cfvn.cloud sibling/cross-environment/browser/mobile/Zalo/crawlers, edge/concurrency/cache/log redaction toàn pipeline, DNS/vhost/renewal/rollback/pilot còn riêng. ADR0001/0003 Proposed,0002/0004 Accepted. Không đánh dấu gates chưa kiểm thành PASS hoặc lùi sandbox.

## Hồ sơ09/10 trước retarget — lịch sử


> Bàn giao **2026-10-09 (Asia/Saigon)**. GitHub/CI đã xác minh; mốc domain bổ sung HTTPS/SSH chỉ đọc VM và owner-confirmed Employee login. PR head trước cập nhật docs `417c50d`. Đọc cùng [PROJECT_STATUS](PROJECT_STATUS.md), [validation](validation/2026-10-09-auth-origin-gates.md) và [SECURITY_LAB](SECURITY_LAB.md).

## Bắt đầu phiên tiếp theo

Đọc AGENTS, README, PLAN, ARCHITECTURE, WORKFLOW, ADRs và status/handoff từ đúng PR branch. Kiểm git status/worktree/remote, fetch origin --prune/origin/main, gh pr view 5/12/13, gh issue list. Không reset/clean, xóa env/volumes, tự merge/deploy production.

## Đã hoàn tất và còn chờ

- PR #5 Ready `235cc62`, base main; PR #12 Ready `4ab546a`, base codex/local-mvp; chưa merge. Upload #9 đã sửa, Studio giữ API boundary. #9/#11 OPEN chờ merge; main `78cb7ca`.
- Owner giao #8/#10 + deploy Docker local. Draft PR #13, codex/8-10-auth-origin-gates, base codex/11-studio-ui. Runtime `613f2b77ac00179f33d6bf13c08007a87b910963`; harness fix `5ab1807` chỉ sửa fresh identity và LF migration 0002, không đổi runtime. #8/#10 OPEN vì gate thật chưa đạt.
- #8: verified primary Google email khớp external identity; allowlist/role DB, disabled/revoke immediate, online session, ownership trước ingest và fresh actor/role dưới locks, actual actor audit, exact Origin/Host CSRF. Không tin JWT/UI role, không fallback khi Clerk lỗi. Demo exact loopback, không bật lại disabled user.
- API Clerk authenticateRequest trực tiếp, bỏ spoof headers, không đọc body. **Không đưa /api vào Next proxy**: body clone/limit của Next 16 gây chunked cap regression; integration xác minh early 413 sau fix. Pages dùng Clerk middleware riêng, viewer không chạy Clerk/expose admin routes.
- #10: hostname ID riêng, reserved/unknown Host 404, root assets, strict types/manifest/size/hash, HTTP sandbox mọi HTML + iframe allow-scripts, CORS public/capability không credentials. PSL/tldts kiểm eTLD+1 dashboard/viewer khác publish. Private grants 128-bit, hash DB, actor/site/version, TTL 3 phút; policy/ownership/expiry được kiểm khi serve. Không log token hostname/payload.
- Migration 0002 bổ sung users.email, auth_allowlist, site_versions.asset_manifest, preview_grants. **0001 không đổi**. `.gitattributes` pin LF chỉ 0002 vì checksum bytes. Backfill kiểm fingerprint, chỉ ghi manifest, không sửa storage/site pointers.
- 79 unit tests, lint/typecheck/build local/Docker PASS; upload 9 nhóm và DB/MinIO auth-origin 6 nhóm PASS. CI `5ab1807` application/docs/security SUCCESS. Runner fresh guarded test DB, không owner credentials.
- Chrome 154 HTTPS `.test` PASS direct/nested HTML + iframe sandbox, cookie/storage/worker/service worker/popup/top navigation, root CSS/classic/modules/fetch/HTTPS CDN, preview/viewer denial; parent cookie/storage/www/mail fixtures giữ nguyên. Self-signed/DNS override local, không chứng minh DNS/TLS/Safari/Zalo thật.
- Owner web/gateway **html-share-studio:security-613f2b7** healthy, http://127.0.0.1:3100. 17 legacy versions backfill, 0 missing. 9 sites giữ metadata; DB/MinIO IDs/mounts không đổi. 6 published serve sandbox/no-store/no cookie, 3 private 404. Thêm 1 synthetic HTML→ZIP fixture để unpublished. Studio 1280/390/320, private preview/logout/API 401 PASS. Browser đóng/cookie state tạm đã xóa.
- **Mốc Clerk tiếp theo đã bật**: user đặt NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY/CLERK_SECRET_KEY và giao chọn roles. Key pair khớp Development instance qua BAPI/JWKS; allowlist 1 Admin/1 Employee audited, không ghi emails vào docs. AUTH_MODE=clerk được lưu trong `.env` owner; Compose alias chuyển publishable key vào runtime CLERK_PUBLISHABLE_KEY, secret chỉ web. Chỉ web recreate cùng image, 10 sites và gateway/DB/MinIO IDs/mounts không đổi. Guest/spoof 401, unknown Host 404, CSRF 403, demo POST 503. Owner xác nhận Google Admin login/thấy website; BAPI primary verified Google identity + active server policy đã đối chiếu. Owner xác nhận thêm Employee login thành công; ownership/mutations/audit/deny/revoke/logout session thật còn chờ; không coi credential preflight là toàn bộ #8 end-to-end.

## Domain và VM lab đã chốt (2026-10-09)

- [ADR-0004](adr/0004-domains-and-share-codes.md) **Accepted** cho domain/link: production Studio `studio.ods.vn`, viewer `view.ods.vn/<share-code>`, content `<host-id>.space-ods.cfvn.cloud`; lab `studio-lab.ods.vn`, `view-lab.ods.vn/<share-code>`, `<host-id>.lab-space-ods.cfvn.cloud`. Thay domain cũ `matbao.one`, giữ HTTP/iframe sandbox và PSL boundary. Lab/production content vẫn cùng parent `cfvn.cloud`; cookie gate phải kiểm cả sibling/cross-environment.
- Host ID 128 bit/32 hex giữ nguyên. Share code 10 base62 CSPRNG/UNIQUE/mapping/rotation là thiết kế **chưa triển khai**; public-url/viewer/proxy hiện dùng 32 hex. Đổi mã chỉ thu hồi viewer; direct URL cần unpublish/delete để chặn request mới; alias cũ phải có migration/revocation policy, không tạo bypass rotation.
- [Nghiệm thu VM](validation/2026-10-09-lab-domain-tls.md): owner xác nhận mục 10 runbook ngoài Git; agent kiểm direct HTTPS 200/sandbox/no-store/no cookie, unknown host 404, SAN wildcard lab/Let's Encrypt hợp lệ, nginx -t/timer active, ports app loopback/storage không publish. SSH `lab-b` chỉ đọc, không đổi deploy/DNS/dữ liệu.
- VM `/opt/hsp/src`, project `hsp-lab`, source/image `security-417c50d`, digest `sha256:9d4b698d598daa34dc5a21e05b94e4250fa58425d26856635f343b0bf13fc39c`; **khác Docker Desktop security-613f2b7**. Giữ `compose.lab.yaml` untracked. Studio/viewer VM còn loopback qua SSH tunnel; VIEWER_PUBLIC_ORIGIN rỗng/frame-ancestors 127.0.0.1:3100, chưa public viewer hostname.
- nginx + Let's Encrypt DNS-01/ACME-DNS là baseline lab đã chạy, production cần wildcard certificate/renewal riêng, không còn gate Cloudflare Edge/Origin CA bắt buộc. Compose security overlay dùng GATEWAY_PORT cho public port; overlay cuối phải đặt PUBLIC_SITE_PORT="" ở web/gateway khi public HTTPS443. Access format không Host/query chưa chứng minh error/DNS/collector redaction; timer active chưa chứng minh renewal failure drill. VM dùng MinIO legacy nội bộ là hiện trạng, không thay private R2 gate trước staging/pilot/production.

## Worktrees và vận hành

- Task **C:\Users\admin\Documents\Codex\html-share-platform-pr5-sync**, branch codex/8-10-auth-origin-gates; cập nhật PR #13, không push nhầm #5/#12. Main checkout vẫn `78cb7ca`.
- Owner **C:\Users\admin\Documents\Codex\html-share-platform-local-mvp** `b3f8119`, `.env`/compose nguyên vẹn. Up dùng Compose owner **+ compose.security.yaml** source mới, SECURITY_IMAGE đúng tag, --no-deps --no-build web gateway; build owner cũ sẽ lùi code. Foundation cổng 3000 không đổi.
- Gateway `*.uploads.localhost:4100`, Chrome resolve loopback không chỉnh DNS; viewer `/view/<id>` giữ nguyên, gateway `/s/<id>` cũ không dùng. Backfill trước gateway mới; NULL manifest 404 fail closed.
- Rollback giữ **html-share-studio:rollback-before-security-20261009** và **html-share-gateway:rollback-before-security-20261009**. Commands/IDs trong validation; giữ additive schema, không đảo migration/down --volumes. Sau có Clerk ownership thật review rollback riêng.
- Test projects html-share-security-checks/html-share-upload-test đã down, giữ volumes/env synthetic tmp; không áp test overlay lên owner. Guard PGDATABASE=upload_test, ports 3700/4700 rảnh; HTTPS fixture 4443, cert/preview artifacts Git-ignored. Không commit screenshot thật/cookie state.

## Bước tiếp theo

1. Không yêu cầu keys/emails lại: đã nhận/cấu hình xong; Google Admin login/list và Employee login đã owner xác nhận. Role/email thực chỉ trong private DB/operator input. Giữ AUTH_MODE=clerk trong `.env` owner (shell override local-demo sẽ lùi mode). Tiếp smoke Employee owner-only, Admin mutation/audit, deny/revoke/logout thật bằng fixture; không tự reassign owner cũ. Không in keys/config/token/session/user details. Server probe sau smoke thấy session đã removed, không khẳng định còn active hoặc logout end-to-end đã được kiểm.
2. Review #5 → #12 → #13; sau merge dependency đổi base/check CI. Giữ #13 Draft đến gate/review; không tự merge/DNS/production.
3. #10: chuyển trusted lab Studio/viewer từ tunnel sang domain mới sau vhost/DNS/TLS/Clerk redirect checks; browser direct/iframe/preview, cookie cfvn.cloud sibling/cross-environment. Tiếp DNS/route/reserved inventory read-only, wildcard diff/regression/rollback, production TLS/renewal riêng, R2 private/IAM/cleanup, hostname log redaction toàn pipeline, Safari/iOS/Android/Zalo, representative packages. ADR-0001/0003 Proposed; ADR-0004 chỉ Accepted quyết định domain/link. P5/P6 orphan/rate/concurrency/retention còn mở.
4. Share code 10 base62/mapping/rotation trong thay đổi riêng; migration additive, UNIQUE/collision retry, exact case, server canonical URL, ownership/audit, published/unpublished and alias-revocation tests. Không đổi host ID/storage hoặc hứa thu hồi direct URL bằng rotation mã viewer.

COMMIT response loss là unknown outcome; không xóa objects chưa đối chiếu DB references. Không nới sandbox để chạy demo. no-store không thu hồi tab đã tải. Cập nhật docs branch/PR được giao; luôn đối chiếu runtime revision khác docs/test commit.
