# Project status — HTML Share Platform

> Snapshot **2026-10-21 (Asia/Saigon)**: GitHub và VM đã đối chiếu chỉ đọc; public Studio/viewer lab sẵn sàng. Candidate short-link chưa cutover. Các kết quả unit/integration/browser ngày09/10 dưới đây là lịch sử, không rerun ngày21/10. Đọc cùng [AI_HANDOFF](AI_HANDOFF.md), [readiness mới](validation/2026-10-21-lab-public-origins.md), [PLAN](../PLAN.md) và [AGENTS](../AGENTS.md). Markdown không thay GitHub live.

## Public origins lab — đã đạt 2026-10-21

**Sự cố mới nhất:** migrate 8.2.2 trên image b1e3c26 lỗi EACCES vì migration/script root-owned0600 sau checkout umask077. DB vẫn0001/0002; agent đã khôi phục web cũ security-417c50d healthy, gateway/DB/storage giữ nguyên. Dừng retry bằng image cũ, đang sửa Dockerfile + CI restrictive-mode regression và chuẩn bị candidate mới trong [#16](https://github.com/cfotel2604/html-share-platform/issues/16). [Hồ sơ sự cố](validation/2026-10-21-runtime-permissions.md) phân biệt dữ liệu đã kiểm và bước tiếp theo; owner tiếp tục 8.2.2 sau candidate/preflight mới, không bật 8.2.3 trước backfill/metadata checks.

Owner xác nhận Studio/viewer HTTPS, step-5 retests và private preview hoạt động. Agent kiểm độc lập qua SSH/HTTPS: Studio200, viewer published200/no-store/no-cookie, viewer API404; direct content200/HTTP sandbox/frame-ancestors đúng viewer public. Effective origins/content domain/port rỗng đúng cấu hình. Không cần chờ hai hostname nữa.

Runtime web/gateway VM vẫn `417c50d`, cùng DB/storage healthy. Owner đã hoàn tất 8.2.1: source checkout detached `b1e3c26019443d434b620eec2382c45982396eb3` và build `html-share-studio:share-b1e3c2601944`; agent kiểm SSH chỉ đọc, image ID `sha256:d51e137cdac7b674602a2c5e7520a0a8368d8e3e4def190f597a5c20e2846c66`, revision label đúng reviewed SHA. DB vẫn 0001/0002, chưa bảng mã chia sẻ, 2 sites/2 versions; không so với Desktop lịch sử. PR #15 candidate chưa phục vụ; #13/#15 vẫn Draft. Mốc public-origin và trạng thái GitHub trước build ở [readiness](validation/2026-10-21-lab-public-origins.md).

Ưu tiên tiếp: review/cutover #15 sau khi được giao, migration0003/backfill và smoke HTTPS thật, rồi hoàn tất real-session #8 và các gate #10/R2/mobile/pilot. Không deploy/merge hoặc đổi VM từ lần kiểm chỉ đọc này.

Runbook update cùng ngày 21/10: owner yêu cầu giải thích merge/migration và bổ sung mục 8 ứng dụng. Đã tách 8.1 cài mới, 8.2 nâng cấp PR #15; ghi rõ base #13 không phải main, source → image → migration 0003 → backfill → web, metadata checks và rollback trước/sau go-live. Mục 11 là tháo hạ tầng. Đối chiếu Compose effective bằng image placeholder chỉ đọc và kiểm 6 Bash blocks/READ ONLY SQL trên VM PASS; không build/deploy/migrate/backfill/merge. Repo trước cập nhật docs `4cf3e0c`, code candidate không đổi. Chi tiết [SHARE_LINKS](SHARE_LINKS.md).

Review build lab cùng ngày: đã review diff #15 head `b1e3c26019443d434b620eec2382c45982396eb3` so với base #13 `4ac9689`, chưa phát hiện blocker cho bước lấy source/build. Đã ghim SHA đó trong runbook 8.2.1; local 86 unit/lint/typecheck/docs PASS và 3 CI jobs của reviewed SHA SUCCESS. [Hồ sơ review](validation/2026-10-21-pr15-build-review.md) ghi phạm vi/giới hạn. PR vẫn Draft; không merge, build VM, migrate/backfill hoặc restart từ phiên này. Không tự thay pin bằng docs HEAD mới.

Nghiệm thu 8.2.1 cùng ngày: owner gửi image/revision và `tmp/share-cutover-images.txt`; SSH xác nhận source/image/rollback record khớp, Compose đủ base/security/lab/edge chọn candidate đúng cho web/migrate/gateway, Clerk/public origins/port rỗng giữ nguyên, storage không publish ports. Agent không thực hiện mutation VM. Tiếp owner chạy trọn 8.2.2 trong cùng phiên Bash (metadata trước/sau, migrate0003/backfill, history thiếu=0); bước đó mới dừng web. Chưa bật web candidate ở 8.2.3. Kết quả chi tiết cập nhật cuối [hồ sơ review/build](validation/2026-10-21-pr15-build-review.md).

## Tiến độ code và nghiệm thu lịch sử 2026-10-09

| Hạng mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| P0/P1/handoff | PR #2/#4/#7 merged; origin/main `78cb7ca` | Git log và GitHub |
| Local MVP | PR #5 Ready, head `235cc62`, base main; chưa merge | [PR #5](https://github.com/cfotel2604/html-share-platform/pull/5) |
| Upload #9 | Findings đã sửa; integration regression vẫn pass sau auth mới | [Validation #9](validation/2026-10-09-upload-hardening.md) |
| Studio UI | PR #12 Ready, head `4ab546a`, base codex/local-mvp; chưa merge | [PR #12](https://github.com/cfotel2604/html-share-platform/pull/12) |
| Auth/RBAC #8 | Clerk Development đã bật, allowlist 1 Admin/1 Employee; Google Admin login/list và Employee login được owner xác nhận; server kiểm identity Google thật | [Draft PR #13](https://github.com/cfotel2604/html-share-platform/pull/13); ownership/mutations/deny/revoke/logout thật còn chờ |
| Origin #10 | Hostname, manifest/digest, HTTP/iframe sandbox, trusted viewer và private preview; Chrome local pass | [Validation](validation/2026-10-09-auth-origin-gates.md); TLS content VM thật đã kiểm; trusted viewer/R2/Safari/Zalo còn mở |
| Short viewer #14 | 10 base62 exact-case, canonical URL, atomic rotate/revoke/reissue; aliases host ID 404; migration 0003/backfill | [Draft PR #15](https://github.com/cfotel2604/html-share-platform/pull/15), base codex/8-10-auth-origin-gates; [runbook](SHARE_LINKS.md) |
| Kiểm thử candidate | 86 unit; lint/typecheck/build/Docker; 9 upload + 6 auth/origin + 5 share integration; Chrome 4 Studio + 6 origin nhóm PASS | [Validation #14](validation/2026-10-09-short-viewer-links.md), runtime `1c183f50c0d90c109ff23ef84e23e04adff5a7c7` |
| CI dependency #13 | 3 jobs SUCCESS tại `4ac9689`; CI #15 cần đối chiếu đúng head sau push | [application](https://github.com/cfotel2604/html-share-platform/actions/runs/37941154711), [docs](https://github.com/cfotel2604/html-share-platform/actions/runs/37941154707), [security](https://github.com/cfotel2604/html-share-platform/actions/runs/37941154515) |
| Docker owner | Baseline đã nghiệm thu image security-613f2b7, AUTH_MODE=clerk private env; lần #14 chưa redeploy/khẳng định health hiện tại | [deploy/rollback trước #14](validation/2026-10-09-auth-origin-gates.md) |
| VM lab TLS | Theo nghiệm thu trước: `hsp-lab`, source/image `417c50d`, TLS Let's Encrypt/nginx/timer PASS; lần #14 chưa recheck/cutover | [Nghiệm thu VM](validation/2026-10-09-lab-domain-tls.md); loopback ports/storage không publish |
| Domain/link decision | Domains Accepted; mã ngắn đã có code/test #15; trusted hostname/cutover VM chờ owner | [ADR-0004](adr/0004-domains-and-share-codes.md) |
| Preservation | Auth activation giữ 10 site; chỉ web recreate, gateway/DB/MinIO IDs và data mounts không đổi | Trước đó 17 legacy versions backfill; 9 sites cũ + 1 fixture unpublished |
| Tracking | #1/#3/#6 CLOSED; #8/#9/#10/#11/#14 OPEN | #9/#11 chờ review/merge; #8/#10 gates thật, #14 review/cutover |

Owner đã giao #8/#10 và Docker local. Mốc hostname thay web/gateway, migration **0002 bổ sung**, không sửa 0001/storage/site pointers. Mốc Clerk chỉ recreate web, dùng keys owner đặt trong `.env`, thêm AUTH_MODE=clerk; secret/credentials khác giữ nguyên. Checkout owner `b3f8119`, foundation cổng 3000 không đổi. Không sửa main, merge PR, đổi DNS hoặc deploy production.

Mốc #14 owner giao làm song song mã chia sẻ khi cấu hình hai trusted hostnames. Branch `codex/14-short-viewer-links` dựa trên #13 vì dependency chưa merge; candidate chỉ test synthetic isolated project, chưa áp dụng VM/owner Desktop. Test project down không xóa volumes, browser/state riêng đã dọn. PR #15 giữ Draft.

## Kết quả và giới hạn

API kiểm session server, allowlist/role DB; mutation exact Origin/Host. Ownership trước ingest và fresh actor/role dưới locks; online revoke/provider fail closed, không fallback demo. Keys Development khớp cùng instance (BAPI + public JWKS), secret chỉ web; Compose nhận NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY hoặc CLERK_PUBLISHABLE_KEY (ưu tiên tên thứ hai). Owner đã xác nhận Google Admin login/thấy website và Employee login thành công; server đối chiếu primary email verified/Google external identity với allowlist. Unit/DB integration pass cho Employee/deny/revoke/CSRF; login thật không chứng minh owner-only/mutation/audit/deny/revoke/logout, các luồng đó chưa smoke đầy đủ. Guest/spoof API 401, unknown Host 404, CSRF 403, demo login bị tắt 503 đã kiểm trên Clerk lab.

Gateway chỉ serve manifest bất biến sau kiểm size/SHA-256, hostname và trạng thái. Private preview: grant 128-bit, DB hash, actor/site/version scope, TTL 3 phút. HTTP sandbox mọi HTML, iframe không allow-same-origin; viewer host riêng không mở API/sign-in/preview. Chrome 154 HTTPS `.test` chứng minh cookie/storage/workers/popup/top navigation bị chặn, root CSS/classic/modules/fetch/HTTPS CDN hoạt động. Self-signed/DNS override chỉ local, không thay chứng cứ domain/TLS thật. Owner Desktop baseline dùng `*.uploads.localhost:4100` và viewer ID dài; candidate chuyển `/view/<code>` sau cutover.

Share mapping exact-case/tombstones, một active/site; update/publish không phục hồi mã revoked. Backfill khóa site/query history fresh, không sửa metadata/owner/version/storage. Migration 0001/0002 không đổi. Lost COMMIT response trả 503/refresh; viewer budget600/min mỗi process trước DB không thay edge per-IP/distributed policy. Rollback ưu tiên mutation kill-switch, không bật lại aliases bằng binary cũ sau revocation.

Regression #9 giữ cap stream 22 MiB trước parser, file 20 MiB, denied zero writes, rollback/cleanup và hostile ZIP tests. API auth dùng Clerk SDK trực tiếp; Next proxy không chạy API để tránh body buffering/truncation làm hỏng early 413. COMMIT unknown giữ objects/trả 503; cleanup failure/crash còn cần reconciliation, lifecycle/rate/concurrency P5/P6 chưa triển khai. `no-store` chặn request mới sau unpublish, không thu hồi tab đã tải.

## Quyết định owner

- Studio ODS blue, sáng/tối; presentation → workflow → typed HTTP adapter → backend. ESLint enforce ADR-0002; Next cùng web container lab, gateway riêng, có thể thay UI sau.
- Domain đã chốt 2026-10-09: Studio `studio.ods.vn` / `studio-lab.ods.vn`; trusted viewer `view.ods.vn/<share-code>` / `view-lab.ods.vn/<share-code>`; HTML `<host-id>.space-ods.cfvn.cloud` / `<host-id>.lab-space-ods.cfvn.cloud`. ADR-0004 Accepted về lựa chọn domain/link; ADR-0001/0003 vẫn Proposed cho security/release review. TLS content lab đã có nginx/Let's Encrypt DNS-01; production chưa triển khai. Cookie boundary phải kiểm `Domain=cfvn.cloud`, kể cả sibling/cross-environment.
- Host ID giữ 32 hex/128 bit; share code 10 base62 server mapping/rotation/revoke đã triển khai PR #15; runtime VM/owner chưa cutover. Đổi mã chỉ chặn viewer cũ, direct URL còn mở nếu published; unpublish/delete mới chặn request nội dung mới.
- Production R2 private; MinIO legacy là lựa chọn local, VM hiện dùng nội bộ theo runbook nhưng không thay gate R2/không mở rộng ngoại lệ staging/production. Docker/VPS giai đoạn đầu. ZIP 20 MiB nén / 100 MiB giải nén / 500 files / depth 12 / 1000 entries.
- Retention configurable; backup/restore ngoài MVP theo owner.

## Việc tiếp theo

1. Keys/allowlist/Google Admin và Employee login đã xong theo owner. Tiếp theo smoke Employee owner-only và Admin mutation/actual audit, email ngoài allowlist, policy revoke/disabled và logout với session thật theo [SECURITY_LAB](SECURITY_LAB.md); dùng fixture riêng, không sửa site cũ. Không ghi email/key vào chat logs/Issue/docs. Giữ Clerk mode, không tự fallback demo.
2. Review chain #5 → #12 → #13 → #15; #13/#15 Draft. Sau dependency merge đổi base/check CI; chưa được giao merge tự động. #8/#10 chưa đóng.
3. #10: public lab Studio/viewer đã sẵn sàng ngày21/10; owner xác nhận preview/retests, agent kiểm public routes/headers. Tiếp browser direct/iframe/preview/cookie boundary trên domain thật, DNS/route/reserved inventory/regression/rollback, production wildcard/renewal riêng, R2 IAM/cleanup, preview hostname log redaction toàn pipeline, Safari/iOS/Android/Zalo/crawlers và owner/security review ADR-0001; staging/pilot trước production. P5/P6 lifecycle/orphan/rate/concurrency còn mở.
4. Code/test share-code đã xong; khi được giao cutover sau review chạy migration0003 + [backfill/runbook](SHARE_LINKS.md) bằng candidate, kiểm preservation/aliases404/Clerk/CSRF/frame-ancestors/domain thật. Giữ PUBLIC_SITE_PORT rỗng và public-origin overlays hiện có. Gửi link ngắn mới vì viewer URLs dài cũ404; đổi viewer code không thu hồi published content.

## Kiểm chứng lại

Fetch origin --prune, log origin/main, gh pr view 5/12/13/15 với state/isDraft/headRefOid/mergeable/statusCheckRollup, gh issue list. Candidate runtime `1c183f5` khác docs/test-script head. Desktop baseline `613f2b7`, VM nghiệm thu `417c50d` (digest ở nghiệm thu VM), không tự khẳng định hiện tại healthy. Các lần up owner phải giữ **compose.security.yaml và SECURITY_IMAGE đúng tag** cùng VM overlay, không build checkout owner cũ hoặc áp test overlays lên owner. Bàn giao branch được giao, không main.
