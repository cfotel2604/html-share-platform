# Project status — HTML Share Platform

> Snapshot **2026-10-22 (Asia/Saigon)** sau owner giao Ready/merge #13 → #15 và chốt handoff. Chuỗi code đã vào main tại `0c17a09b68960d785f8b67b2a1585b0f3af919b8`; lab giữ runtime dc7560e đã nghiệm thu, không deploy hoặc chạy lại migration/backfill trong mốc merge. [Lab handoff](LAB_HANDOFF.md), [merge record](MERGE_PLAN.md), [review sau merge](reviews/2026-10-22-stack-merged.md), [AI_HANDOFF](AI_HANDOFF.md). Markdown không thay kiểm GitHub/VM hiện tại.

## Audit tiếp #10 — 2026-10-22

[Draft PR #19](https://github.com/cfotel2604/html-share-platform/pull/19), branch `codex/10-prepilot-audit`, audit commit `ecb7f8b` từ main `72e048e` sau #18. Đã fetch/kiểm GitHub: main có 3 workflows SUCCESS, log 86 unit/20 integration groups PASS; lúc bắt đầu không PR mở, chỉ #10 OPEN. Primary main `78cb7ca` chậm 52 commits, giữ nguyên; audit trong worktree riêng. [Báo cáo/ma trận acceptance](validation/2026-10-22-prepilot-audit.md) ghi phạm vi và kế hoạch tiếp, CI current PR head kiểm riêng.

SSH chỉ đọc xác nhận source/web `dc7560e`, gateway `security-417c50d` và services healthy, ports/pins không đổi. Viewer/direct 200 sandbox/no-store/no-cookie, viewer API/alias32hex/synthetic unknown 404. Inventory mới có 8 nginx server blocks, 3 HTTPS vhost khác cùng cổng 443; full DNS/route/private inventory và external regression chưa đạt. Content nginx đã có 30r/s/burst100; không thấy limit_conn. Gateway/web cùng MinIO root credential, chưa có R2/read-only IAM evidence. TLS lab hết hạn 07/01/2027, timer/service success không thay renewal/failure drill.

Canonical viewer 200 với UA giả lập Facebook/Zalo nhưng thiếu `og:title`/`og:description`; Python UA 403 qua Cloudflare chưa rõ nguyên nhân. Ưu tiên tiếp: inventory/origin access và preview-log privacy, sửa trusted OG metadata có test; chuẩn bị R2/IAM/cleanup/Clerk staging rồi browser/device/crawler và TLS/pilot matrix. Audit chỉ tài liệu, không đổi VM/DNS/UFW/provider/SQL. Owner-confirmed real-session cases bên dưới vẫn giữ riêng; #10 OPEN, ADR-0001/0003 Proposed.

## Trạng thái đã kiểm

| Hạng mục | Trạng thái hiện tại |
| --- | --- |
| P0/P1 | #2/#4/#7 đã merge |
| Local MVP/upload #9 | #5 MERGED main1ed0eb0; review sau merge/CI50tests PASS; #9 CLOSED |
| Studio/UI #11 | #12 merged base cũ; recovery #17 MERGED main6bdd298, giữ UI4ab546a; #11 CLOSED |
| Auth/RBAC #8 | #13 MERGED main6d30d22, tested head8f204c3; 79unit/15integration groups và3checks PASS; owner real-session acceptance đạt; #8 CLOSED |
| Origin/private preview #10 | Implementation #13 đã main; security/release gate #10 vẫn OPEN, ADR0001/0003 Proposed |
| Short-link/permissions #14/#16 | #15 retarget main sau #13, MERGED main0c17a09, tested headb21ea12; 86unit/20groups và3checks PASS; #14/#16 CLOSED |
| VM source/web | dc7560ea1c34cbe060779fbe69bb2f574e170431; web html-share-studio:share-dc7560ea1c34 healthy ở lần kiểm22/10 |
| Gateway/DB/storage VM | Gateway security-417c50d giữ nguyên; PostgreSQL/MinIO healthy, storage không publish host ports |
| Database VM | 0001/0002/0003; 3sites/7versions, 3active/3revoked links; thiếu history/manifest đều0 ở lần kiểm22/10 |
| Public lab | Studio/viewer HTTPS qua Cloudflare; content direct VM/nginx; owner mở443/tcp any IPv4/IPv6 và xác nhận khách ngoài tải iframe |
| Docker Desktop | Theo mốc09/10 security-613f2b7/Clerk Development; không recheck hoặc redeploy trong mốc22/10 |
| GitHub | #5/#12/#13/#15/#17 MERGED; #8/#9/#11/#14/#16 CLOSED; chỉ #10 OPEN ở thời điểm chốt |

## Bằng chứng và phạm vi

Code review auth/ownership/transaction/audit, hostname/manifest/sandbox/preview, share code/tombstone/backfill/COMMIT-unknown và packaging không phát hiện blocker implementation mới. Retarget chỉ xử lý docs conflicts; src/scripts/db/dependencies/Compose/permissions code giữ nguyên so tested source, SQL0001–0003 không sửa. Main sau mỗi merge có tree bằng exact tested PR head. [Review/CI/commit chi tiết](reviews/2026-10-22-stack-merged.md).

**Owner xác nhận:** Google Admin/Employee login, private preview/retests; sau mở443 khách ngoài tải iframe và dùng lab OK. Detailed acceptance ngày22/10 đều đạt: Employee owner-only, Admin mutation/audit đúng actor, ngoài allowlist deny, revoke/disable/logout chặn phiên cũ, rotate/revoke/reissue/unpublish chặn link cũ. Đây là owner-confirmed real-session evidence; không mô tả thành browser matrix do agent chạy.

**Agent kiểm độc lập trước mốc merge:** SSH chỉ đọc xác nhận services/DB/config/loopback/storage/UFW; HTTPS Studio200, canonical viewer200/iframe sandbox, direct HTML200/HTTP sandbox/frame-ancestors, viewer API404 và alias32hex404; no-store/no Set-Cookie. Không log codes/grants/cookies/HTML. Không có independent probe4G hoặc full cookie/mobile matrix. [Validation và lịch sử cập nhật](validation/2026-10-22-lab-acceptance.md).

SECURITY_IMAGE đã lưu đúng share-dc7560ea1c34, Compose config không shell override PASS; không cần operator nhập lại keys/env hoặc restart. Bốn overlays base/security/lab/edge giữ nguyên; hai overlays sau thuộc operator/untracked. Image pin VM khác docs/main HEAD là có chủ đích. [Env mẫu](../deploy/lab-public.env.example) và [overlay mẫu](../deploy/compose.lab-public.example.yaml) không dùng để copy đè private config.

## Cutover và giới hạn vận hành

Runbook8.2.2 migration0003/backfill và8.2.3 web đã hoàn tất; fingerprint2sites/2versions trước/sau backfill khớp. Inventory3sites/7versions sau đó phản ánh dùng app. Không chạy lại migration/backfill chỉ vì merge source. EACCES #16 fix dc7560e giữ USER node/SQL bytes, CI restrictive-checkout/non-root probe và VM UID1000/21files PASS. [Recovery](validation/2026-10-21-runtime-permissions.md).

Viewer10base62 exact-case/CSPRNG/UNIQUE, một active/site, atomic rotate/revoke/reissue và tombstones; update/publish không hồi mã revoked. Viewer32hex aliases404. Thu hồi viewer không chặn direct content còn published; unpublish/delete chặn request mới, không thu hồi tab đã tải. Rollback ưu tiên SHARE_LINK_MUTATIONS_ENABLED=false, giữ schema/history; không lùi binary bật lại aliases sau revocation.

## Việc tiếp theo — #10 trước pilot/production

1. Kiểm kê DNS/reserved/nginx vhosts và regression vì443 mở chung IP; ghi scope và rollback/renewal/failure drill từng môi trường.
2. Chuẩn bị private R2/IAM/cleanup/gateway read-only và production Clerk/Google OAuth/provider quota/fail-closed. MinIO legacy chỉ là hiện trạng lab, không đáp ứng R2 hoặc mở ngoại lệ staging/production.
3. Hoàn tất domain thật cookie cfvn.cloud sibling/cross-environment, direct/iframe/preview/storage/workers/navigation và Chrome/mobile/Safari/iOS/Android/Zalo/crawler matrix; không nới sandbox.
4. Kiểm redaction preview-hostname toàn access/error/DNS/analytics pipeline, edge per-IP/concurrency/cache/unpublish, security review ADR0001/0003, staging/pilot/rollback và owner release approval. Budget600/min mỗi process không thay edge protection.

Đây là các release gates đang theo dõi ở #10; merge code không phê duyệt production. P5/P6 orphan/lifecycle/rate/retention còn trong PLAN, backup/restore ngoài MVP theo owner. ADR0002/0004 Accepted cho UI boundary/domain-link; ADR0001/0003 giữ Proposed.

## Quyết định và hồ sơ

Studio tập trung ODS blue, graphite/light; presentation → workflow → typed HTTP adapter → backend, lint enforce [ADR0002](adr/0002-replaceable-studio-ui.md). Thay UI không chuyển auth/storage/publish ra client; gateway process riêng. Domains/share codes theo [ADR0004](adr/0004-domains-and-share-codes.md).

Hồ sơ09/10: [upload](validation/2026-10-09-upload-hardening.md), [auth/origin](validation/2026-10-09-auth-origin-gates.md), [share86unit/20groups/Chrome](validation/2026-10-09-short-viewer-links.md), [TLS](validation/2026-10-09-lab-domain-tls.md). Hồ sơ21/10: [public origins](validation/2026-10-21-lab-public-origins.md), [build review](validation/2026-10-21-pr15-build-review.md), [permissions](validation/2026-10-21-runtime-permissions.md). Các snapshot chưa cutover/chưa merge trong hồ sơ cũ đã được mốc22/10 thay thế.
