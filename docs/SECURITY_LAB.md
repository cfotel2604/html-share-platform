# Cấu hình Clerk và gateway cho Docker lab

Implementation #8/#10 ở [PR #13](https://github.com/cfotel2604/html-share-platform/pull/13) đã merge main6d30d22; #15 sau retarget main cũng đã merge main0c17a09 ngày22/10 theo owner giao. #8 lab/P2 CLOSED sau owner detailed acceptance, #10 release gates OPEN. [Validation](validation/2026-10-09-auth-origin-gates.md) là hồ sơ local09/10; [lab handoff](LAB_HANDOFF.md) và [merge record](MERGE_PLAN.md) ghi trạng thái mới. Các lệnh baseline #13 dưới đây không phải yêu cầu build/deploy lại lab hiện hữu.

**VM hiện tại ngày22/10:** dùng [LAB_HANDOFF](LAB_HANDOFF.md) và [env/overlay samples](../deploy/lab-public.env.example) làm điểm vào vận hành. Web #15 đã chạy, DB0003/backfill xong, owner xác nhận khách ngoài tải iframe sau mở443. Các lệnh bootstrap/local Desktop và snapshot21/10 bên dưới không phải yêu cầu reconfigure/redeploy VM hiện hữu. Review/merge theo [MERGE_PLAN](MERGE_PLAN.md); private R2/production/security gates vẫn riêng.

## Google/Clerk Development

