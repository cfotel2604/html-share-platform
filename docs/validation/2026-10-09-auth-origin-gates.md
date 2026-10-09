# Auth/RBAC và public origin gates — #8 / #10

Ngày kiểm chứng: **2026-10-09**. Implementation/Docker local đã cập nhật; **chưa xác nhận release public hoặc Google end-to-end**. [Draft PR #13](https://github.com/cfotel2604/html-share-platform/pull/13), refs [#8](https://github.com/cfotel2604/html-share-platform/issues/8), [#10](https://github.com/cfotel2604/html-share-platform/issues/10).

## Phạm vi và commits

Owner giao #8/#10, kiểm thử và deploy Docker Desktop local, giữ Studio/dữ liệu. Branch codex/8-10-auth-origin-gates từ main `78cb7ca`, fast-forward dependency Studio `4ab546a`; base codex/11-studio-ui vì #5/#12 chưa merge. Không merge/DNS/provision R2/production.

- `9dd82c3`: scope/gates.
- `613f2b77ac00179f33d6bf13c08007a87b910963`: runtime auth/RBAC/hostname/manifest/preview, additive schema, tests/config.
- `5ab18075fd7273a2e59da9503a614ea094bb729b`: fresh test identity trước đổi role và LF migration 0002; không đổi runtime. Fresh CI bắt harness UPDATE 0 rows dùng default Admin; sửa setup rồi CI PASS.

ADR-0003 ghi server authority/preview; ADR-0001 vẫn Proposed. Clerk xác minh trực tiếp API, không đưa API vào Next proxy vì buffering/truncation phá early 413 #9. Lint giữ UI → typed API → backend boundary.

## Code và integration

| Gate local | Kết quả / nguồn |
| --- | --- |
| Lint/typecheck/unit/build | PASS, **79 tests**; local và Docker Node 22 build |
| Clerk signature/session | SDK thật, signed RS256 JWT; expired/wrong authorized party/tampered/spoof header rejected, zero body reads; provider/session/DB fixtures không thay OAuth thật |
| Google/allowlist/RBAC | Verified primary Google email, active allowlist/disabled, fake role ignored, CSRF/Host; fresh actor/role locks/actual audit |
| Upload #9 | **9 nhóm** tests/integration/upload.mjs: early chunked/declared cap, zero writes, ownership race/locks, DB failure after real writes cleanup, hostile ZIP/cache/unpublish |
| DB/S3 auth-origin | **6 nhóm** tests/integration/auth-origin.mjs: Employee A/B/Admin, revoke/downgrade, FOR SHARE against concurrent revoke, host/root/manifest/types, scoped preview/TTL, legacy backfill/deleted |
| Gateway/config | HTTP/PSL tests unknown/spoof Host no DB/S3, NULL/unlisted manifest 404, digest/size mismatch 503, sandbox/no cookie/no-store, CORS no credentials; eTLD+1 incl private suffixes |
| CI `5ab1807` | [application SUCCESS](https://github.com/cfotel2604/html-share-platform/actions/runs/37890933623), [docs SUCCESS](https://github.com/cfotel2604/html-share-platform/actions/runs/37890933664), [security SUCCESS](https://github.com/cfotel2604/html-share-platform/actions/runs/37890933672) |

Security CI build image rồi chạy `node scripts/run-security-integration.mjs` trên project/DB/MinIO riêng, synthetic env, guard PGDATABASE=upload_test. Down giữ volumes, không owner credentials. `npm audit --omit=dev` không production vulnerabilities khi kiểm tra; dev ESLint chain còn findings upstream, không force-upgrade ngoài scope.

## Browser isolation

Chrome **154.0.8037.99**, Playwright CLI `tests/browser/origin.js` trên **image cuối 613f2b7**, HTTPS `.test` port 4443. Sáu nhóm PASS:

1. Trusted viewer không Set-Cookie, CSP đúng frame host, iframe allow-scripts; root CSS/classic/modules/fetch/HTTPS CDN hoạt động.
2. Iframe chặn cookie read/write Domain parent, local/session storage, worker/service worker, popup/top navigation.
3. Direct index/nested `.htm` HTTP sandbox, cùng cookie/storage/worker boundary.
4. Private preview hoạt động, ordinary unpublished hostname 404.
5. Viewer API/sign-in/preview 404; SVG/XHTML/XML/PDF 404.
6. Parent cookie/storage và reserved www/mail fixtures giữ nguyên; không page JS errors.

compose.origin-browser-test.yaml + tests/integration fixture dùng self-signed cert, Chrome host-resolver-rules/ignoreHTTPSErrors **chỉ local**; không chứng cứ Cloudflare Edge/Origin CA, DNS thật, Safari/Zalo. CORS `*` không credentials chỉ public/capability assets cho opaque modules/fetch. Worker/forms/frames/popups bị CSP hạn chế; không hứa mọi SPA/Web API.

## Artifact và deploy owner

| Artifact | Giá trị |
| --- | --- |
| Web/gateway tag | html-share-studio:security-613f2b7 |
| Image ID | sha256:87697528d6e41c8fc7ac224800597a05f6d9e61fc8aa618dcd13b8c97c9403a2 |
| Revision label | 613f2b77ac00179f33d6bf13c08007a87b910963 |
| Rollback web | html-share-studio:rollback-before-security-20261009; sha256:5f6ffa1880d7953853fd22125d3fd78dc5cbc8caaf42ab0e964924e7e0863799 |
| Rollback gateway | html-share-gateway:rollback-before-security-20261009; sha256:4cfd5dd11463b91b1337f5f8522603876f109cd53bcf4fde03f2d3748c6a7350 |

Preflight so credentials/loopback ports trong memory, không in env/config; retained rollback tags. Dừng web ngắn tránh old uploads tạo NULL manifest trong backfill. Runner checksum/advisory lock áp **0002_auth_and_manifests.sql**; **0001 không đổi** (SHA-256 `b3f3757a0027327b6b0b555e26f19e62edc5a8fb421e1a5abd0786a6f3983c99`). Backfill fingerprint **17 legacy versions**, chỉ ghi manifest, 0 missing, không storage writes/deletes. Recreate riêng web/gateway bằng owner Compose + compose.security.yaml, --no-deps --no-build; healthy.

Checkout owner `b3f8119`, `.env` nguyên vẹn; **AUTH_MODE=local-demo**, `*.uploads.localhost:4100`, web http://127.0.0.1:3100. Không chỉnh DNS/hosts. **9 site giữ id/status/active_version_id/updated_at**; DB/MinIO IDs/mounts giữ nguyên. Actual gateway: 6 published 200+sandbox/no-store/no cookie, 3 private 404, unknown Host 404. Foundation cổng 3000 không đổi.

Chrome Studio sau deploy: HTML create, ZIP update/stable viewer URL, root CSS/modules/fetch, direct nested sandbox/no-store, unpublish 404 + authenticated “Xem riêng”, workspace 1280/390/320, logout/API 401, no JS errors. Thêm **1 fixture tổng hợp để unpublished**, không sửa 9 site cũ/stress owner. Browser đóng/cookie-state file xóa. Responsive viewport không thay thiết bị/browser mobile thật.

## Deploy/rollback chạy lại

Tại source branch #13, xem [SECURITY_LAB](../SECURITY_LAB.md). Đối chiếu runtime revision khác test/docs commit; không build checkout owner cũ.

```powershell
$labRoot = (Resolve-Path ../html-share-platform-local-mvp).Path
$sourceRoot = (Get-Location).Path
$env:SECURITY_IMAGE = 'html-share-studio:security-613f2b7'
$env:AUTH_MODE = 'local-demo'
docker compose -p html-share-local-mvp --project-directory $labRoot --env-file "$labRoot/.env" -f "$labRoot/compose.yaml" -f "$sourceRoot/compose.security.yaml" config --quiet
docker compose -p html-share-local-mvp --project-directory $labRoot --env-file "$labRoot/.env" -f "$labRoot/compose.yaml" -f "$sourceRoot/compose.security.yaml" up -d --no-deps --no-build --wait web gateway
```

Migration/backfill đã chạy; lab legacy khác phải stop web/migrate/backfill theo SECURITY_LAB **trước** gateway mới. Bật Clerk sau keys/Admin allowlist/smoke, bỏ AUTH_MODE local-demo trong shell và dùng mode được kiểm trong `.env`.

Rollback override Git-ignored, image only; dùng owner Compose, **không security overlay** để khôi phục gateway path config:

```powershell
@'
services:
  web:
    image: html-share-studio:rollback-before-security-20261009
    pull_policy: never
  gateway:
    image: html-share-gateway:rollback-before-security-20261009
    pull_policy: never
'@ | Set-Content -LiteralPath "$sourceRoot/tmp/security-rollback.yaml"
docker compose -p html-share-local-mvp --project-directory $labRoot --env-file "$labRoot/.env" -f "$labRoot/compose.yaml" -f "$sourceRoot/tmp/security-rollback.yaml" config --quiet
docker compose -p html-share-local-mvp --project-directory $labRoot --env-file "$labRoot/.env" -f "$labRoot/compose.yaml" -f "$sourceRoot/tmp/security-rollback.yaml" up -d --no-deps --no-build --wait web gateway
```

Giữ schema/manifests, không down --volumes/đảo migration. Rollback config đã resolve/so credentials và images retained; **không chạy vòng rollback downtime sau smoke**. Sau có Clerk site/identity mới, review ownership compatibility; không reassign tự động.

## Gate chưa đạt

- #8: owner có Clerk Development, sẽ đặt keys vào `.env` owner và gửi email/role. Tại deploy chưa nhận inputs; chưa real Clerk/allowlist/Google deny/revoke/logout smoke. Production Clerk/OAuth/quota kiểm riêng.
- #10: DNS/Workers/reserved inventory/regression/rollback thật; wildcard Edge TLS/Origin CA Full (strict); R2 private/IAM/API write+cleanup/gateway read-only; preview hostname log/analytics redaction; Safari/iOS/Android/Zalo + representative packages; owner/security ADR-0001 review, staging/pilot. Không đổi DNS/provision R2 từ Issue.
- P5/P6: durable orphan/reconciliation, retention, rate/global concurrency, expired grant cleanup/monitoring. no-store không thu hồi tab đã tải; public link không cho nội dung bí mật.

Giữ #8/#10 OPEN và PR #13 Draft; local tests không thay external release gates.
