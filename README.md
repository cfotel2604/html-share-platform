# HTML Share Platform

Nền tảng nội bộ cho nhân viên tải lên trang HTML tĩnh và chia sẻ bằng đường dẫn HTTPS công khai.

- **Mô hình A:** chỉ nhân viên có tài khoản mới có quyền tải lên và quản lý; người nhận link có thể mở mà không cần đăng nhập.
- Hỗ trợ 1 file HTML độc lập và gói ZIP chứa `index.html` cùng các tài nguyên tĩnh.
- Dùng một domain phục vụ nội dung riêng biệt để cô lập JavaScript do người dùng tải lên.
- Trạng thái: đang lập kế hoạch. Xem `PLAN.md` khi nhánh kế hoạch được merge.

Mọi thay đổi sẽ được thực hiện qua branch và GitHub Pull Request.

## P1 — Foundation (development only)

P1 cung cấp Next.js App Router/TypeScript, PostgreSQL schema với migrations, MinIO local và health endpoints. Chưa có login/RBAC, upload hoặc public serving. Không triển khai build này ra mạng công khai; các ports trong Compose bind vào `127.0.0.1`.

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

Stack và DB schema hiện là nền móng phát triển theo [Issue P1 #3](https://github.com/cfotel2604/html-share-platform/issues/3); quyết định domain, auth, production storage và retention ở [Draft PR P0 #2](https://github.com/cfotel2604/html-share-platform/pull/2) còn mở. P2 bổ sung auth/RBAC trước khi bất kỳ endpoint upload/quản trị nào được công khai. Origin isolation của site publish được triển khai và kiểm thử ở P4.