Trong Clerk Development instance, bật Google; tắt các phương thức login khác để phù hợp mô hình đã chọn. Server còn kiểm tra primary email verified và Google external account khớp email. Lưu keys trong `.env` của **checkout owner** `html-share-platform-local-mvp`, không checkout main/Issue/chat:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
AUTH_MODE=local-demo
AUTH_TRUSTED_ORIGINS=http://127.0.0.1:3100,http://localhost:3100
```

Điền keys trong local secret file; gửi operator email/role. **Giữ local-demo khi chuẩn bị**; chuyển AUTH_MODE=clerk sau cấp Admin allowlist/xác minh key pair. Compose nhận tên chuẩn NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY hoặc CLERK_PUBLISHABLE_KEY; tên thứ hai ưu tiên nếu có cả hai, runtime normalize về CLERK_PUBLISHABLE_KEY. Publishable key public theo thiết kế; secret không UI/bundle/gateway/migrate, không prefix NEXT_PUBLIC cho secret. Clerk không nhận demo/fallback. **Lab hiện đã bật Clerk**, keys Development cùng instance, 1 Admin/1 Employee active, owner xác nhận Google Admin login/list và Employee login; không cần cấp lại policy hoặc nhập lại keys.

Migrations phải chạy trước auth policy. Chuẩn bị JSON trong file **Git-ignored** `tmp/auth-policy.json` ở checkout source mới (email ví dụ, thay bằng email được owner giao):

```json
{"action":"allow","email":"admin@example.test","role":"admin"}
```

Chạy qua stdin, không đưa email/key lên argv/logs:

```powershell
Get-Content -Raw tmp/auth-policy.json | docker exec -i html-share-local-mvp-web-1 node scripts/auth-allowlist.mjs
```

Lần bootstrap do operator có quyền DB; actor null trong audit. Các lần tiếp có thể cung cấp `actorId` của Admin active. `allow` cấp/cập nhật role; `revoke` disable allowlist; `disable-user` khóa identity đã tạo. Cấp lại allowlist không tự bật user bị disabled; operator phải review riêng việc khôi phục user. Email trong DB không ghi vào report/log.

Google/Clerk tạo identity mới; site lab giữ owner cũ. Admin được quản lý mọi site và audit; Employee bắt đầu với site mình tạo. Không chuyển site/owner tự động. Request sau revoke/disabled bị từ chối; role từ frontend/JWT không thay role DB. API bị chặn trên viewer/unknown Host, mutation còn yêu cầu exact configured Origin.

Sau khi keys/allowlist có đủ, recreate riêng web bằng security overlay; thử Google sign-in, email ngoài allowlist, Employee A/B, Admin, revoke và logout. Không có key/Google identity thật thì chỉ có bằng chứng unit/SDK JWT + DB integration, chưa hoàn thành end-to-end #8. Clerk production/OAuth credentials và vận hành provider quota là gate release riêng.

Lab đã migrate/backfill: bật/restart auth không cần rebuild hoặc recreate gateway/DB/MinIO. Khi `.env` owner có AUTH_MODE=clerk, xóa AUTH_MODE override local-demo khỏi shell hiện tại trước khi recreate web. Dùng image đã kiểm:

```powershell
$labRoot = (Resolve-Path ../html-share-platform-local-mvp).Path
$sourceRoot = (Get-Location).Path
$env:SECURITY_IMAGE = 'html-share-studio:security-613f2b7'
Remove-Item Env:AUTH_MODE -ErrorAction SilentlyContinue
docker compose -p html-share-local-mvp --project-directory $labRoot --env-file "$labRoot/.env" -f "$labRoot/compose.yaml" -f "$sourceRoot/compose.security.yaml" up -d --no-deps --no-build --wait web
```

Đặt labRoot/sourceRoot như phần deploy bên dưới. Rollback riêng auth dùng cùng security image, AUTH_MODE=local-demo và recreate web; không đổi gateway/schema hoặc xóa allowlist. Chỉ dùng khi operator quyết định rollback, không tự fallback từ lỗi Clerk. Nếu rollback cần tồn tại sau phiên shell, cập nhật AUTH_MODE trong env private; giữ keys nguyên vẹn.

## Deploy/rollback local

Giữ Compose/.env/volumes owner hiện hữu. Candidate phải đã lint/typecheck/tests/build/integration/browser. Docker services vẫn bind loopback; không đổi DNS.

```powershell
$labRoot = (Resolve-Path ../html-share-platform-local-mvp).Path
$sourceRoot = (Get-Location).Path
$env:SECURITY_IMAGE = 'html-share-studio:security-<verified-commit>'
docker compose -p html-share-local-mvp --project-directory $labRoot --env-file "$labRoot/.env" -f "$labRoot/compose.yaml" -f "$sourceRoot/compose.security.yaml" config --quiet
docker compose -p html-share-local-mvp --project-directory $labRoot --env-file "$labRoot/.env" -f "$labRoot/compose.yaml" -f "$sourceRoot/compose.security.yaml" stop web
docker compose -p html-share-local-mvp --project-directory $labRoot --env-file "$labRoot/.env" -f "$labRoot/compose.yaml" -f "$sourceRoot/compose.security.yaml" run --rm --no-deps migrate
docker compose -p html-share-local-mvp --project-directory $labRoot --env-file "$labRoot/.env" -f "$labRoot/compose.yaml" -f "$sourceRoot/compose.security.yaml" run --rm --no-deps --entrypoint node web scripts/backfill-manifests.mjs
docker compose -p html-share-local-mvp --project-directory $labRoot --env-file "$labRoot/.env" -f "$labRoot/compose.yaml" -f "$sourceRoot/compose.security.yaml" up -d --no-deps --no-build web gateway
```

Migration 0002 thêm email/allowlist, asset manifest, preview grants; runner checksum/advisory lock giữ nguyên. Stop web ngắn tránh code cũ tạo version NULL manifest giữa backfill/deploy. Backfill đọc assets/so fingerprint, chỉ ghi manifest; không site pointer/storage bytes. Nếu thất bại thì dừng candidate, **khởi động lại web/gateway bằng rollback images ngay**, giữ schema bổ sung. Kiểm baseline sites, DB/MinIO IDs/mounts và health/browser. Lab owner đã chạy 0002/backfill 17 versions, image security-613f2b7; các lần recreate cùng image không cần stop/migrate/backfill lại nếu manifests không thiếu.

Default overlay dùng local-demo, `*.uploads.localhost:4100` cho root assets. Chrome resolve localhost subdomains về loopback, không cần chỉnh hosts/DNS máy. URL `/view/<id>` cũ vẫn là trusted shell. Host không hợp lệ/path gateway cũ trả 404 sau hostname mode; link viewer giữ nguyên.

Rollback: dùng **Compose owner + override chỉ hai rollback images** trong validation, không security overlay; tags web html-share-studio:rollback-before-security-20261009 và gateway html-share-gateway:rollback-before-security-20261009. Recreate cả web/gateway, khôi phục gateway path config. Giữ additive schema/manifests, không down --volumes/đảo migration. Nếu đã có Clerk ownership thật, review compatibility trước rollback; không reassign tự động.

## Kiểm thử riêng

```powershell
docker build -t html-share-security:ci .
node scripts/run-security-integration.mjs
```

Runner tạo env synthetic riêng trong tmp và project html-share-security-checks, guard PGDATABASE=upload_test. Giữ test volumes/env khi down; không dùng credentials owner. Cổng 3700/4700 phải rảnh. CI chạy cùng runner, không browser/DNS thật.

Browser probe dùng `compose.origin-browser-test.yaml` trên project test, certificate self-signed chỉ local trong tmp/origin-tls, synthetic fixture trong tmp/origin-browser. Chạy service origin-fixtures ngay trước browser để grant còn TTL; origin-front trả fixture IDs không chứa token. Playwright CLI nạp `tests/browser/origin.js`; config ignoreHTTPSErrors và host-resolver-rules chỉ cho .test ở local. Không dùng bypass chứng chỉ này cho production. Desktop Chrome đã kiểm iframe/direct index/nested .htm, cookie/storage, service worker/worker, popup/top navigation, root CSS/classic/modules/fetch/HTTPS CDN, private preview, viewer route denial và existing host fixtures.

## VM lab và domain đã chốt

[ADR-0004](adr/0004-domains-and-share-codes.md) chốt production Studio/viewer/content và lab `studio-lab.ods.vn`, `view-lab.ods.vn`, `*.lab-space-ods.cfvn.cloud`. [Nghiệm thu VM](validation/2026-10-09-lab-domain-tls.md) ghi runtime riêng `security-417c50d`/project `hsp-lab`, certificate thật, loopback app ports và timer gia hạn. Docker Desktop vẫn image `security-613f2b7`; không đồng nhất hai stack.

**Cập nhật VM 2026-10-21:** public Studio/viewer HTTPS đã sẵn sàng; owner xác nhận step-5 retests/private preview. Agent kiểm nguồn/runtime417c50d healthy, effective trusted Studio HTTPS/canonical viewer HTTPS, gateway preview/viewer origins và content domain đúng lab; PUBLIC_SITE_PORT rỗng cả web/gateway. Studio/viewer published200, viewer API404, direct HTTP sandbox/frame-ancestors đúng viewer. [Readiness mới](validation/2026-10-21-lab-public-origins.md) thay snapshot tunnel-only cũ; giữ compose.lab.yaml/compose.edge.yaml untracked. Short-link candidate chưa deploy, DB mới0001/0002. Có thể kiểm qua `ssh lab-b`, không ghi key/VM credentials vào Git.

**Cấu hình public origins lab đã áp dụng** (STUDIO_PUBLIC_ORIGIN cũng dùng để suy gateway preview origin; trusted origins có thể còn loopback cho vận hành):

```dotenv
AUTH_MODE=clerk
STUDIO_PUBLIC_ORIGIN=https://studio-lab.ods.vn
AUTH_TRUSTED_ORIGINS=https://studio-lab.ods.vn
VIEWER_PUBLIC_ORIGIN=https://view-lab.ods.vn
GATEWAY_MODE=hostname
PUBLIC_SITE_DOMAIN=lab-space-ods.cfvn.cloud
PUBLIC_SITE_SCHEME=https
PUBLIC_SITE_PORT=
GATEWAY_FRAME_SOURCE=https://*.lab-space-ods.cfvn.cloud
```

compose.security.yaml hiện gán PUBLIC_SITE_PORT từ GATEWAY_PORT nên env rỗng ở trên **chưa đủ**. Thêm overlay cuối như runbook đang dùng để override effective environment, giữ port bind loopback 3100/4100:

```yaml
services:
  db:
    ports: !reset []
  minio:
    ports: !reset []
  web:
    environment:
      PUBLIC_SITE_PORT: ""
  gateway:
    environment:
      PUBLIC_SITE_PORT: ""
