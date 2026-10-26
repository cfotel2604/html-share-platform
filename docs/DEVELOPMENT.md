# Phát triển và kiểm thử A'

Node 22+ và npm; chạy từ root repo. Không cần credential Cloudflare/Clerkpilot để chạy bộ unit/local fixture.

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build:public-worker
npm run build
node scripts/smoke-local.mjs
python scripts/check_docs.py
python scripts/check_yaml.py
git diff --check
```

`npm test` dùng fresh PG lite/Miniflare/workerd và synthetic storage/provider responses; build Worker không deploy. Counts/time phải lấy từ run thực tế tại head, không dùng count của snapshot làm acceptance mới. Không đưa production secret vào local fixture.

## Các lớp integration khác nhau

| Cách chạy | Môi trường / điều kiện |
| --- | --- |
| `node --test tests/read-model-recovery.test.mjs tests/public-outbox.test.mjs tests/public-worker-runtime.test.mjs` | Fixture trống, D1 R2 local và source giả lập; không remote acceptance |
| `npm run test:projection-integration` | Cần PostgreSQL **test riêng** đã migrate và guardenv như `.github/workflows/foundation.yml`; không trỏ PG env vào database đang dùng |
| Security integration trong CI | Build image + nonrootruntime probe, rồi `node scripts/run-security-integration.mjs`; tự tạo test config/project `html-share-security-checks`, dùng PG/MinIO fixtures, downkhông xóa volume. Lệnh có Docker sideeffects nên không chạy chỉ để kiểm docs |
| Pilot/browser/provider | Theo owner authority/runbook đúng target, scope và artifact; không được suy ra từ local/CI |

`.env.example`, `compose.yaml` và overlays local là cấu hình fixture/development, **không phải** rollout cho VM `hsp-aprime-pilot`. Base Compose không tự khởi động public Worker/D1 projector; gateway Node chỉ phục vụ grantpreview. Vì vậy không dùng hướng dẫn demo `/s/<id>`/VM viewer cũ để đánh giá toàn bộ A'.

MinIOlegacy chỉ nằm trong isolatedlocal/CI fixtures, không là storagepilot hay ngoại lệ production. Không copy đè `.env` hiện có; không `down --volumes` hoặc dùng credentials/volumes owner cho test. Nếu cần môi trường GUIlocal đầy đủ, lập scope cấu hình riêng thay vì gọi base Compose là production-ready.

## Ranh giới code

UIpresentation `src/components/studio/` → workflow/typed HTTP adapter `src/features/studio/` → same-origin `/api/*` → Node services. Không import DB/storage/authserver vào client. Readiness chỉ PG; liveness không provider. [Node contract](NODE_POSTGRES_ADMIN.md), [Worker](PUBLIC_READ_MODEL_WORKER.md), [D1 SQL](D1_PUBLIC_READ_MODEL.md).

## Tài liệu

Docs-only cần docs/YAML/diff và local links trên mọi Markdown tracked. Không chạy real 500 upload, migrate, Docker/VM hay providerfault để xác nhận một sửa hướng dẫn. Phân loại trang theo [map](DOCUMENTATION_MAP.md); evidence ghi ngày/head/scope, không copy pendingstates vào lối vào chính.
