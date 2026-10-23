# AI Agent handoff — HTML Share Platform

## Pilot path Workers/D1/R2 — 2026-10-23

Mốc implementation **dcdfd0b**, branch codex/cloudflare-studio-integration, Draft #23 stacked trên #22(core3b74981) và #21(ADR77ae10a); handoff docs-only sau mốc này. [Local evidence](validation/2026-10-23-cloudflare-pilot.md), [runbook/config/failure/rollback](CLOUDFLARE_PILOT_RUNBOOK.md).90unit/19Miniflare D1-R2/identity/bridge/reconcile groups, lint/typecheck, Next16.4.2build và3Worker dry-run PASS; Chrome156/Firefox156 mỗi7groups synthetic PASS. Prod npm audit0;5dev-only inherited ESLint-chain advisories, không dùng force downgrade. Current PR head/CI kiểm GitHub; không suy3b74981 thành final head.

Pilot selector METADATA_BACKEND=cloudflare không mở pg hoặc fallback; AUTH_MODE=clerk, service credential và R2 credentials riêng. Defaultpostgres giữ lab. NodeverifyR2 trướcfinalize; ambiguousfinalize giữobjects/tra receipts. PrivatePreview direct tab sau same-origin POST, không GET cấpgrant hoặc iframe trong pilot. API health service-only; scheduled orphan reconciliation có system actor, guard/reference check/retry, chưa Cron. Test fixture auth chỉ trong tests; không deploy fixture transport hoặc copy lab .env. Resource IDs/origins trong Wrangler là mẫu, namespace chưa xác minh, workers_dev/preview_urls/observability mặc định tắt. Remote privateR2/Clerk/quotas/logging/browser-mobile/security/release approval còn #10; full500files cần kiểm subrequest budget. SQL PostgreSQL0001–0003 bytes giữ nguyên; không SSH/deploy/provision/DNS/UFW/runtime/env mutation. #19 audit giữ nguyên, #20 chờ review, ADR0001/0003/0005 Proposed; không merge tự động.

ADR/contracts PR #21 Draft, commit77ae10a; core branch codex/cloudflare-path-core stacked trên #21. Miniflare local11 nhóm (guard/CAS/audit rollback/lost receipt/revocation/preview/hash-only/tamper/stream) PASS, legacy86unit/lint/typecheck/docs/7YAML/diff PASS và ba Worker dry-run bundles PASS. Không remote deploy/provision; Node bridge/browser còn tiếp sau core. Dependency audit phát hiện Next16.4.0 có advisory mới trên base; xử lý patch ở PR integration và ghi evidence, không cập nhật VM.

Task #20 được owner giao implement, Refs #10. Worktree `C:\Users\admin\.codex\worktrees\cloudflare-path-pilot\html-share-platform` từ main72e048e; bắt đầu branch codex/cloudflare-path-adr. Đọc [ADR-0005 Proposed](adr/0005-path-sandbox-cloudflare-pilot.md) và [contract](CLOUDFLARE_PILOT.md). Ba Draft PR docs → core → integration; không merge tự động. PR #19 audit giữ nguyên, không đưa nó làm dependency. Pilot dữ liệu synthetic riêng, D1-only; Node giữ ZIP, public/preview Workers riêng; native R2 binding không phải IAM read-only. Lab/source/images/env/DB/volumes/DNS/UFW giữ nguyên, không remote provisioning/deploy. Các snapshot bên dưới mô tả lab cũ; SQL0001–0003 không được sửa.

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
