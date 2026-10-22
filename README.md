# HTML Share Platform

Nền tảng nội bộ để nhân viên tải lên HTML/CSS/JavaScript hoặc website tĩnh đóng gói ZIP và nhận **URL HTTPS công khai** để chia sẻ qua Zalo, Messenger, email hay trình duyệt mobile.

**Mô hình A:** Employee/Admin cần đăng nhập để quản lý và upload; người xem đường dẫn public không cần đăng nhập. Hệ thống chỉ phục vụ static assets; không chạy mã backend được upload.

## Trạng thái

**P0/P1** đã merge. Local MVP #5 và Studio #12 Ready, chưa merge; **Draft PR #13** bổ sung Clerk/RBAC và hostname sandbox, đã kiểm thử/deploy Docker local. Lab đã bật Clerk Development; owner xác nhận Google Admin và Employee đăng nhập thành công. Content lab VM đã kiểm HTTPS wildcard/sandbox; Studio/viewer còn qua SSH tunnel. Quyền/mutations/deny/revoke/logout thật, viewer domain, R2 và Safari/Zalo còn gate trước release. Xem [tiến độ gần nhất](docs/PROJECT_STATUS.md).

- [PLAN và roadmap P0–P7](PLAN.md)
- [Kiến trúc và luồng upload/publish](docs/ARCHITECTURE.md)
- [ADR-0001 — cô lập origin HTML được upload](docs/adr/0001-public-site-origin-isolation.md)
- [Quy trình GitHub Issue → Branch → Draft PR → Review](docs/WORKFLOW.md)
- [Hướng dẫn cho coding agents](AGENTS.md)
- [Tiến độ dự án và các hạng mục còn mở](docs/PROJECT_STATUS.md)
- [Bàn giao công việc giữa các phiên AI Agent](docs/AI_HANDOFF.md)
- [Upload hardening, kiểm chứng Docker và rollback](docs/validation/2026-10-09-upload-hardening.md)
- [Cấu hình Clerk/allowlist và Docker security lab](docs/SECURITY_LAB.md)
- [Bằng chứng auth/origin và rollback image hiện tại](docs/validation/2026-10-09-auth-origin-gates.md)
- [ADR-0004 — domain production/lab và mã chia sẻ đã chốt](docs/adr/0004-domains-and-share-codes.md)
- [Nghiệm thu VM lab và đối chiếu runbook TLS](docs/validation/2026-10-09-lab-domain-tls.md)

## Nguyên tắc bảo mật

Dashboard dùng `studio.ods.vn`; viewer tin cậy dùng `view.ods.vn/<share-code>` và iframe HTML từ `<site-id>.space-ods.cfvn.cloud`. Tách origin không tự ngăn cookie `Domain=cfvn.cloud` giữa các site; đây là gate bảo mật phải kiểm chứng trước P4. Đường dẫn công khai dành cho người có link; chỉ upload nội dung được phép chia sẻ.

## Kiểm tra tài liệu

Yêu cầu Python 3:

```sh
python scripts/check_docs.py
```

GitHub Actions chạy kiểm tra trên pull request và push vào `main`. P1 bổ sung application CI (lint, typecheck, tests, build).

YAML workflow và Issue templates được parse bằng `scripts/check_yaml.py` (yêu cầu `PyYAML==6.0.2`), cùng với kiểm tra tài liệu Markdown. Check YAML sẽ fail nếu cú pháp sai hoặc top-level không phải mapping.

## Quyết định triển khai MVP (owner, 2026-10-08; domain cập nhật 2026-10-09)

- Dashboard và Next.js API: `studio.ods.vn` (`/api/*` cùng container), đăng nhập Google qua Clerk Development khi lab và email allowlist server-side.
- Link gửi khách: `https://view.ods.vn/<share-code>` chỉ hiển thị viewer shell tin cậy, nhúng HTML từ `https://<site-id>.space-ods.cfvn.cloud/` trong iframe sandbox. HTTP response HTML upload cũng phải bật CSP sandbox ở chế độ mở trực tiếp.
- Một DNS wildcard `*.space-ods.cfvn.cloud` có thể trỏ mọi site hợp lệ về gateway; tạo site bằng ID trong database, không tự tạo DNS record cho từng site. Lab dùng wildcard riêng `*.lab-space-ods.cfvn.cloud`, đã có TLS Let's Encrypt DNS-01 + nginx. Kiểm kê record/route hiện hữu trước thay đổi; chưa đổi DNS production.
- Object storage private Cloudflare R2; VPS/Docker Compose khi triển khai, lab trên PC và VM. Quota ZIP 20 MiB, giải nén 100 MiB, tối đa 500 file, depth 12. Retention configurable; không làm backup/restore trong MVP theo yêu cầu owner.

Cookie parent-domain `cfvn.cloud` (chung giữa content lab/production) và tính tương thích iframe/opaque-origin trên mobile/Zalo còn là P4 security gates bắt buộc. Xem [PLAN](PLAN.md) và [ADR-0001](docs/adr/0001-public-site-origin-isolation.md).

