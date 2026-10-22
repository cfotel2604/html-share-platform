# Project status — HTML Share Platform

> Snapshot **2026-10-22 (Asia/Saigon)**: owner giao retarget/review #13, sau đó xử lý #15. #13 đã đổi base main6bdd298, đang sync/kiểm CI; chỉ conflict docs status/handoff, runtime không conflict. Chưa merge #13/#15 hoặc deploy. [AI_HANDOFF](AI_HANDOFF.md), [review #5/recovery](reviews/2026-10-22-pr5-and-studio-merge.md), [validation #13](validation/2026-10-09-auth-origin-gates.md).

## Mốc hiện tại

- Main `6bdd298ab89dfe9a9061fb64203d3b3215fe4809` đã có #5 và UI #12 qua recovery #17. #9/#11 CLOSED; #8/#10/#14/#16 OPEN.
- #13 Draft, branch codex/8-10-auth-origin-gates, **base main**. Merge main chỉ đụng docs/status/handoff; giữ Clerk/RBAC/hostname/preview implementation từ4ac9689 và ghi lại source equality/schema checksums. CI đúng head mới phải kiểm sau push.
- #15 Draft vẫn base #13 để diff short-link riêng; đồng bộ dependency sau #13 sync. Không retarget #15 main trước khi dependency vào main rồi hiểu nhầm diff auth thành scope share-link.
- **Owner xác nhận từng case đều đạt ngày22/10:** Employee không sửa site người khác; Admin mutation/audit đúng actor; email ngoài allowlist bị chặn; revoke/disable và logout chặn phiên cũ; rotate/revoke/reissue và unpublish chặn link cũ. Đây là owner-confirmed real-session evidence, không giả làm browser test do agent chạy.
- Lab đã chạy web/source dc7560e với short links và DB0001/0002/0003; gateway security-417c50d. Public Studio/viewer HTTPS, owner mở443 và xác nhận iframe ngoài office. SECURITY_IMAGE đã lưu private env, SSH/Compose config không shell override PASS. Không migrate/backfill/restart hoặc đổi env/allowlist/data trong retarget/review.
- Test lịch sử #13:79unit/15integration groups/Chrome local; chạy CI mới cho source đã sync main. ADR-0001/0003 vẫn Proposed cho security/release; R2/cookie sibling/mobile/Zalo/log/edge/DNS/renewal/production OAuth/pilot vẫn là gates riêng.

## Bằng chứng và ranh giới review

Auth đọc verified Google identity + session active online + allowlist/status/role DB; exact Origin/Host, Employee owner-only/Admin audit và fresh actor locks trước storage. API upload không đi qua Next proxy buffering; HTTP/iframe sandbox, hostname/PSL/manifest/digest/private preview giữ nguyên. Không phát hiện blocker mới trong phần code đã đọc; kết luận cuối và CI ghi trong review report sau kiểm tra.

Nhánh #13 chưa chứa share-code implementation/0003/EACCES fix của #15, mặc dù lab đã chạy chúng. Không build/deploy main hoặc #13 trung gian để lùi lab short links. Handoff lab đầy đủ đang ở [PR #15](https://github.com/cfotel2604/html-share-platform/pull/15), không chép code #15 vào PR auth để giải quyết docs.

## Hồ sơ09/10 trước retarget — lịch sử


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
