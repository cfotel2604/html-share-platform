# Cấu hình Clerk và gateway cho Docker lab

Implementation #8/#10 ở [PR #13](https://github.com/cfotel2604/html-share-platform/pull/13). Dùng branch `codex/8-10-auth-origin-gates`; base Studio vì #5/#12 chưa merge. [Validation](validation/2026-10-09-auth-origin-gates.md) phân biệt bằng chứng local và gate ngoài môi trường.

## Google/Clerk Development

Trong Clerk Development instance, bật Google; tắt các phương thức login khác để phù hợp mô hình đã chọn. Server còn kiểm tra primary email verified và Google external account khớp email. Lưu keys trong `.env` của **checkout owner** `html-share-platform-local-mvp`, không checkout main/Issue/chat:

```dotenv
CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
AUTH_MODE=local-demo
AUTH_TRUSTED_ORIGINS=http://127.0.0.1:3100,http://localhost:3100
```

Điền keys thật trực tiếp trong local secret file; gửi owner/operator danh sách email kèm role Admin/Employee. **Giữ local-demo trong bước chuẩn bị**; operator chuyển AUTH_MODE=clerk sau cấp allowlist Admin và xác minh cấu hình. Publishable key được đưa vào Clerk client theo thiết kế; secret key không có trong UI/bundle. Không dùng env prefix NEXT_PUBLIC cho secret. Clerk mode không nhận mật khẩu demo hoặc fallback khi có lỗi. Tại mốc deploy 2026-10-09, lab vẫn local-demo, chưa nhận keys/email thật.

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

## Gate trước public (#10 vẫn mở)

Kiểm kê Cloudflare DNS, Workers routes, redirects, reserved names và website hiện hữu bằng credentials read-only; review diff wildcard và rollback trước thay đổi. Xác minh Edge/wildcard TLS và Origin CA Full (strict) trên staging được giao. R2 bucket private, IAM gateway read-only/API write+cleanup và không public r2.dev. Redact preview-capability hostname khỏi access/log/analytics, không ghi Cookie/Authorization/query/HTML. Kiểm Safari/iOS, Android Chrome thật, Zalo và compatibility fixtures; owner/security review ADR-0001, staging/pilot trước production. Không đánh dấu các gate này xong từ test .test/self-signed/MinIO.

## Nguồn kỹ thuật đã đối chiếu

[Clerk authenticateRequest](https://clerk.com/docs/reference/backend/authenticate-request), [Clerk middleware](https://clerk.com/docs/reference/nextjs/clerk-middleware), [Next proxy body buffering](https://nextjs.org/docs/pages/api-reference/config/next-config-js/proxyClientMaxBodySize), [CSP sandbox](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/sandbox), [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Origin), [tldts PSL](https://github.com/remusao/tldts).