Lab Studio/viewer dự kiến `studio-lab.ods.vn`, `view-lab.ods.vn`; hiện còn dùng loopback qua SSH tunnel. Mã viewer 10 base62 tách host ID 32 hex là **quyết định thiết kế**, chưa có trong code. Đổi mã chỉ thu hồi link viewer; direct URL còn mở khi published. Cấu hình và gate chuyển domain tại [ADR-0004](docs/adr/0004-domains-and-share-codes.md).

## Làm việc với GitHub

Tạo Issue, branch theo phạm vi nhỏ, mở Draft PR và ghi rõ vấn đề, thay đổi, kết quả kiểm thử, các điểm còn mở. Quyết định kiến trúc được lưu dưới `docs/adr/` thay vì chỉ nằm trong chat.

## P1 — Foundation (development only)

P1 cung cấp Next.js App Router/TypeScript, PostgreSQL schema với migrations, MinIO local và health endpoints. Chưa có login/RBAC, upload hoặc public serving. Không triển khai build này ra mạng công khai; các ports trong Compose bind vào `127.0.0.1`.

### Quyết định lưu trữ (2026-10-08)

- **Production:** chọn **Cloudflare R2 Object Storage** qua API tương thích S3. Bucket **private**, tắt public `r2.dev` và không nối bucket trực tiếp với domain chứa HTML được upload. API/gateway được cấp quyền tối thiểu để đọc/ghi object; static gateway sẽ giải quyết hostname, trạng thái publish và version trước khi trả nội dung. Không đưa S3 credentials vào trình duyệt, Git hoặc client bundle.
- **Development P1:** cho phép image `bitnamilegacy/minio:2025.7.23-debian-12-r5` **chỉ dùng local** với cổng bind `127.0.0.1`, volume test và mật khẩu trong `.env`. Đây là ngoại lệ có phạm vi hẹp vì image legacy không còn là lựa chọn phù hợp cho môi trường dùng chung; **không được deploy image này lên staging/production**.
- **P3/P4:** triển khai S3 client dùng endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` và region `auto`; kiểm tra CRUD, IAM, URL preview có thời hạn và serving qua gateway. Chưa tạo bucket/token Cloudflare hay xác minh tích hợp R2 thật ở P1. Credentials phải nằm trong secret store và token chỉ được quyền trên bucket được chọn.

Đây là quyết định **provider**; kiểm chứng bảo mật domain/cookie isolation vẫn là gate P4. Xem [Issue P0 #1](https://github.com/cfotel2604/html-share-platform/issues/1) và [PR P0 #2 (đã merge)](https://github.com/cfotel2604/html-share-platform/pull/2).

### Yêu cầu

- Docker Engine với Compose plugin để chạy stack đầy đủ.
- Node.js 22+ và npm để chạy lint/test/build trực tiếp.

### Chạy local

```sh
cp .env.example .env
# Sửa mật khẩu POSTGRES_PASSWORD, MINIO_ROOT_PASSWORD trong .env (chỉ dùng development).
docker compose up --build -d
docker compose ps
```

Khi Postgres sẵn sàng, service `migrate` áp dụng migrations theo thứ tự, sau đó mới chạy `web`. Các URL cục bộ (mặc định): `http://127.0.0.1:3000`, liveness `http://127.0.0.1:3000/api/health/live`, readiness `http://127.0.0.1:3000/api/health/ready`, MinIO console `http://127.0.0.1:9001`. Thay đổi `APP_PORT`/`MINIO_CONSOLE_PORT` trong `.env` nếu cổng bận.

```sh
docker compose logs migrate
docker compose exec db psql -U html_share -d html_share -c 'SELECT version, name FROM schema_migrations;'
docker compose run --rm migrate  # chạy lại phải idempotent
docker compose down              # giữ lại named volumes
```

`docker compose down --volumes` **xóa dữ liệu Postgres/MinIO local** và chỉ sử dụng khi cố ý reset toàn bộ dữ liệu thử nghiệm.

