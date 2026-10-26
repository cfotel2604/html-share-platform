# Link chia sẻ A' — contract hiện hành

## Mã và route

Share code 10base62, phân biệt hoa/thường, CSPRNG/UNIQUE/collisionretry. Site ID 32 hex và versionUUID là định danh/storage, không phải alias share. Server trả canonical URL; UI không tự dựng link từ site ID.

| Route public Worker | Hành vi |
| --- | --- |
| `/<code>` | Lookup published/manifest hợp lệ,308 sang `/<code>/` |
| `/<code>/` | Trực tiếp `index.html` từ R2, HTTP sandbox/no-store/no-cookie |
| `/<code>/<path>` | Asset đúng manifest, fixed primary SELECT và R2 pin; ngoài manifest 404 |
| Missing/unpublished/revoked | 404; invalidmethod 405; integrity/provider/configfailure 503 |
| `/raw/<id>` / platform OG shell | Chưa implement; không dùng như link của hiện tại |

Code sinh response ở `cloudflare/public/serve.mjs`/`policy.mjs`, query ở resolve.sql. Public HTML không qua vieweriframe, CSP frame-ancestors none; preview riêng là đường riêng Nodegrant.

## Mutation và propagation

Node xác minh Clerk/PG policy và ownership/Admin; thay đổi link/audit/outbox cùng transaction dưới site lock. Update activeversion giữ code; rotate tạo code mới và tombstone code cũ trong một event/batch. Revoke giữ mã cũ reserved để không tái sử dụng. Unpublish/rotate/revoke chặn asset public theo code sau projection; không giữ alias raw/site ID để bypass.

Healthy revoke p95≤60 s, warningpending>60 s; outage không có 60 s guarantee. Đang tải sẵn trong tab không bị xóa. Reissue sau revoke là code mới theo mutation policy; không hồi sinh tombstone. Xem [projector](PUBLIC_PROJECTOR.md) và [recovery](READ_MODEL_RECOVERY.md).

## Preview và môi trường cũ

Node preview dùng `p-<site-id>--<grant>`/128-bit/TTL 3 phút/hash-only/actor-site-version. Không đổi codepublic khi cấp preview; không đưa grant vào Worker hoặc gửi token Clerk/D1 vào HTML.

Oldviewer 4100/`view-lab.ods.vn` do owner giữ cho lab cũ. Nhận xét cũ “revoke viewer không chặn direct URL” chỉ thuộc topology đó, **không mô tả A'Worker**. Migration 0003/backfill cũ không là thao tác cần chạy lại. [Bản trước A'](history/README.md), [authority](PILOT_APRIME_AUTHORITY.md).
