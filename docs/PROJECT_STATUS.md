# Project status — HTML Share Platform

> Snapshot **2026-10-22 (Asia/Saigon)**: lab đã chạy web short-link, owner xác nhận iframe từ mạng ngoài và dùng thử OK; SSH xác minh runtime/DB/headers. Main6bdd298 đã có #5 và UI #12 qua recovery #17; #13/#15 còn Draft. [Lab handoff](LAB_HANDOFF.md), [merge plan](MERGE_PLAN.md), [bằng chứng](validation/2026-10-22-lab-acceptance.md), [AI_HANDOFF](AI_HANDOFF.md). Markdown không thay kiểm GitHub/VM hiện tại.

## Trạng thái đã kiểm

| Hạng mục | Trạng thái hiện tại |
| --- | --- |
| P0/P1 | #2/#4/#7 merged; origin/main nay6bdd298 sau recovery #17 |
| Local MVP/upload #9 | Owner đã merge #5 vào main1ed0eb0; review sau merge không phát hiện thêm blocker local MVP, exact-main CI50tests PASS; #9 CLOSED |
| Studio/UI #11 | #12 MERGED vào base cũ; [recovery #17](https://github.com/cfotel2604/html-share-platform/pull/17) nay MERGED main6bdd298, UI4ab546a đã vào main; 55tests/CI PASS |
| Auth/origin #8/#10 | #13 Draft, head4ac9689, base codex/11-studio-ui; CI SUCCESS; gates review/release còn mở |
| Short-link/permissions #14/#16 | #15 Draft, base codex/8-10-auth-origin-gates; CI SUCCESS tại fdf24eb trước cập nhật merge này; head sau push cần kiểm riêng |
| VM source/web | dc7560ea1c34cbe060779fbe69bb2f574e170431; web html-share-studio:share-dc7560ea1c34 healthy |
| Gateway/DB/storage VM | gateway security-417c50d giữ nguyên; PostgreSQL/MinIO healthy, storage không publish host ports |
| Database VM | 0001/0002/0003; 3 sites/7 versions, 3 active/3 revoked links; thiếu history/manifest đều0 |
| Public lab | Studio/viewer HTTPS qua Cloudflare; content direct VM/nginx; owner đã mở443/tcp any IPv4/IPv6 và xác nhận khách ngoài tải iframe |
| Docker Desktop | Theo mốc09/10: security-613f2b7, Clerk Development; chưa recheck ngày 22/10, không coi là runtime VM |
| GitHub Issues | #9 CLOSED sau #5; #9/#11 CLOSED; #8/#10/#14/#16 OPEN; #17 MERGED main6bdd298 theo owner giao; #13/#15 vẫn Draft |

## Nghiệm thu và giới hạn bằng chứng

Agent chỉ đọc kiểm VM: bốn services healthy; web 3100/gateway 4100 loopback, DB/storage không publish; AUTH_MODE=clerk, canonical origins đúng, public port rỗng. Studio 200, canonical viewer 200 có sandbox iframe, direct HTML200/HTTP sandbox/frame-ancestors đúng, viewer API 404 và alias 32 hex404. Viewer/content no-store, không Set-Cookie. Không log mã/preview grant/HTML/cookies.

Theo owner: Google Admin và Employee login, private preview/retests trước đó; ngày 22/10 xác nhận mở443 rồi khách ngoài xem iframe và dùng thử lab OK. Agent chưa có independent probe4G hoặc checklist từng case RBAC/mobile; không suy xác nhận tổng quát thành toàn bộ gate security/release PASS. [Bằng chứng và phạm vi](validation/2026-10-22-lab-acceptance.md).

**Cấu hình lưu bền đã xong:** owner bổ sung SECURITY_IMAGE, SSH xác nhận đúng tag `html-share-studio:share-dc7560ea1c34`; Compose config không shell override PASS, web running. Không cần chạy lại migration/backfill/restart. Public443 áp dụng mọi nginx vhost trên IP: inventory/restrict các site khác còn cần review.

## Mốc cutover đã hoàn tất

