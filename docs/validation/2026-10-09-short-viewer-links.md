> **Snapshot bằng chứng theo ngày/head.** Môi trường, số liệu và các câu “Draft/chưa/chờ” trong thân thuộc thời điểm đã ghi; không là trạng thái hay quyền vận hành hiện tại. Xem [status](../PROJECT_STATUS.md) và [bản đồ tài liệu](../DOCUMENTATION_MAP.md). Không chạy lại lệnh lịch sử trên pilot đang dùng.

# Kiểm chứng link viewer ngắn — 2026-10-09

Refs: [Issue #14](https://github.com/cfotel2604/html-share-platform/issues/14), [Draft PR #15](https://github.com/cfotel2604/html-share-platform/pull/15), [ADR-0004](../adr/0004-domains-and-share-codes.md), [cutover/backfill/rollback](../SHARE_LINKS.md). PR dựa trên #13 (`4ac9689`) vì auth/gateway dependency chưa merge; không sửa main.

## Candidate và phạm vi

- Runtime commit: `1c183f50c0d90c109ff23ef84e23e04adff5a7c7`, Conventional Commit `feat: add short viewer link lifecycle`.
- Docker tag: `html-share-studio:share-links-candidate`; `docker image inspect` ID `sha256:46ca5f33b5acfc4ea18a795fe006526cda0541e6180889fee0e2eea48992d5a3`, revision label khớp commit. Docker build local PASS; build output config digest `sha256:c2d46e30d83369403c452023c3b4f514e8206eb8c6874a0e2ae9c5614e92d330` khác image ID.
- Browser script và handoff bổ sung sau commit runtime; không đổi runtime bytes của candidate đã kiểm.
- Chỉ project `html-share-security-checks`, PostgreSQL guarded `upload_test`, MinIO/test credentials và fixtures tổng hợp. Ports loopback 3700/4700/4443, không dùng dữ liệu upload hoặc session Clerk owner.
- Không deploy candidate vào VM/owner Desktop, không đổi DNS, main, migration cũ hoặc owner volumes. Stack test đã down không `--volumes`; browser riêng đóng, synthetic cookie state tạm đã xóa.

## Kết quả local

| Gate | Kết quả |
| --- | --- |
| ESLint, TypeScript | PASS, gồm ranh giới presentation/workflow/adapter/server |
| Unit | 86/86 PASS, gồm format/collision/tombstones, canonical URL, share API auth/error/flag, viewer quota/429 và no Clerk |
| Next build | PASS, route share có trong standalone; Docker build PASS |
| Full integration | 9 nhóm upload + 6 auth/origin + 5 share lifecycle PASS bằng candidate |
| Studio browser | 4 nhóm PASS; Chrome 154.0.8037.99, viewport 1280/390/320 |
| Origin browser regression | 6 nhóm PASS; Chrome 154.0.8037.99, HTTPS `.test` fixtures |

Full integration chạy `UPLOAD_TEST_IMAGE=html-share-studio:share-links-candidate node scripts/run-security-integration.mjs`; runner dựng stack isolated và chạy migrations checksum/advisory-lock. Migration 0003 có LF pin riêng; 0001/0002 không đổi. CI PR #15 kiểm trên head sau push qua GitHub; kết quả local không tự khẳng định CI hoặc real-domain gate.

Năm nhóm share integration xác nhận:

1. Mã exact-case 10 base62/canonical URL, wrong-case/unknown/legacy alias/unpublished 404; shell no-store/no-cookie và sandbox giữ nguyên. Update giữ mã.
2. Rotate/revoke/reissue atomic, mã cũ 404, direct content vẫn 200 khi published. Update và unpublish/republish không bật lại mã revoked; guest/CSRF bị chặn.
3. Employee owner-only/Admin, policy/role mới dưới lock, audit actor/site không chứa mã; backfill đồng thời/idempotent không sửa metadata/ownership/version/object keys. Deleted sites bị bỏ qua; collision cả tombstone retry, không tái cấp mã cũ.
4. Audit failure rollback giữ link cũ; hai rotation đồng thời chỉ một active code.
5. Lost COMMIT response sau commit DB thật trả 503/refresh, không compensation/reissue không an toàn; deleted viewer 404. Mapping/ownership/storage giữ nguyên.

Studio browser chạy Playwright CLI, tracked `tests/browser/share-links.js` qua ignored copy với tên fixture tổng hợp và storage state local-demo riêng. Copy đúng canonical URL; rotate có confirmation, link cũ 404 và copied state reset; revoke bỏ action viewer, reissue cấp mã mới; unpublish/republish giữ mã, chặn/khôi phục viewer. Không horizontal overflow/JS errors; fixture để unpublished. Script gỡ dialog/error listeners khi kết thúc để chạy lại trong session. Screenshots ignored tại `output/playwright/`, đã xem bố cục 320 px.

Origin probe `tests/browser/origin.js` chạy sau fresh `origin-fixtures` (grant TTL 3 phút). Trusted viewer dùng mã ngắn, không Clerk/admin routes. HTTP sandbox index/nested HTML và iframe chặn cookie/storage/workers/popup/top navigation; root CSS/classic/modules/fetch/HTTPS CDN hoạt động. Private preview hoạt động, hostname unpublished thông thường 404, active formats bị chặn; parent cookie/storage và reserved www/mail fixtures giữ nguyên.

## Giới hạn và bước triển khai

TLS self-signed/DNS override `.test` chỉ là proof local. Google Admin/Employee login thật và content TLS VM là bằng chứng riêng ở [mốc trước](2026-10-09-lab-domain-tls.md); lần này không recheck/redeploy VM trong lúc owner cấu hình hostname.

Owner tiếp tục DNS/vhost/TLS `studio-lab.ods.vn` và `view-lab.ods.vn`; trước cutover cần review PR/image/revision, migration 0003 + metadata backfill, Clerk redirects/exact trusted origins, PUBLIC_SITE_PORT rỗng ở web/gateway và frame-ancestors chính xác. Viewer URL dài cũ sẽ 404; gửi link ngắn mới sau cutover. Revoke viewer không unpublish direct content.

Budget `VIEWER_REQUESTS_PER_MINUTE` fixed-window mỗi proxy process trước DB, mặc định 600, không per-IP/distributed/anti-DDoS. Edge limit, trusted domain thật, DNS/route inventory, cookie `cfvn.cloud` sibling/cross-environment, real-session RBAC mutations/deny/revoke/logout, R2/IAM/cleanup, log redaction toàn pipeline và Safari/mobile/Zalo còn #8/#10/P5/P6. Staging/pilot và security review trước production.

Ưu tiên `SHARE_LINK_MUTATIONS_ENABLED=false` nếu cần rollback; giữ mapping/tombstones/schema. Không quay về binary cũ bật host-ID aliases sau revocation khi viewer còn mở; xem runbook trước mọi rollback.