### Kiểm tra code

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
docker compose config
```

Migrations là SQL có version trong `db/migrations/`. `scripts/migrate.mjs` kiểm tra SHA-256 mỗi bản đã áp dụng và khóa advisory để tránh hai process chạy migration cùng lúc. Không sửa migration đã chạy; tạo file version mới. Readiness chỉ kiểm tra kết nối Postgres và trả 503 khi DB không sẵn sàng; response không chứa thông tin kết nối.

### Giới hạn giai đoạn này

Stack và DB schema hiện là nền móng phát triển theo [Issue P1 #3](https://github.com/cfotel2604/html-share-platform/issues/3). Cloudflare R2 đã được chọn làm provider production, nhưng chưa được provision hoặc kiểm thử với credentials thật. Các quyết định P0 đã được ghi nhận trong [PR #2 (đã merge)](https://github.com/cfotel2604/html-share-platform/pull/2); auth/RBAC, quota/retention, gateway và domain/cookie isolation vẫn cần triển khai hoặc kiểm chứng ở các phase tiếp theo. Backup/restore nằm ngoài MVP theo quyết định owner. P2 bổ sung auth/RBAC trước khi bất kỳ endpoint upload/quản trị nào được công khai. Origin isolation của site publish được triển khai và kiểm thử ở P4.

## Local MVP — thử upload và chia sẻ HTML (nhánh `codex/local-mvp`)

Phần này mô tả PR #5 trước auth/origin #13: demo password, gateway `/s/<id>`. **Owner lab hiện chạy #13 với Clerk Google**, cần Compose security overlay và image đã kiểm ở SECURITY_LAB; không dùng lệnh build checkout cũ bên dưới để cập nhật lab hiện hữu. #13 dùng mỗi hostname `*.uploads.localhost:4100`, hỗ trợ root assets và “Xem riêng” khi unpublished, viewer link giữ nguyên. Không mở các cổng này ra Internet.

```powershell
Copy-Item .env.example .env
# Đặt mật khẩu mạnh riêng cho POSTGRES_PASSWORD, MINIO_ROOT_PASSWORD,
# LOCAL_DEMO_PASSWORD và LOCAL_DEMO_SESSION_SECRET.
# Tránh trùng stack P1 bằng APP_PORT=3100, POSTGRES_PORT=55432,
# MINIO_PORT=19000, MINIO_CONSOLE_PORT=19001, GATEWAY_PORT=4100.
docker compose -p html-share-local-mvp up --build -d
docker compose -p html-share-local-mvp ps
```

Mở **http://127.0.0.1:3100** (hoặc cổng trong `APP_PORT`), đăng nhập bằng `LOCAL_DEMO_PASSWORD` trong `.env`, rồi tải file `examples/hello.html` hoặc ZIP chứa `index.html` ở thư mục gốc. Bấm **Mở preview** để xem trang `/view/<site-id>`; nội dung HTML chạy trong iframe trên origin riêng `http://127.0.0.1:4100`. Đường dẫn asset trong ZIP cần là đường dẫn tương đối (`./style.css`, `assets/logo.png`), vì gateway local dùng `/s/<site-id>/`. Cổng preview chỉ phục vụ site đang published. Đăng xuất, tắt chia sẻ, cập nhật phiên bản đều có trên giao diện.

```powershell
docker compose -p html-share-local-mvp logs --tail=60 web gateway
docker compose -p html-share-local-mvp down # giữ volume thử nghiệm
```

Chỉ thử nội bộ: content VM lab có wildcard TLS thật; DNS inventory/cookie boundary/domain viewer, Cloudflare R2 thật, Clerk production/OAuth, quota theo tài khoản và lưu trữ phiên bản nâng cao vẫn cần gate tương ứng. Mặc dù CSP và sandbox hạn chế nội dung tải lên, đây chưa phải cấu hình phục vụ công khai.

## Studio UI và thay giao diện về sau

Studio tập trung dùng ODS blue, hỗ trợ sáng/tối, kéo/chọn HTML/ZIP, lọc trạng thái và sao chép link. Presentation nằm trong `src/components/studio/`; workflow và typed HTTP adapter nằm trong `src/features/studio/`. Server services chỉ được gọi qua `/api/*`; lint cấm imports DB/storage/server auth trong UI. Xem [ADR-0002 và API contract](docs/adr/0002-replaceable-studio-ui.md).

### Cập nhật riêng web trên Docker lab hiện có

Các lệnh UI-only này dành cho mốc **trước #13**. Owner lab đã chuyển security image cho **cả web/gateway** và migration 0002; cập nhật hiện tại phải theo [SECURITY_LAB](docs/SECURITY_LAB.md) và [validation/rollback #13](docs/validation/2026-10-09-auth-origin-gates.md). Không in `docker compose config` đầy đủ vì chứa credentials; dùng `config --quiet`.

```powershell
$labRoot = (Resolve-Path ../html-share-platform-local-mvp).Path
$uiRoot = (Get-Location).Path
$revision = git rev-parse HEAD
$env:STUDIO_WEB_IMAGE = "html-share-studio:ui-$($revision.Substring(0,7))"
$rollbackImage = docker inspect html-share-local-mvp-web-1 --format '{{.Image}}'
docker tag $rollbackImage html-share-studio:before-ui
docker build --label "org.opencontainers.image.revision=$revision" -t $env:STUDIO_WEB_IMAGE .
docker compose -p html-share-local-mvp --project-directory $labRoot --env-file "$labRoot/.env" -f "$labRoot/compose.yaml" -f "$uiRoot/compose.studio-ui.yaml" config --quiet
docker compose -p html-share-local-mvp --project-directory $labRoot --env-file "$labRoot/.env" -f "$labRoot/compose.yaml" -f "$uiRoot/compose.studio-ui.yaml" up -d --no-deps --no-build web
```

Giữ nguyên PostgreSQL/MinIO/gateway, ports và volumes; không chạy migrations trong lần đổi UI. Để rollback, đặt `STUDIO_WEB_IMAGE=html-share-studio:before-ui` và chạy lại lệnh `up` cuối. Khi đã dùng override, các lần cập nhật sau cũng cần override này; chạy `up --build` từ checkout lab cũ có thể đưa giao diện cũ trở lại. Đây là deploy local được owner giao, không phải production release.