Owner hoàn tất runbook8.2.2 migration0003/backfill, fingerprint metadata trước/sau khớp2 sites/2 versions; sau đó8.2.3 web candidate đã chạy. Inventory3 sites/7 versions ngày 22/10 phản ánh dùng ứng dụng sau cutover, không phải mismatch baseline. Gateway/DB/storage giữ runtime; không reset dữ liệu hoặc đổi host ID/ownership/storage.

Sự cố EACCES #16: image b1e copy root-owned0600 SQL/helpers từ checkout umask077 khiến runtime node không đọc được. Fix dc7560e chuẩn hóa scripts/db, giữ USER node và SQL bytes; CI restrictive-checkout/non-root preflight +20 integration groups PASS. Fixed image VM UID1000/21files PASS, migration0003 nay đã áp dụng. [Hồ sơ fix/recovery](validation/2026-10-21-runtime-permissions.md). Không dùng lại image b1e hoặc migrate root.

Code đã có10 base62 exact-case/CSPRNG/UNIQUE, atomic rotate/revoke/reissue và tombstones, API canonical URL không fallback host ID. Update/publish không phục hồi mã revoked. Thu hồi viewer không chặn direct content còn published; unpublish/delete chặn request mới, không thu hồi tab đã tải. Rollback ưu tiên SHARE_LINK_MUTATIONS_ENABLED=false, giữ mapping/schema; không lùi binary bật lại 32 hex aliases sau revocation.

## Review/merge tiếp theo

Theo [MERGE_PLAN](MERGE_PLAN.md), #5 đã merged; #12 merged base cũ đã được khắc phục bằng #17 MERGED main6bdd298 sau owner chấp thuận, giữ ancestry/UI nguyên vẹn. Chuỗi còn lại #13 → #15, retarget/check diff/CI khi được giao. [Review #5/recovery](https://github.com/cfotel2604/html-share-platform/pull/17) có exact-main CI50tests PASS và equality checks; main trung gian vẫn local/demo, không deploy public.

#13/#15 giữ Draft đến review/gates scope đạt; owner dùng thử lab không tự là GitHub review approval. Cần chốt bằng chứng session thật Employee owner-only/Admin audit/ngoài allowlist/revoke/logout và link lifecycle. Merge source không tự deploy VM; chưa được giao merge/production.

## Gate trước pilot/production

- Private R2/IAM/API cleanup/gateway read-only; VM MinIO legacy là hiện trạng lab, không mở rộng ngoại lệ staging/production.
- Production Clerk/Google OAuth; provider quota/fail-closed; real-session quyền/ownership/deny/revoke/logout/audit.
- Browser domain thật: cookie cfvn.cloud sibling/cross-environment, direct/iframe/preview, Safari/iOS/Android/Zalo/crawlers; không nới sandbox.
- DNS/reserved/vhost inventory/regression, production wildcard/renewal và rollback drill, preview-hostname redaction toàn pipeline, edge per-IP/concurrency/cache/unpublish. Budget viewer 600/min chỉ mỗi process, không thay anti-DDoS.
- ADR-0001/0003 vẫn Proposed; ADR-0002/0004 Accepted cho UI boundary/domain-link. P5/P6 orphan/lifecycle/rate/retention còn mở. Staging/pilot và owner/security release review trước production; backup/restore ngoài MVP theo owner.

## Quyết định và hồ sơ lịch sử

Studio tập trung ODS blue, graphite/light, presentation → workflow → typed HTTP adapter → backend; lint enforce [ADR-0002](adr/0002-replaceable-studio-ui.md). Có thể thay UI, giữ auth/storage/publish bên server và gateway riêng. Domain production/lab và viewer 10 base62/host-ID 128 bit ở [ADR-0004](adr/0004-domains-and-share-codes.md).

Ngày 09/10: [upload hardening](validation/2026-10-09-upload-hardening.md), [auth/origin](validation/2026-10-09-auth-origin-gates.md), [short-link86 unit/20 integration/Chrome](validation/2026-10-09-short-viewer-links.md), [TLS VM](validation/2026-10-09-lab-domain-tls.md). Ngày 21/10: [origins/network finding](validation/2026-10-21-lab-public-origins.md), [build review](validation/2026-10-21-pr15-build-review.md), [EACCES/retry](validation/2026-10-21-runtime-permissions.md). Các snapshot cũ không thay trạng thái ngày 22/10; không rerun full suite chỉ vì docs/env samples.
