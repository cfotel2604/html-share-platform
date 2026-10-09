# Issue #9 — upload hardening và Docker validation

Bàn giao **2026-10-09 (Asia/Saigon)**. Code, CI và runtime probes được chạy trong phiên ngày 2026-10-08; trạng thái GitHub/health và preservation được xác nhận lại ở mốc bàn giao. Owner giao sửa [#9](https://github.com/cfotel2604/html-share-platform/issues/9), kiểm thử rồi cập nhật Docker Desktop local, giữ UI Studio.

## Code và artifact đã chạy

- Backend [PR #5](https://github.com/cfotel2604/html-share-platform/pull/5): `a74be7f` + `9147161b94b343f6adfed877e89e72fb67443af9`. Branch công việc `codex/9-upload-hardening` cập nhật remote `codex/local-mvp`.
- Ghép vào Studio [PR #12](https://github.com/cfotel2604/html-share-platform/pull/12) bằng merge commits `2cf1408` và `011d0eebd387352d8b971b3a3d5979bbcdb8165f`; đã giải quyết conflict docs/ESLint, giữ API boundary của UI.
- Docker image `html-share-studio:upload-011d0ee`, ID `sha256:5f6ffa1880d7953853fd22125d3fd78dc5cbc8caaf42ab0e964924e7e0863799`; revision label khớp commit UI tích hợp.
- Owner lab `html-share-local-mvp`, web `http://127.0.0.1:3100`, gateway `http://127.0.0.1:4100`. Chỉ recreate web qua Compose override, `--no-deps --no-build`; không migrate/schema change. Readiness và container health pass.
- 8 site có trước deploy giữ nguyên `id/status/active_version_id/updated_at`. PostgreSQL, MinIO, gateway giữ container IDs/mounts; stack Foundation cổng 3000 không đổi. Một site tổng hợp mới dùng browser smoke được để unpublished.

## Bản sửa

`upload-request.ts` đếm byte thực đọc trước multipart parser, giới hạn **22 MiB toàn body**, độc lập Content-Length; file vẫn tối đa **20 MiB**. Stream bị hủy khi vượt cap; HTTP 413. Multipart cần đúng một `name` và `file`; malformed/duplicate/field dư trả 400.

PUT kiểm tra owner/non-deleted trước khi đọc body; unknown/foreign/deleted trả 404. `uploadVersion` kiểm tra lại và giữ `FOR UPDATE` trước ZIP ingest, reserve unique version/prefix trước storage writes, rồi đổi active pointer và audit trong cùng transaction. Race sau preflight bị từ chối; delete/reassign trong upload phải chờ row lock.

ZIP có tối đa 500 files và 1000 entries kể cả directories; giữ 20 MiB nén / 100 MiB giải nén / depth 12. Từ chối symlink/special entries kể cả tên kết thúc `/`, encrypted, duplicate/case collision và file/directory collision. Directory xuất hiện sau child hợp lệ vẫn được hỗ trợ.

## Cleanup và kết quả không xác định

- Lỗi trước COMMIT: rollback SQL, xóa đúng các key mới đã thử PUT, kể cả PUT có thể đã ghi nhưng mất response. Không chạm prefix/version cũ. DeleteObjects kiểm tra cả per-key errors trong HTTP 200; retry idempotent tối đa 3 lần.
- Nếu cleanup vẫn thất bại, ghi event `upload.cleanup_failed` với version ID/object count, không ghi payload/filename/site name/credential. Operator cần kiểm tra DB version references và object inventory trước cleanup thủ công; chưa có durable orphan reaper cho process crash, theo dõi lifecycle P5/P6.
- Nếu COMMIT response thất bại, kết quả có thể đã commit. Không tự xóa object của phiên bản này; discard connection, event `upload.commit_outcome_unknown`, trả **503** và yêu cầu làm mới danh sách trước khi retry. Không khẳng định active version không đổi trong trường hợp này. Function-level test kiểm tra nhánh này; chưa mô phỏng mất response COMMIT qua network thật.
- Lỗi storage/DB khác trả 500 với thông báo chung, không lộ infrastructure error. R2 production cần quyền DeleteObject phù hợp; mới kiểm chứng MinIO local.

## Kiểm chứng

| Gate | Kết quả và phạm vi |
| --- | --- |
| Production-function regression | Backend 50 tests PASS; Studio tích hợp 55 PASS. Source TS production được transpile/load trực tiếp, chỉ stub dependencies ngoài phạm vi |
| Body cap | Missing/lying Content-Length, field padding lớn, source cancellation và early rejection; cap không đợi consume toàn stream |
| Ownership/storage | Zero ingest/storage cho denied site; reserve trước writes; rollback/partial write cleanup, retry, per-key errors, COMMIT unknown và connection discard |
| ZIP | ZIP hợp lệ + 21 hostile variants PASS; bao gồm traversal/absolute/drive path, link/special entries, encryption, collisions, missing index, active/server types, count/depth/bomb/lying size |
| Lint/typecheck/build | PASS; production image build Node 22 PASS |
| CI backend code | [application](https://github.com/cfotel2604/html-share-platform/actions/runs/37794864775), [validate-docs](https://github.com/cfotel2604/html-share-platform/actions/runs/37794864792): SUCCESS |
| CI Studio tích hợp | [application](https://github.com/cfotel2604/html-share-platform/actions/runs/37794864433), [validate-docs](https://github.com/cfotel2604/html-share-platform/actions/runs/37794863701): SUCCESS |
| Docker integration | Image được deploy đã PASS trên project `html-share-upload-test` với PostgreSQL/MinIO/gateway thật; guard từ chối database khác `upload_test` |
| Browser sau deploy | Chrome/Playwright: HTML create, update HTML/ZIP giữ URL, iframe JS chạy/cookie-storage bị chặn, HTTP sandbox/no-store, copy success/fallback, filter/theme, 1280/390/320 px không overflow, unpublish/republish, ZIP CSS 200 rồi 404, logout/API 401; không có page JS errors |
| Docs/YAML/diff | Chạy lại ở commit bàn giao; PROJECT_STATUS và AI_HANDOFF ghi trạng thái review/remaining gates |

Docker integration source: [upload.mjs](../../tests/integration/upload.mjs). Các assertions thật: chunked body trả 413 trước khi gửi hết stream 80 MiB; declared oversize bị từ chối khi chưa gửi body; foreign/deleted/unknown zero objects; đổi owner lúc ingest zero objects; trigger lỗi audit sau storage writes giữ metadata/version cũ và cleanup object mới; concurrent delete/reassign lock timeout; 21 ZIP rejection giữ nguyên active pointer/storage; ZIP hợp lệ và unpublish/CSP/cache pass. Không chạy adversarial/DoS probes trên dữ liệu lab owner.

## Chạy lại integration cô lập

Từ checkout có backend fix, chuẩn bị `tmp/upload-test.env` riêng (Git-ignored), `POSTGRES_USER=upload_test`, `POSTGRES_DB=upload_test`, `LOCAL_DEMO_MODE=1`, `APP_PORT=3700`, `GATEWAY_PORT=4700`, cùng mật khẩu/session secret riêng cho test. Nếu giữ volumes thì giữ đúng env cũ; dùng project test mới khi cần credentials/volumes mới. Không dùng `.env` lab owner.

```powershell
$env:UPLOAD_TEST_IMAGE = 'html-share-upload:candidate'
docker build -t $env:UPLOAD_TEST_IMAGE .
docker compose -p html-share-upload-test --env-file tmp/upload-test.env -f compose.yaml -f compose.upload-test.yaml config --quiet
docker compose -p html-share-upload-test --env-file tmp/upload-test.env -f compose.yaml -f compose.upload-test.yaml up -d --no-build db minio migrate web gateway
docker compose -p html-share-upload-test --env-file tmp/upload-test.env -f compose.yaml -f compose.upload-test.yaml run --rm -T upload-checks
docker compose -p html-share-upload-test --env-file tmp/upload-test.env -f compose.yaml -f compose.upload-test.yaml down
```

Overlay bỏ host ports DB/MinIO, dùng network/volumes của project riêng. Lệnh down chỉ dừng project test, giữ named volumes. Không áp overlay test vào project owner.

## Rollback owner lab

Image trước sửa upload: `html-share-studio:rollback-before-upload-20261008`, ID `sha256:c0a14a062b08da72eea239397f5aae938d21a7e53c643b985c16267cec623c7c`; tag đã xác minh, rollback chưa thực hiện. Image cũ còn findings, chỉ giữ để phục hồi local khi cần.

```powershell
$labRoot = 'C:/Users/admin/Documents/Codex/html-share-platform-local-mvp'
$uiRoot = 'C:/Users/admin/Documents/Codex/html-share-platform-pr5-sync'
$env:STUDIO_WEB_IMAGE = 'html-share-studio:rollback-before-upload-20261008'
docker compose -p html-share-local-mvp --project-directory $labRoot --env-file "$labRoot/.env" -f "$labRoot/compose.yaml" -f "$uiRoot/compose.studio-ui.yaml" up -d --no-deps --no-build web
```

Để trở lại bản đã sửa, dùng cùng lệnh với `STUDIO_WEB_IMAGE=html-share-studio:upload-011d0ee`. Giữ override khi vận hành; checkout owner cũ vẫn `b3f8119` và chưa chứa UI/fix.

PR #5/#12 đã Ready for review, chưa merge. Issue #9 giữ mở đến review/merge. Google/Clerk/RBAC [#8](https://github.com/cfotel2604/html-share-platform/issues/8), domain/TLS/R2/cookie/Safari/Zalo [#10](https://github.com/cfotel2604/html-share-platform/issues/10) chưa đạt; chưa được giao mở public hoặc deploy production.
