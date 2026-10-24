# Project status — HTML Share Platform

> **2026-10-24 — Issue #35 / [Draft PR #41](https://github.com/cfotel2604/html-share-platform/pull/41)**. Base main `664e6c0` (PR39 MERGED/#32 CLOSED, live GitHub verified); implementation `da92385d4531d07884aafa228d7fec135c207891`. Các snapshot #32/#39 Draft bên dưới là lịch sử trước merge.

## A'-4 — Node/PostgreSQL administration

Đã khóa backendcloudflare/unknown ở startup/auth/DB/readiness/operator boundaries; chỉ PostgreSQL hợp lệ. Main không có APIWorker/tokenbridge của stack chưa merge và không nhập stack đó. Bootstrap một `/api/workspace`, Clerkchain một lượt, policy/listSQL local; health không gọi provider. Preview giữ VMgrant3phút/ADR0003, sandbox và UIpresentation không đổi.

Node upload dùng conditionalcreate PUT và stream readback size/SHA256/ETag trước finalmanifest/pointer/audit COMMIT; ETag thêm vào JSONB, không SQLmigration. Cleanup chỉ confirmed-new keys; PUTack chưa rõ giữkey/logversion-count để tránh xóa collision. Có thể còn privateorphan cần reconciliation; COMMITunknown giữobjects/503 như cũ.

**Đã kiểm:** 113unit/lint/typecheck/build/docs/YAML/diff PASS; standalone badbackend khôngready. Cả3CI tại `da92385` SUCCESS, có real PostgreSQL/MinIO500file, workspace, permissions/audit/policylocks, preview và sharelifecycle. [Validation](validation/2026-10-24-node-postgres-admin.md), [contract](NODE_POSTGRES_ADMIN.md). Follow-up chỉdocs; CIhead mới xem PRChecks.

**Còn mở:** live R2/IAM/latency và runtime/pilot/production thuộc38/10; không suy MinIO thành R2live. PR41 Draft/#35 OPEN chờ owner review/merge. Không chạm D1pilot/0004/Workers/VM/localDocker/ownerworktrees/privatefiles; migrations/package/Compose/Dockerfile giữ nguyên. Không làm projector33/Worker36; dependencyrisk40 giữ riêng. Bước tiếp theo là owner source review, không tự deploy.

## Snapshot Issue #32 trước merge — lịch sử

> Snapshot **2026-10-24 (Asia/Saigon)** — Issue #32 / [Draft PR #39](https://github.com/cfotel2604/html-share-platform/pull/39), implementation `b18d2a23d5ee9de4b55b195daf1d96fbb8215ea4`. Đã fetch/kiểm GitHub: `origin/main` là `8ce25b1` sau PR #30; primary checkout vẫn `main` `78cb7ca`, chậm 55 commit và được giữ nguyên. Bản ghi 22/10 bên dưới là lịch sử, không đại diện trạng thái pilot/GitHub ngày24/10.

## Mốc A' — Issue #32

- **Đã kiểm chứng GitHub:** PR #30 MERGED, ADR-0006 Accepted: PostgreSQL là nguồn sự thật; D1 chỉ public read model; quản trị Node/VM, một Worker public. Epic #31 và Issues #32–#38 OPEN. Các PR #19, #21–#24, #27, #29 vẫn Draft; không merge stack cũ theo kiến trúc đã bị thay thế.
- **Đã triển khai local:** migration D1 additive `0004_public_read_model.sql`, schema đúng 7 trường public, manifest chỉ path/R2 key/size/ETag, SQL lookup theo code exact-case và UPSERT chỉ nhận revision mới. Tombstone revoked giữ vĩnh viễn; old replay không hồi sinh mã. [Contract/rollout](D1_PUBLIC_READ_MODEL.md), [validation](validation/2026-10-24-d1-read-model.md).
- **Agent đã kiểm:** 94/94 tests (86 cũ + 8 D1/workerd) PASS, lint/typecheck/docs/YAML/diff PASS; migration trên D1 local trống và legacy schema có dữ liệu tổng hợp PASS, giữ mọi bảng/dòng cũ; Wrangler local apply/re-apply PASS. Build/standalone packaging PASS sau retry, còn cảnh báo bảo mật dependency kế thừa.
- **Agent đã kiểm live chỉ đọc lúc13:41:50:** D1 pilot `hsp-pilot-desktop` có `read_replication.mode=disabled`, metadata query `served_by_primary=true`, `changed_db=false`; ledger có 0001–0003, chưa có 0004. Không đọc identities/codes/HTML thật, không thay provider config/data.
- **Remote đã kiểm sau owner duyệt riêng:** lúc14:19:04 ngày24/10, đã recheck account/database theo private receipt, replication disabled, SQL SHA-256 `346782e2083574601b709a1b2e254e5e250d39bb5f4b5e9f39458980f7992aed`, list chỉ0004 pending; sau đó áp duy nhất0004. Readback bảng mới0rows/đúng7columns, ledger thêm0004/entries cũ nguyên vẹn, toàn bộ11bảng/schema legacy có fingerprint trước/sau khớp; pending0, replication disabled. Private receipt lưu ngoài Git, không log dữ liệu legacy.
- **Gate còn mở:** technical acceptance #32 đã có bằng chứng; PR #39 giữ Draft/#32 OPEN chờ owner review/merge riêng. Cả3CI ở source `9f27104` PASS; follow-up này chỉ docs, xem Checks của head mới. Pilot còn bảng quản trị legacy: additive migration giữ dữ liệu, chưa đạt whole-database minimization gate.
- **Rủi ro riêng:** [Issue #40](https://github.com/cfotel2604/html-share-platform/issues/40) ghi Next16.4.0/Zod4.6.5 có cảnh báo audit, đều bằng main; không sửa dependencies ứng dụng trong #32. Miniflare dev-only dùng Undici7.30.1 đã vá.

Bước tiếp theo: owner review/merge PR #39 theo quyết định riêng; migration remote0004 đã xong, không chạy lại. Sau #32 merge mới bắt đầu projector #33. Rebuild #34, Node #35, Worker #36, disposition tài liệu/PR #37 và pilot acceptance #38 là các phạm vi riêng theo [D1_READ_MODEL_PLAN](D1_READ_MODEL_PLAN.md). #10 giữ release/security gates. Quyền remote này không cho phép merge/deployWorker/chạmVM hoặc Docker/provisionlegacy; không thao tác nào như vậy đã chạy. Lab runtime, DNS, env, Docker volumes và các PR khác giữ nguyên.

## Snapshot lab/merge lịch sử — 2026-10-22

> Snapshot **2026-10-22 (Asia/Saigon)** sau owner giao Ready/merge #13 → #15 và chốt handoff. Chuỗi code đã vào main tại `0c17a09b68960d785f8b67b2a1585b0f3af919b8`; lab giữ runtime dc7560e đã nghiệm thu, không deploy hoặc chạy lại migration/backfill trong mốc merge. [Lab handoff](LAB_HANDOFF.md), [merge record](MERGE_PLAN.md), [review sau merge](reviews/2026-10-22-stack-merged.md), [AI_HANDOFF](AI_HANDOFF.md). Markdown không thay kiểm GitHub/VM hiện tại.

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
