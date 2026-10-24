# AI Agent handoff — HTML Share Platform

> Phiên **2026-10-24 (Asia/Saigon)** — Issue #32 / [Draft PR #39](https://github.com/cfotel2604/html-share-platform/pull/39), implementation `b18d2a23d5ee9de4b55b195daf1d96fbb8215ea4`, branch `feat/32-d1-public-read-model` từ `origin/main` `8ce25b1` (PR #30 MERGED). [Validation](validation/2026-10-24-d1-read-model.md), [contract/migration](D1_PUBLIC_READ_MODEL.md). Mục22/10 bên dưới là bằng chứng lịch sử; không suy ra runtime hoặc GitHub hiện tại.

## Tiếp tục Issue #32 / kiến trúc A'

1. Đọc `AGENTS.md`, [ADR-0006](adr/0006-postgresql-source-of-truth-d1-public-read-model.md), [Agent Guide](D1_READ_MODEL_AGENT_GUIDE.md), [plan](D1_READ_MODEL_PLAN.md) và các ADR/bối cảnh theo thứ tự hướng dẫn. Kiểm live refs/PR/Issues. ADR-0005 chưa ở main; đã đọc phần serving từ PR #21 `77ae10a`, ghi provenance trong PR39/validation. PostgreSQL là nguồn sự thật; không dùng lại đường API Worker/D1-primary/preview Worker của stack cũ.
2. Worktree phiên này: `C:\Users\admin\.codex\worktrees\32-d1-read-model\html-share-platform`. Primary owner checkout vẫn main78cb7ca, chậm55 commit so `origin/main` tại startup; không reset/clean/switch nó. Các worktree owner, untracked/private env và Docker volumes được giữ nguyên. Remote chỉ áp D1schema0004 theo owner duyệt ởmục6; không provision resource, thay lab VM/Desktop runtime hoặc deploy Worker.
3. Đã làm đúng phạm vi #32: D1 read model7trường, additive0004 độc lập từ legacy0001–0003, manifest4trường/asset, exact-case indexed lookup và projection UPSERT có guard. Revoked là tombstone vĩnh viễn; SQL/triggers chặn replay ghi lùi, reassignment và DELETE. Empty read model không import dữ liệu quản trị legacy; projector/rebuild thuộc #33/#34.
4. **Agent-checked local ở b18d2a2:** 94/94unit (8D1/workerd) PASS; lint/typecheck/docs/YAML/diff PASS; Wrangler4.152.0 local apply0004 PASS, lần2 không còn migration pending. D1 tests áp schema trống và legacy fixture có dữ liệu tổng hợp, đối chiếu giữ nguyên tất cả bảng/dòng cũ. Build retry/standalone packaging PASS nhưng Next16.4.0 vẫn cảnh báo security; [Issue #40](https://github.com/cfotel2604/html-share-platform/issues/40) theo dõi Next/Zod kế thừa main. Không chạy upgrade ngoài phạm vi.
5. **Agent-checked live chỉ đọc13:41:50 ngày24/10:** private receipt/account/database khớp; D1 `hsp-pilot-desktop` replication disabled; SELECTmetadata `served_by_primary=true`, `changed_db=false`; ledger0001/0002/0003, chưa áp0004. Không in credentials, IDs riêng, identities, codes hoặc bytesupload. Đây là setting hiện tại của pilot, chưa phải bằng chứng futureWorker#36.
6. **Owner đã duyệt remote0004 và đã hoàn tất14:19:04 ngày24/10:** run từ source `9f27104`, recheck account/database/private receipt, replication disabled, SQL SHA-256 `346782e2083574601b709a1b2e254e5e250d39bb5f4b5e9f39458980f7992aed`, list chỉ0004 pending đều PASS. Áp đúng một migration bằng config private migration-only; readback bảng mới0rows/7columns, ledger thêm0004 và entries cũ giữ nguyên, fingerprints schema/data của cả11legacy tables trước/sau khớp, pending0/replicationdisabled. Private receipt ngoài Git chỉ fingerprints/counts/verificationmetadata, không rawrows/tokens. Không reapply trong phiên tiếp theo.
7. **Còn mở:** PR39 vẫn Draft/#32 OPEN, technical acceptance có đủ bằng chứng nhưng quyền remote không cho merge/Ready/deployWorker/chạmVM/Docker/provisionlegacy. Chờ owner review/merge riêng; không bắt đầu #33 trước dependency merge. Cả3CI ở9f27104 PASS; docs follow-up xem Checks tại head mới.

Quy trình remote đã thực thi đúng một lần theo owner duyệt; [validation](validation/2026-10-24-d1-read-model.md) ghi recheck/apply/readback và thời gian. Migration additive không thay dữ liệu cũ và bắt đầu bảng mới rỗng; source of truth vẫn PostgreSQL. Không có projector/serving cutover hoặc quyền runtime khác trong mốc này. Rollback giữ table/ledger/tombstones và serving hiện tại; không xóa/replaylegacy hoặc bật D1-primary writers. Dữ liệu quản trị cũ còn trên pilot chưa đáp ứng data-minimization gate, cần quyết định retirement/cutover ở#35/#37/#38.

GitHub đã kiểm: PR30 MERGED; PR19/21/22/23/24/27/29 vẫn Draft; Issues10/20/25/26/28 và31–38 OPEN tại startup; security40 tạo từ audit trong phiên. Không đóng/sửa disposition các PR/Issues cũ. Sau #32 đạt gate và merge: #33 transactional outbox/projector; #34 rebuild; #35 Node quản trị; #36 một Worker public; #37 disposition/tài liệu; #38 pilot acceptance. #10 vẫn giữ release/production decision. Không tự mở rộng #32 hoặc triển khai runtime để bù acceptance chưa được giao quyền.

## Bàn giao lab/merge lịch sử — 2026-10-22

> Bàn giao **2026-10-22 (Asia/Saigon)** sau merge theo owner giao. Chuỗi #5 → UI#17 → #13 → #15 đã vào main; mốc tích hợp code `0c17a09b68960d785f8b67b2a1585b0f3af919b8`. Lab đã nghiệm thu, giữ source/web dc7560e và gateway security-417c50d; không deploy/migrate/backfill trong mốc merge. [Status](PROJECT_STATUS.md), [lab](LAB_HANDOFF.md), [merge record](MERGE_PLAN.md), [review/CI](reviews/2026-10-22-stack-merged.md).

## Bắt đầu phiên tiếp theo

Đọc AGENTS/README/PLAN/ARCHITECTURE/WORKFLOW/ADRs và các handoff trên. Kiểm git status/worktree/remotes, fetch origin --prune, log origin/main và live GitHub. Main checkout owner có thể cũ, không dùng nó để kết luận code chưa merge; không reset/clean hoặc sửa main trực tiếp. Giữ untracked/env/uploads/volumes.

#13 MERGED main6d30d22 từ tested head8f204c3, #15 đã retarget main và MERGED main0c17a09 từ tested headb21ea12; cả hai3checks SUCCESS, lần lượt79unit/15groups và86unit/20groups. Main trees bằng tested heads, fixdc7560e là ancestor main; runtime source/schema/permissions không đổi qua retarget. Không merge lại hoặc hỏi lại quyền cho chuỗi đã xong. #8/#9/#11/#14/#16 CLOSED theo acceptance/merge; **#10 OPEN** cho release gates, không đóng từ việc lab chạy tốt.

Task worktree sau chốt docs: `C:\Users\admin\.codex\worktrees\studio-main-recovery\html-share-platform`, branch codex/lab-merge-handoff từ main sau #15. PR15 worktree `C:\Users\admin\Documents\Codex\html-share-platform-pr5-sync` giữ codex/14-short-viewer-links. Owner primary main checkout và local-mvp worktree giữ nguyên. CI của PR tài liệu theo Checks, không suy exact head cũ thành head mới.

## Runtime VM — lần kiểm chỉ đọc ngày22/10 trước merge

SSH lab-b, `/opt/hsp/src`, project hsp-lab; source detached `dc7560ea1c34cbe060779fbe69bb2f574e170431`, tracked sạch. Web `html-share-studio:share-dc7560ea1c34`, revision đúng, image ID `sha256:7967815b1c25611fc4237f929bc3cf21c21243f242524073f1509e3a3654232a`. Gateway giữ `html-share-studio:security-417c50d`, ID `sha256:9d4b698d598daa34dc5a21e05b94e4250fa58425d26856635f343b0bf13fc39c`. Web/gateway/PostgreSQL/MinIO healthy. Không recheck hoặc đổi VM/Desktop chỉ để merge GitHub.

DB0001/0002/0003;3sites/7versions,3active/3revoked links, thiếu history/manifest0. Đây là inventory ngày kiểm, có thể tăng sau owner dùng app; không so baseline2sites/2versions trước cutover hoặc Desktop10sites/17versions. Owner xác nhận session thật ownership/Admin audit/deny/revoke/disable/logout và share lifecycle đều đạt. Không đọc/log session, email, audit actor hay HTML thật để chứng minh lại.

Studio `https://studio-lab.ods.vn`, viewer `https://view-lab.ods.vn/<10-base62>`, content `https://<32hex>.lab-space-ods.cfvn.cloud/`; Clerk Development. Web3100/gateway4100 loopback, DB/storage không host ports; public port rỗng trong overlays. Studio/viewer qua Cloudflare, content directVM/nginx. Owner mở443/tcp anyIPv4/IPv6 và xác nhận khách ngoài xem iframe; các nginx vhosts khác chưa có full inventory/regression.

Agent kiểm HTTPS từ VM: Studio200, canonical viewer200/iframe sandbox allow-scripts, direct200/HTTP sandbox/frame-ancestors, viewer API404/host-ID alias404; no-store/no-cookie. Owner-confirmed acceptance tách khỏi agent probe; chưa full cookie/mobile/sibling/4G matrix.

## Env, overlays và thao tác đã xong

SECURITY_IMAGE đã lưu đúng share-dc7560ea1c34, Compose config không shell override PASS, web running. Không yêu cầu operator lặp lại hoặc đổi pin sang main/docs HEAD. Bốn overlays theo thứ tự base/security/lab/edge; hai file cuối operator-owned/untracked. [Env sample](../deploy/lab-public.env.example)/[overlay sample](../deploy/compose.lab-public.example.yaml) chỉ minh họa, không copy đè private env hoặc áp tự động.

Security overlay dùng SECURITY_IMAGE cho web/migrate/gateway; up toàn stack có thể thay gateway. Routine web update đã được giao phải dùng cùng project/env/files với --no-deps --no-build web. PUBLIC_SITE_PORT= trong env chưa đủ vì GATEWAY_PORT; overlay cuối đặt chuỗi rỗng cho web/gateway. Không dump Compose config có secrets, dùng config --quiet.

Runbook8.2.2 migration0003/backfill và8.2.3 web cutover đã xong. SQL checksums/fingerprint đúng; EACCES#16 đã fix scripts/db a+rX, USER node/root ownership/SQL bytes giữ nguyên, CI restrictive checkout và VM UID1000/21files PASS. Không chạy lại migrate/backfill/restart khi merge docs hoặc mở shell mới, không migrate root/sửa applied SQL.

## Ranh giới cần giữ

- Server Clerk active online session/verified Google + DB allowlist/role/status; Employee owner-only/Admin audit. Fresh actor/policy/site locks trước ingest/storage/state change, exact Origin/Host. Không fallback demo hoặc tin client/JWT role.
- /api không match Next proxy để giữ early22MiB413 trước multipart; ZIP hostile/path/entry/quota validation, immutable atomic publish và ownership trước storage giữ nguyên.
- UI presentation → hook → typed HTTP adapter; backend auth/DB/storage/publish riêng, lint enforce. Không cần thay backend khi đổi presentation.
- Trusted viewer ods.vn và content cfvn.cloud khác eTLD+1; mọi HTML/direct có HTTP sandbox và iframe không allow-same-origin. Preview128bit/hashDB/site-version-actor/TTL3phút, bearer hostname cần redact toàn pipeline; không log codes/grants/cookies/payload.
- Viewer10base62 exact-case/CSPRNG/UNIQUE/tombstones, một active/site; atomic rotate/revoke/reissue+audit, update/publish không hồi revoked, aliases32hex404. Revoke viewer không unpublish direct content; unpublish/delete chỉ chặn request mới.
- Rollback ưu tiên SHARE_LINK_MUTATIONS_ENABLED=false, giữ schema/history; không lùi binary bật lại aliases. COMMIT unknown503/refresh/discard connection; không xóa storage objects trước đối chiếu references.

## Công việc tiếp theo — #10

Kiểm kê DNS/reserved/nginx vhosts vì443 mở chungIP và lập rollback/renewal drill. Chuẩn bị private R2/IAM/cleanup/gateway read-only, production Clerk/OAuth/provider limits. Chạy real-domain cookie cfvn.cloud sibling/cross-environment/direct/iframe/preview/storage/workers/navigation và mobile/Safari/iOS/Android/Zalo/crawler matrix. Kiểm toàn preview log redaction, edge per-IP/concurrency/cache/unpublish; security review ADR0001/0003, staging/pilot/rollback và release approval riêng.

ADR0001/0003 Proposed;0002/0004 Accepted. VM legacyMinIO không đạt R2 gate hoặc ngoại lệ staging/production. Budget600/min mỗi process không phải antiDDoS. Backup/restore ngoài MVP theo owner; các phần orphan/lifecycle/retention trong PLAN chưa tự hoàn tất. Không provision/đổiDNS/deploy production nếu chưa được giao.

Owner Desktop worktree local-mvp b3f8119/.env/volumes giữ nguyên; baseline09/10 security-613f2b7/Clerk, chưa recheck22/10. Hồ sơ cũ trong [validation22/10](validation/2026-10-22-lab-acceptance.md), [upload](validation/2026-10-09-upload-hardening.md), [auth](validation/2026-10-09-auth-origin-gates.md), [share](validation/2026-10-09-short-viewer-links.md), [TLS](validation/2026-10-09-lab-domain-tls.md), [origins](validation/2026-10-21-lab-public-origins.md), [build](validation/2026-10-21-pr15-build-review.md), [permissions](validation/2026-10-21-runtime-permissions.md). Dùng mốc sau merge cho GitHub hiện tại, không xóa bằng chứng lịch sử.
