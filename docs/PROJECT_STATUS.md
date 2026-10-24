# Project status — HTML Share Platform

> **2026-10-25 — Issue38 / [DraftPR48](https://github.com/cfotel2604/html-share-platform/pull/48)**. Base main `9010dc56957a34f74d8cf7f8b4e35792b26bfcf2`; source/checkpoint commits `f4ad6c9` and `1bd8bd8`. Implementation `81327dd` passed4/4CI; final documentation head/CI in PR48. [Current authority](PILOT_APRIME_AUTHORITY.md) supersedes historical per-packet Cloudflare approval; VM permission remains read-only.

Completed remote steps: deployed the merged A' public Worker artifact, retired `hsp-pilot-api`/`hsp-pilot-preview`, then applied only new0005 after `f4ad6c9` passed4CI checks and fresh target/config/schema/count/model guards. Exactly11 legacy D1 tables /585 rows deleted. Model table, guards, empty-row fingerprint and ledger0001–0004 preserved; ledger adds0005, FKcheck empty. **0004 and0005 are applied/immutable.** No R2 objects, PostgreSQL data or production resources deleted. Node HEAD denials passed; Python403 client difference remains unresolved. No published model row exists, so this is not a live200/revoke/latency acceptance. [Full receipts](validation/2026-10-24-aprime-pilot-execution.md).

The current source candidate removes Node public PG serving: generated share links go straight to the HTTPS Worker, retired Node aliases return404 before Clerk/data, gateway accepts only scoped preview grants. Missing/unsafe public origin fails before object side effects or publish commit; emergency unpublish/revoke remain available. Local168 unit tests, lint/typecheck and6 native smoke cases passed. Integration fixtures retain PG RBAC/ownership/audit,500-file readback and private-preview checks. The runtime image now packages `project.sql`; CI imports projector/recovery libraries as the non-root image user without network. At81327dd all4CI checks passed, including the non-root SQL/import probe and isolated500-file integration. Final head/CI in PR48.

[Standalone VM Compose and bounded rollout proposal](PILOT_APRIME_NODE_ROLLOUT.md) are prepared, unexecuted. Read-only `lab-b` showed old source `dc7560e`, PG ledger0001–0003/no outbox, MinIO and no projector token. Actual durable Node/R2/projector/rebuild, healthy SLO, outage/VM-off and browser/collector gates remain OPEN. Separate dependency Draft49 patches the inherited Next/Zod findings; owner must merge/revalidate the combined source before any new Node rollout. VM writes and operator secret-store provisioning still need owner authority. Draft47@87566b2 has3/3CI and the old6PR/4Issue closure receipt;10/audit19 remain OPEN. Keep Draft/no autoMerge or merge scheduler. Older snapshots below are historical.

> **2026-10-24 — Issue #38 preparation / [Draft PR #46](https://github.com/cfotel2604/html-share-platform/pull/46)**. Owner báo merge45; fetch/GitHub xác nhận main `76b38faf169477af480690f222123214f4d8c3c5`, PR45 MERGED13:58:40UTC, head `eecf6cc` ba checks SUCCESS. Branch `docs/38-pilot-acceptance-prep`, early scope `1549b17`; exact final head/CI trong PR46. Snapshot Draft45/đợi merge45/ngưỡng còn proposal bên dưới là lịch sử trước quyết định38.

## A'-7 — đã chuẩn bị, chưa nghiệm thu pilot

- Owner **đã chốt** p95 commit revoke→public404≤60giây khi projector/REST khỏe; cảnh báo bất kỳ revoke pending>60giây + Admin chưa đồng bộ. Khi projector/REST dừng, không bảo đảm chặn trong60giây: công bố riêng độ trễ thực tế/outbox/recovery/containment, không trộn hoặc giấu khoảng sự cố trong p95 khỏe. ADR/Guide/plan/runbooks cập nhật; đây là policy, chưa phải remote PASS/approval.
- [Hồ sơ #38](PILOT_APRIME_ACCEPTANCE.md) có7approval packets A–G,12scenario rows, phương pháp đo/phân loại và containment/rollback; [validation/remote ledger](validation/2026-10-24-aprime-pilot-preparation.md) ghi rõ **mọi gate remote NOT RUN/OPEN**. D1 cần kiểm cả legacy và owner quyết phương án dữ liệu/target trước projection; không tự xóa/copy ngược D1→PG. Cần fence old writers, NodePG/secret/collector riêng, actual deployed bindings/secrets/singleWorker, readback và compatible rollback; không suy quyền từ merge45.
- **Đã kiểm local** trên source không đổi từ76b38fa: npmci,162/162unit,12batch/12event benchmark PGlite/localD1/syntheticR2 (n6/1file và n6/500file), localWorkerbundle175478bytes. Local p50/p95 chỉ COMMIT-ack→projected-marker, không actualCOMMIT→public404/pilot. #40 audit warnings kế thừa, không sửa dependency. Docs/check/head/CI trong PR46; không code/SQL/config/lockfile thay đổi.
- **Chưa chạy:** Cloudflare/realD1/R2/Workerdeploy/retirement/projector/rebuild/PGVMmigration/tokenrotate/VM/SSH/localDocker/ownerprivatefiles. Historical metadata3Workers ở#37 không được coi là triển khai mới hoặc readiness hiện tại. Source39/41/42/43/44/45 đã merge;33/34/36/37/38/10/40 còn OPEN tại recheck. Quyết định đóng legacy7PR/5Issues vẫn chờ owner.
- PR46 giữ Draft; chỉ phần chuẩn bị hoàn tất. Chờ owner review và giao packet cụ thể; không tự thực thi remote, autoReady/merge/deploy hoặc cài lịch/poll. #10/production và #40 riêng; ownerworktrees/main78cb7ca/env/untracked/uploads/volumes giữ nguyên.

## Snapshot Issue #37 trước merge — lịch sử

> **2026-10-24 — Issue #37 / [Draft PR #45](https://github.com/cfotel2604/html-share-platform/pull/45)**. Owner báo merge44; đã fetch/kiểm GitHub: main `85f39e21f2dfda8f50239ecfa172369cc98f5845`, PR44 MERGED13:23:09UTC, head `60f1f74` bốn checks SUCCESS. Branch riêng `docs/37-architecture-disposition`, scope mở Draft tại `65207aa`. Exact final head/CI ở PR45; [validation](validation/2026-10-24-adr0006-transition.md). Mọi trạng thái đợi merge44/Draft44 bên dưới là lịch sử.

## A'-6 — đề xuất disposition và đồng bộ kiến trúc

- [Bảng xử lý](ADR0006_TRANSITION.md) có đủ PR19/21/22/23/24/27/29 và Issues10/20/25/26/28: đề xuất giữ audit19/10 mở, giữ20 làm historical tracker, đóng/thay thế21/22/23/24/27/29 và25/26/28 sau owner review. **Tất cả quyết định owner vẫn PENDING**; không close/merge/retarget/Ready/source rewrite. Ghi chú kiến trúc additive đã hiển thị trên cả12mô tả, mô tả gốc giữ nguyên byte nội dung; state/Draft/base/head/title giữ nguyên. Bảy PR vẫn OPEN/Draft, năm Issue vẫn OPEN.
- **Đã kiểm chứng:** PR39/41/42/43/44 merged source; #32/#35 CLOSED, #33/#34/#36 OPEN cho pilot. Wrangler4.152 deployments list/versions view chỉ đọc vẫn thấy3Worker legacy; public/preview23/10 12:25UTC, API14:31UTC, DB/ASSETS và API có2secret binding names. Không đọc secret values/upload/data rows. Metadata không chứng minh public behavior, bucket privacy hay readiness.
- **Theo hồ sơ cũ:** private R2/r2.dev-off, real Clerk/R2/500smallfiles, browser sandbox/owner reports, Desktop image và VM lab pins giữ provenance ở PR24/27/29 và lab22/10. Không dùng chúng làm A' acceptance. Runtime VM/Desktop/rows D1/replication/currentIAM/currentR2privacy chưa kiểm phiên37.
- Đã đồng bộ AGENTS/PLAN/README/ARCHITECTURE/Agent Guide/plan A': Node/PostgreSQL quản trị duy nhất, D1 qua outbox/projector/recovery, một Worker chỉ đọc ở code/test/review/deploy gate (native capability không IAM read-only), preview Node/VM. Plan37 sửa wording thực thi đóng thành đề xuất theo liveIssue37;60giây vẫn proposal. Token account/storage/rotation đã chốt, không hỏi giá trị.
- **Còn lại:** owner review PR45 và quyết từng legacy item. Chỉ sau owner báo merge45 mới chuẩn bị #38 trong branch/Draft riêng. Remote projector/rebuild/Worker deploy/legacy writer freeze+retirement/Node runtime+secret/VM-off drills đều cần duyệt scoped riêng. #38 phải kiểm D1 data gate gồm legacy, không tự xóa;500file provider/p50/p95, revoke/incident/auth/ownership/audit/preview/logging/VM independence còn mở. #10 security/release và #40 dependency issue giữ riêng. Không auto Ready/merge/deploy/poll/cài lịch.

## Snapshot Issue #36 trước merge — lịch sử

> **2026-10-24 — Issue #36 / [Draft PR #44](https://github.com/cfotel2604/html-share-platform/pull/44)**. Base main `f6c78340983060687b969d7aae0e2f7e80ebd381`; live PR43 MERGED sau owner báo. #33/#34 vẫn OPEN cho pilot gates. Source/test head `3601b0b222e720934ac32adea8dbf7bbb8eda35e`. Các trạng thái Draft43/đợi merge bên dưới là lịch sử.

## A'-5 — Worker public: local/CI đạt, pilot chờ duyệt riêng

Worker native adapter dùng đúng SELECT tham số hóa từ resolve.sql, không Sessions, tối đa1query/request; R2get/head theo manifest pin path/size/ETag. Canonical/root/nested/direct HTML giữ HTTPsandbox/no-store/nosniff/no-referrer; không route quản trị/preview/token/Nodefetch. AST guard quét source và bundle, chặn API/SQL ghi, native escape, dynamicSQL và egress/logging; test phủ định status/path/injection đạt. Có build ESM/local template, không deployment. [Contract/runbook](PUBLIC_READ_MODEL_WORKER.md), [validation/giới hạn](validation/2026-10-24-public-read-model-worker.md).

**Owner đã chốt:** read-only ở code/test/review/gate deploy, native D1/R2 vẫn có capability ghi; không IAM-read-only, không ngoại lệ ADR0006, không duyệt deploy. ADR/Guide/plan đã ghi rõ, không còn câu hỏi binding pending.

**Agent-checked `3601b0b`:** cả4CI SUCCESS;162unit/lint/typecheck/appbuild + Workerbundle,5nhóm realPG/outbox/recovery và security integration kế thừa500file/RBAC/ownership/audit/preview/origin.20Worker cases gồm actual workerd/localD1/R2, Node500→outbox→projector→Worker, source local đóng/mở lại vẫn200 không thêm projection, revoke/rotate/version/unpublish/replay, egress0. Wrangler4.152types local PASS sau sửa custombuildcwd. Dev-only esbuild0.28.2 được thêm; runtime dependency versions/applied migrations/read-model SQL không đổi. #40 inheritedNextwarning giữ riêng.

**Chưa xác minh:** actual deployed single Worker/binding-secret inventory, live primary/replication/R2/VMoffline/logs hai phía/browser/mobile/pilotrevoke404.60giây vẫn proposal. Không deploy/D1remote/VM/localDocker/ownerprivatefiles, không tự Ready/merge hoặc đóng36 từ source checks. PR44 giữ Draft chờ owner review; chỉ sau owner báo merge mới làm37, rồi chuẩn bị38; không lịch/poll merge.

## Snapshot Issue #34 trước merge — lịch sử

> **2026-10-24 — Issue #34 / [Draft PR #43](https://github.com/cfotel2604/html-share-platform/pull/43)**. Base main `a98a1d62e9a2a51b841e548792979e712190774d`; live PR42 MERGED sau owner báo, #33 vẫn OPEN cho pilot. Source `78fcb63dac63e34f92aae156ba868a2a9a00cd18`. Snapshot Draft42/heartbeat bên dưới là lịch sử, đã bị thay thế.

## A'-3 — Rebuild / reconciliation

CLI Node operator-only có dry-run diff redacted/fingerprint; apply bắt buộc plan đã review và Admin/allowlist hợp lệ. Rebuild toàn bộ code/tombstones hoặc reconcile phần lệch bằng outbox mới có audit rồi dùng lại projector guarded/throttle. Read và write chia sẻ slot5giây; paging20rows,100codes/event, giới hạn bộ nhớ và chặn invariant conflicts/source race. Không alternate D1 SQL writer, không sửa applied migration/contract, không thay UI/Worker. [Runbook](READ_MODEL_RECOVERY.md), [validation](validation/2026-10-24-read-model-recovery.md).

**Agent-checked `78fcb63`:** cả4CI SUCCESS,142unit/lint/typecheck/build,5nhóm real PostgreSQL/outbox/recovery và security integration kế thừa500file/RBAC/ownership/audit/preview/origin. Local12recovery tests PASS gồm D1trống/driftrepair/legacy101tombstones/paging/source races/quyền/throttle. Owner cho phép1agent độc lập đọc/thực thi runbook; reader đạt12/12local tại đúng head này, không ambiguity cản chạy, receipt/giới hạn ở validation. Standalone disabled/SQL packaging và docs/YAML/diff PASS. #40 Next security nudge kế thừa giữ riêng; dependency versions không đổi.

**Còn mở:** actual pilot rebuild/reconcile/R2live/Worker404 và60giây chưa được coi là acceptance. Independent-reader local gate đã đạt, không thay remote acceptance. Không ghi/đọc D1remote trong34, không VM/localDocker/ownerprivatefiles/worktrees/deploy. Recovery có thể dừng sau những chunk đã commit/audit khi có race/lỗi; giữ queue và replan, không xóa. Conflicts identity/tombstone/target-ahead/unknown-code cần owner recovery plan riêng.

**Nhịp owner mới:** đã xóa automation theo dõi merge; không cài lại/poll. PR43 giữ Draft cho owner review; **chờ owner báo merge43** rồi kiểm main và làm36, tiếp37, chuẩn bị38. Source merge không cấp quyền remote.

## Snapshot Issue #33 trước merge — lịch sử

> **2026-10-24 — Issue #33 / [Draft PR #42](https://github.com/cfotel2604/html-share-platform/pull/42)**. Base main `40b0dd9f03d951ae8d98064e265f953e250b4a75`; live GitHub: PR39/41 MERGED, #32/#35 CLOSED. Implementation `9a0b1f6`, regression guards `004792a4c8326e6b24cbc8708cf7dc4b8ca5c352`. Các snapshot Draft/OPEN của #32/#35 bên dưới là lịch sử.

## A'-2 — Transactional outbox / Node projector

PostgreSQL migration additive mới0004 ghi outbox cùng source transaction, snapshot cuối transaction và revision theo khóa site. Job Node riêng mặc định tắt; một REST batch guarded/event, FIFO từng site, ưu tiên chuỗi revoke, replay an toàn. Advisory lock/throttle bền vững tối thiểu5giây,429/auth cooldown/alert; metric độ sâu/lag/revoke và nhãn Admin đang chờ chiếu. Không có handler ghi/gọi D1. [Runbook/token policy](PUBLIC_PROJECTOR.md), [validation tại exact heads](validation/2026-10-24-public-projector.md).

**Đã kiểm chứng `004792a`:** cả4checks SUCCESS:130unit/lint/typecheck/build,4nhóm real PostgreSQL/outbox và security integration kế thừa (RBAC/ownership/audit, preview,500file upload/readback). CI benchmark PostgreSQL16 + D1 giả lập:12events/12RESTbatches,6mẫu/nhóm;1file p50/p95=4989.780/4994.840ms,500file=4914.006/4935.046ms. Đây không phải pilot latency/Worker404 acceptance. Docs/YAML/diff và standalone disabled/SQL-package checks PASS; Next dependency risk #40 giữ riêng.

**Chỉ đọc remote:** constant SELECT xác nhận REST batch số/NULL, changed_db=false, replication disabled. Config private mới của task không token, cả hai cờ chạy false. Không projector remote, không ghi D1/áp lại0004/deploy Worker/chạm VM/localDocker/ownerworktrees/privatefiles. Applied PG0001–3 và toàn bộ D1 contract/schema không đổi. Migration không backfill lịch sử; republish/rotate version cũ thiếu verifiedETag bị chặn COMMIT, cần upload mới đã readback; unpublish/revoke vẫn được.

**Owner đã chốt:** account hiện tại, token riêng `hsp-projector-pilot` chỉ D1Read/Write ở Node secret store; rotation90ngày/incident và revoke khẩn theo runbook. **Còn mở:** duyệt riêng remote projector/VM migration, liveR2/pilot p50/p95/public revoke404;60giây vẫn là đề xuất, chưa chốt SLO. PR42 giữ Draft, không tự Ready/merge/deploy. Theo Fast-track đã duyệt: owner merge42 rồi tự làm34, tiếp36,37, chuẩn bị38; mỗi issue một branch/Draft riêng, refresh live dependencies trước. Theo dõi cùng chat mỗi10phút, im lặng khi chưa đổi; merge source không cấp quyền remote.

## Snapshot Issue #35 trước merge — lịch sử

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
