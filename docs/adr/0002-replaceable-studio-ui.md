# ADR-0002: Giao diện Studio có thể thay thế qua API contract

- **Status:** Accepted
- **Date:** 2026-10-08
- **Scope:** Issue #11; owner đã chọn Studio tập trung và yêu cầu chuẩn bị thay UI trong tương lai.

## Decision

Giữ Next.js Route Handlers làm HTTP boundary. Không tách thành microservices chỉ để đổi theme hoặc layout. Backend auth, authorization, validation, publish transaction, database và object storage không phụ thuộc React component. Gateway phục vụ nội dung upload tiếp tục là process riêng và tuân thủ [ADR-0001](0001-public-site-origin-isolation.md).

Frontend chia thành ba phần:

1. `src/components/studio/`: presentation, form state và tương tác trình duyệt (theme, clipboard, bộ lọc).
2. `src/features/studio/use-studio.ts`: trạng thái phiên/workflow và mutation qua interface `StudioApi`, không truy cập DB/storage.
3. `src/features/studio/api.ts` và `types.ts`: HTTP adapter cùng DTO/interface browser-safe, không import server code. Fetch mặc định cùng origin, giữ session/CSRF contract. ESLint cấm imports server services, PostgreSQL, AWS SDK và Node APIs trong components/features.

UI mới có thể dùng lại adapter/hook hoặc tự hiện thực client theo contract bên dưới. Backend có thể chuyển service khác sau này bằng Route Handlers/BFF proxy server-side hoặc adapter mới; khi đó phải review credentials, CSRF/CORS và deployment riêng. Không đưa credential storage/DB vào browser để giảm số lớp.

## HTTP contract hiện tại

| Endpoint               | Request                          | Response thành công           |
| ---------------------- | -------------------------------- | ----------------------------- |
| GET `/api/auth`        | Session cookie                   | `{ signedIn, demoAvailable }` |
| POST `/api/auth`       | JSON `{ password }`, same-origin | `{ signedIn: true }`          |
| DELETE `/api/auth`     | Same-origin                      | `{ signedIn: false }`         |
| GET `/api/sites`       | Session                          | `{ sites: SiteSummary[] }`    |
| GET `/api/workspace` | Session, same-origin bootstrap | `{ auth: AuthStatus, sites: SiteSummary[] }` |
| POST `/api/sites`      | Multipart `file`, `name`         | `{ id, fileCount }`           |
| PUT `/api/sites/:id`   | Multipart `file`, `name`         | `{ id, fileCount }`           |
| PATCH `/api/sites/:id` | JSON `{ published: boolean }`    | `{ id, status }`              |
| POST `/api/sites/:id/share` | Body rỗng, session + same-origin | `{ id, share_code, share_url }` |
| DELETE `/api/sites/:id/share` | Session + same-origin | `{ id, share_code: null, share_url: null }` |

Errors dùng HTTP status phù hợp và JSON `{ error: string }`. Demo auth là contract local hiện tại, không trở thành thiết kế production. P2 #8 sẽ thay auth với migration contract rõ ràng. Types chỉ mô tả API; backend vẫn chịu trách nhiệm validation và quyền.

Issue #35 / PR #41 thay bootstrap auth→list bằng một workspace request Node/PostgreSQL theo ADR-0006. Adapter chỉ coalesce request đang chạy, không cache kết quả quyền; explicit refresh/mutations giữ list endpoint. Presentation không đổi. [Contract và kiểm chứng](../NODE_POSTGRES_ADMIN.md).

PR #13 đã thêm Clerk auth và POST `/api/sites/:id/preview` → `{ url, expiresAt }`. PR #15 thêm share lifecycle; `SiteSummary` có `share_code: string | null` và `share_url: string | null` canonical do server sinh. UI không tự dùng host ID làm link thay thế. Revoke/rotate không sửa trạng thái published; backend giữ mapping, ownership/audit và transaction. Xem [SHARE_LINKS](../SHARE_LINKS.md).

## Consequences và validation

Giữ API/schema/gateway không đổi trong phần UI; không cần migrate dữ liệu. Unit tests chạy production HTTP adapter với fetch stub để xác nhận methods, cookies, multipart boundary và errors. Browser/API smoke trên Docker kiểm tra workflow thật; lint kiểm tra chiều phụ thuộc. Upload hardening #9 và public gate #10 thuộc backend/security, được kiểm chứng riêng với phần UI.

Sau khi #5 merge, PR UI phải đổi base về main và xác minh CI/mergeability. Deploy local chỉ cập nhật image web có tag riêng bằng Compose override; giữ nguyên project, services dữ liệu, ports và named volumes. Rollback dùng image web trước deploy.