```

Security overlay suy GATEWAY_VIEWER_ORIGIN từ VIEWER_PUBLIC_ORIGIN và GATEWAY_PREVIEW_ORIGIN từ STUDIO_PUBLIC_ORIGIN. Kiểm cấu hình bằng `docker compose ... config --quiet` rồi chỉ lọc các field public được phép; không dump toàn config/env chứa secrets. Production dùng cấu hình tương ứng trong ADR-0004 và wildcard certificate/gia hạn riêng.

PR #15 đã merge viewer10base62/mapping/rotate/revoke/reissue và fix EACCES#16; #14/#16 CLOSED. [Kiểm chứng local](validation/2026-10-09-short-viewer-links.md) pass; VM web đã cutover candidate dc7560e, migration0003/backfill xong ngày22/10 theo [lab handoff](LAB_HANDOFF.md), owner xác nhận detailed session/link lifecycle cases đều đạt. Desktop chưa xác minh cutover. Không yêu cầu lặp [backfill/runbook](SHARE_LINKS.md) trên VM đã chạy; alias host-ID32hex trả404. Không rollback binary cũ bật lại alias sau revocation. Đổi mã không chặn direct URL; unpublish/delete mới chặn request nội dung mới.

## Gate trước public (#10 vẫn mở)

Kiểm kê DNS/route/redirect/reserved names và website hiện hữu bằng credentials read-only (Workers nếu có); review wildcard diff/regression/rollback trước thay đổi. TLS content lab đã kiểm trên VM; tiếp kiểm trusted Studio/viewer hostname và production wildcard/renewal riêng. Baseline nginx + Let's Encrypt DNS-01 không yêu cầu Cloudflare Edge/Origin CA. R2 bucket private, IAM gateway read-only/API write+cleanup và không public r2.dev. Redact preview-capability hostname khỏi access/log/analytics, không ghi Cookie/Authorization/query/HTML; kiểm cả error/DNS/collector, không suy ra toàn pipeline an toàn từ access log count 0. Kiểm Safari/iOS, Android Chrome thật, Zalo và compatibility fixtures; owner/security review ADR-0001, staging/pilot trước production. Không đánh dấu các gate này xong từ test .test/self-signed/MinIO hoặc chỉ từ nghiệm thu TLS. VM hiện MinIO legacy không publish storage ports; hiện trạng này không mở rộng ngoại lệ legacy cho staging/pilot/production. Cần private R2 trước bước đó.

## Nguồn kỹ thuật đã đối chiếu

[Clerk authenticateRequest](https://clerk.com/docs/reference/backend/authenticate-request), [Clerk middleware](https://clerk.com/docs/reference/nextjs/clerk-middleware), [Next proxy body buffering](https://nextjs.org/docs/pages/api-reference/config/next-config-js/proxyClientMaxBodySize), [CSP sandbox](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/sandbox), [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Origin), [tldts PSL](https://github.com/remusao/tldts).
