# Project status — HTML Share Platform

> Snapshot **2026-10-09 (Asia/Saigon)**, đã đối chiếu GitHub/CI, bổ sung HTTPS/SSH chỉ đọc VM lab và owner-confirmed Employee login. Snapshot PR head trước cập nhật docs là `417c50d`. Đọc cùng [AI_HANDOFF](AI_HANDOFF.md), [PLAN](../PLAN.md) và [AGENTS](../AGENTS.md). Markdown không thay GitHub live.

## Tiến độ đã kiểm chứng

| Hạng mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| P0/P1/handoff | PR #2/#4/#7 merged; origin/main `78cb7ca` | Git log và GitHub |
| Local MVP | PR #5 Ready, head `235cc62`, base main; chưa merge | [PR #5](https://github.com/cfotel2604/html-share-platform/pull/5) |
| Upload #9 | Findings đã sửa; integration regression vẫn pass sau auth mới | [Validation #9](validation/2026-10-09-upload-hardening.md) |
| Studio UI | PR #12 Ready, head `4ab546a`, base codex/local-mvp; chưa merge | [PR #12](https://github.com/cfotel2604/html-share-platform/pull/12) |
| Auth/RBAC #8 | Clerk Development đã bật, allowlist 1 Admin/1 Employee; Google Admin login/list và Employee login được owner xác nhận; server kiểm identity Google thật | [Draft PR #13](https://github.com/cfotel2604/html-share-platform/pull/13); ownership/mutations/deny/revoke/logout thật còn chờ |
| Origin #10 | Hostname, manifest/digest, HTTP/iframe sandbox, trusted viewer và private preview; Chrome local pass | [Validation](validation/2026-10-09-auth-origin-gates.md); TLS content VM thật đã kiểm; trusted viewer/R2/Safari/Zalo còn mở |
| Kiểm thử | 79 unit tests; lint/typecheck/build; 9 nhóm upload + 6 nhóm DB/S3 integration; CI cả 3 jobs SUCCESS tại `417c50d` trước mốc docs này | [application](https://github.com/cfotel2604/html-share-platform/actions/runs/37896443966), [docs](https://github.com/cfotel2604/html-share-platform/actions/runs/37896443885), [security](https://github.com/cfotel2604/html-share-platform/actions/runs/37896443936) |
| Docker owner | Web/gateway healthy, image html-share-studio:security-613f2b7; AUTH_MODE=clerk lưu trong env private | http://127.0.0.1:3100; [deploy/rollback](validation/2026-10-09-auth-origin-gates.md) |
| VM lab TLS | `hsp-lab`, source/image `417c50d`; web/gateway healthy, TLS Let's Encrypt wildcard lab, nginx/timer PASS | [Nghiệm thu VM](validation/2026-10-09-lab-domain-tls.md); app ports loopback, storage ports không publish |
| Domain/link decision | Production/lab domains Accepted; viewer 10 base62 tách host ID 128 bit **chưa triển khai** | [ADR-0004](adr/0004-domains-and-share-codes.md); Studio/viewer VM hiện qua tunnel |
| Preservation | Auth activation giữ 10 site; chỉ web recreate, gateway/DB/MinIO IDs và data mounts không đổi | Trước đó 17 legacy versions backfill; 9 sites cũ + 1 fixture unpublished |
| Tracking | #1/#3/#6 CLOSED; #8/#9/#10/#11 OPEN | #9/#11 chờ review/merge; #8/#10 còn gate bên ngoài |

Owner đã giao #8/#10 và Docker local. Mốc hostname thay web/gateway, migration **0002 bổ sung**, không sửa 0001/storage/site pointers. Mốc Clerk chỉ recreate web, dùng keys owner đặt trong `.env`, thêm AUTH_MODE=clerk; secret/credentials khác giữ nguyên. Checkout owner `b3f8119`, foundation cổng 3000 không đổi. Không sửa main, merge PR, đổi DNS hoặc deploy production.

## Kết quả và giới hạn

API kiểm session server, allowlist/role DB; mutation exact Origin/Host. Ownership trước ingest và fresh actor/role dưới locks; online revoke/provider fail closed, không fallback demo. Keys Development khớp cùng instance (BAPI + public JWKS), secret chỉ web; Compose nhận NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY hoặc CLERK_PUBLISHABLE_KEY (ưu tiên tên thứ hai). Owner đã xác nhận Google Admin login/thấy website và Employee login thành công; server đối chiếu primary email verified/Google external identity với allowlist. Unit/DB integration pass cho Employee/deny/revoke/CSRF; login thật không chứng minh owner-only/mutation/audit/deny/revoke/logout, các luồng đó chưa smoke đầy đủ. Guest/spoof API 401, unknown Host 404, CSRF 403, demo login bị tắt 503 đã kiểm trên Clerk lab.

Gateway chỉ serve manifest bất biến sau kiểm size/SHA-256, hostname và trạng thái. Private preview: grant 128-bit, DB hash, actor/site/version scope, TTL 3 phút. HTTP sandbox mọi HTML, iframe không allow-same-origin; viewer host riêng không mở API/sign-in/preview. Chrome 154 HTTPS `.test` chứng minh cookie/storage/workers/popup/top navigation bị chặn, root CSS/classic/modules/fetch/HTTPS CDN hoạt động. Self-signed/DNS override chỉ local, không thay chứng cứ domain/TLS thật. Owner dùng `*.uploads.localhost:4100`, viewer `/view/<id>` giữ nguyên.

Regression #9 giữ cap stream 22 MiB trước parser, file 20 MiB, denied zero writes, rollback/cleanup và hostile ZIP tests. API auth dùng Clerk SDK trực tiếp; Next proxy không chạy API để tránh body buffering/truncation làm hỏng early 413. COMMIT unknown giữ objects/trả 503; cleanup failure/crash còn cần reconciliation, lifecycle/rate/concurrency P5/P6 chưa triển khai. `no-store` chặn request mới sau unpublish, không thu hồi tab đã tải.

## Quyết định owner

- Studio ODS blue, sáng/tối; presentation → workflow → typed HTTP adapter → backend. ESLint enforce ADR-0002; Next cùng web container lab, gateway riêng, có thể thay UI sau.
- Domain đã chốt 2026-10-09: Studio `studio.ods.vn` / `studio-lab.ods.vn`; trusted viewer `view.ods.vn/<share-code>` / `view-lab.ods.vn/<share-code>`; HTML `<host-id>.space-ods.cfvn.cloud` / `<host-id>.lab-space-ods.cfvn.cloud`. ADR-0004 Accepted về lựa chọn domain/link; ADR-0001/0003 vẫn Proposed cho security/release review. TLS content lab đã có nginx/Let's Encrypt DNS-01; production chưa triển khai. Cookie boundary phải kiểm `Domain=cfvn.cloud`, kể cả sibling/cross-environment.
- Host ID giữ 32 hex/128 bit; chốt share code 10 base62 server mapping, rotation không thu hồi direct URL. Code hiện còn viewer ID dài, alias migration/collision/rate limiting phải xử lý trong thay đổi riêng.
- Production R2 private; MinIO legacy là lựa chọn local, VM hiện dùng nội bộ theo runbook nhưng không thay gate R2/không mở rộng ngoại lệ staging/production. Docker/VPS giai đoạn đầu. ZIP 20 MiB nén / 100 MiB giải nén / 500 files / depth 12 / 1000 entries.
- Retention configurable; backup/restore ngoài MVP theo owner.

## Việc tiếp theo

1. Keys/allowlist/Google Admin và Employee login đã xong theo owner. Tiếp theo smoke Employee owner-only và Admin mutation/actual audit, email ngoài allowlist, policy revoke/disabled và logout với session thật theo [SECURITY_LAB](SECURITY_LAB.md); dùng fixture riêng, không sửa site cũ. Không ghi email/key vào chat logs/Issue/docs. Giữ Clerk mode, không tự fallback demo.
2. Review chain #5 → #12 → #13; #13 Draft, base codex/11-studio-ui. Sau dependency merge đổi base/check CI; chưa được giao merge tự động. #8/#10 chưa đóng.
3. #10: chuyển trusted Studio/viewer lab từ tunnel sang hostname đã chốt khi vhost/DNS/TLS/Clerk redirects đạt; browser direct/iframe/preview trên domain thật. Tiếp read-only DNS/route/reserved inventory/regression/rollback, production wildcard/renewal riêng, R2 IAM/cleanup, preview hostname log redaction toàn pipeline, Safari/iOS/Android/Zalo và owner/security review ADR-0001; staging/pilot trước production. P5/P6 lifecycle/orphan/rate/concurrency còn mở.
4. Triển khai share-code/mapping/rotation riêng theo ADR-0004; không giả định URL base62 đã chạy. Chỉ đổi viewer code không thu hồi published content.

## Kiểm chứng lại

Fetch origin --prune, log origin/main, gh pr view 5/12/13 với state/isDraft/headRefOid/mergeable/statusCheckRollup, gh issue list. Runtime Docker Desktop revision `613f2b77ac00179f33d6bf13c08007a87b910963`; VM image/source `417c50d` (digest ở nghiệm thu VM); test/CI fix `5ab1807` không đổi runtime. Các lần up owner phải giữ **compose.security.yaml và SECURITY_IMAGE đúng tag**, không build checkout owner cũ. Bàn giao trong branch được giao, không main.
