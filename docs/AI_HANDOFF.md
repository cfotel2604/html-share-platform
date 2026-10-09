# AI Agent handoff — HTML Share Platform

> Bàn giao **2026-10-09 (Asia/Saigon)**. GitHub/CI/runtime đã xác minh phiên #8/#10. Đọc cùng [PROJECT_STATUS](PROJECT_STATUS.md), [validation](validation/2026-10-09-auth-origin-gates.md) và [SECURITY_LAB](SECURITY_LAB.md).

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
- **Clerk thật chưa bật**: user đã có instance, sẽ đặt keys và gửi email/roles; tại deploy chưa nhận inputs. AUTH_MODE=local-demo trong Compose invocation, không chỉnh owner `.env`. Chưa real Google/allowlist/OAuth smoke; không ghi email/key trong docs.

## Worktrees và vận hành

- Task **C:\Users\admin\Documents\Codex\html-share-platform-pr5-sync**, branch codex/8-10-auth-origin-gates; cập nhật PR #13, không push nhầm #5/#12. Main checkout vẫn `78cb7ca`.
- Owner **C:\Users\admin\Documents\Codex\html-share-platform-local-mvp** `b3f8119`, `.env`/compose nguyên vẹn. Up dùng Compose owner **+ compose.security.yaml** source mới, SECURITY_IMAGE đúng tag, --no-deps --no-build web gateway; build owner cũ sẽ lùi code. Foundation cổng 3000 không đổi.
- Gateway `*.uploads.localhost:4100`, Chrome resolve loopback không chỉnh DNS; viewer `/view/<id>` giữ nguyên, gateway `/s/<id>` cũ không dùng. Backfill trước gateway mới; NULL manifest 404 fail closed.
- Rollback giữ **html-share-studio:rollback-before-security-20261009** và **html-share-gateway:rollback-before-security-20261009**. Commands/IDs trong validation; giữ additive schema, không đảo migration/down --volumes. Sau có Clerk ownership thật review rollback riêng.
- Test projects html-share-security-checks/html-share-upload-test đã down, giữ volumes/env synthetic tmp; không áp test overlay lên owner. Guard PGDATABASE=upload_test, ports 3700/4700 rảnh; HTTPS fixture 4443, cert/preview artifacts Git-ignored. Không commit screenshot thật/cookie state.

## Bước tiếp theo

1. Owner đặt CLERK_PUBLISHABLE_KEY/CLERK_SECRET_KEY trong `.env` owner và gửi email/role. Kiểm presence, không in secrets/config đầy đủ. Operator auth-allowlist qua stdin theo SECURITY_LAB; bật Clerk/smoke Google deny/revoke/logout. Owner thao tác Google login, không gửi credentials. Giữ owner cũ; Clerk Admin quản lý tất cả, Employee có owner mới.
2. Review #5 → #12 → #13; sau merge dependency đổi base/check CI. Giữ #13 Draft đến gate/review; không tự merge/DNS/production.
3. #10: DNS/Workers/reserved inventory read-only, wildcard diff/rollback, staging TLS/Full (strict), R2 private/IAM/cleanup, hostname log redaction, Safari/iOS/Android/Zalo, representative packages. ADR-0001/0003 Proposed. P5/P6 orphan/rate/concurrency/retention còn mở.

COMMIT response loss là unknown outcome; không xóa objects chưa đối chiếu DB references. Không nới sandbox để chạy demo. no-store không thu hồi tab đã tải. Cập nhật docs branch/PR được giao; luôn đối chiếu runtime revision khác docs/test commit.
