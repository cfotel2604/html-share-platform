# AI Agent handoff — HTML Share Platform

> Bàn giao **2026-10-22 (Asia/Saigon)**. Owner đã nghiệm thu lab tổng quát và iframe từ mạng ngoài sau mở443. Web #15 đã chạy, DB 0003/backfill xong; tiếp chuẩn hóa vận hành và review/merge, không lặp bước cutover. [PROJECT_STATUS](PROJECT_STATUS.md), [LAB_HANDOFF](LAB_HANDOFF.md), [MERGE_PLAN](MERGE_PLAN.md), [evidence](validation/2026-10-22-lab-acceptance.md).

## Bắt đầu phiên tiếp theo

Đọc AGENTS/README/PLAN/ARCHITECTURE/WORKFLOW/ADRs và ba handoff docs trên từ branch được giao. Kiểm git status/worktrees/remotes, fetch origin --prune, log origin/main, gh pr view5/12/13/15 và issues. Main checkout có thể cũ; giữ owner worktrees/untracked/env/volumes, không reset/clean. Không update main trực tiếp.

Task worktree `C:\Users\admin\Documents\Codex\html-share-platform-pr5-sync`, branch `codex/14-short-viewer-links`, PR15 base `codex/8-10-auth-origin-gates`. Main78cb7ca; #5/#12 Ready, #13/#15 Draft, tất cả OPEN/MERGEABLE/checks SUCCESS trước handoff. Heads235cc62/4ab546a/4ac9689/c2da87f; docs head mới phải kiểm sau push. Issues8/9/10/11/14/16 OPEN. Chưa merge/retarget/Ready hoặc production. Repo cho phép merge commit, không auto-delete branches.

## Runtime VM đã kiểm ngày 22/10

SSH `lab-b`, `/opt/hsp/src`, project hsp-lab; source detached `dc7560ea1c34cbe060779fbe69bb2f574e170431`, tracked sạch. Web `html-share-studio:share-dc7560ea1c34` revision đúng, image ID `sha256:7967815b1c25611fc4237f929bc3cf21c21243f242524073f1509e3a3654232a`. Gateway vẫn `html-share-studio:security-417c50d`, image ID `sha256:9d4b698d598daa34dc5a21e05b94e4250fa58425d26856635f343b0bf13fc39c`; giữ cũ có chủ đích trong web-only cutover. DB/MinIO cùng web/gateway healthy.

DB READ ONLY có 0001/0002/0003; 3 sites/7 versions, 3 active/3 revoked links, history/manifest thiếu 0. Không so với VM 2 sites/2 versions trước cutover hoặc Desktop 10 sites/17 versions. Inventory tăng và có lịch sử thu hồi sau quá trình dùng thử; chưa có checklist từng case quyền/audit hoặc bằng chứng actor của từng thao tác.

Origins: Studio `https://studio-lab.ods.vn`, viewer `https://view-lab.ods.vn/<10-base62>`, content `https://<32hex>.lab-space-ods.cfvn.cloud/`. Clerk mode, trusted public Studio còn loopback vận hành, PUBLIC_SITE_PORT rỗng cả web/gateway; frame-src/preview/viewer origins đúng. Web3100/gateway 4100 loopback, DB/storage không publish. Studio/viewer qua Cloudflare; content direct VM/nginx. Owner mở443/tcp any IPv4/IPv6; SSH xác nhận rules. Đánh giá các nginx vhost khác trước mở rộng pilot; chưa có inventory/regression đầy đủ.

Agent kiểm HTTPS từ VM: Studio 200, viewer short 200 có iframe sandbox allow-scripts, content 200/HTTP sandbox/frame-ancestors đúng, viewer API 404/host-ID alias 404; viewer/content no-store/no Set-Cookie. Owner xác nhận khách ngoài đã tải iframe và lab OK, không có independent probe4G hoặc full mobile matrix từ agent.

## Một việc operator còn phải làm

`.env` VM chưa có SECURITY_IMAGE, compose config từ process không có shell override FAIL vì thiếu biến; web đang chạy không bị ảnh hưởng. Handoff có dòng `SECURITY_IMAGE=html-share-studio:share-dc7560ea1c34` và lệnh env -u SECURITY_IMAGE ... config --quiet để operator lưu/kiểm bền. Không đổi keys/emails/allowlist, không copy env example đè private env, không tự đổi pin sang docs HEAD.

Giữ bốn overlays theo thứ tự base/security/lab/edge; hai file sau operator-owned/untracked. [Public env sample](../deploy/lab-public.env.example) là fragment không credentials; [overlay example](../deploy/compose.lab-public.example.yaml) chỉ minh họa invariant, không áp tự động. Security overlay lấy public port từ GATEWAY_PORT; env PUBLIC_SITE_PORT= chưa đủ, overlay cuối phải set chuỗi rỗng web/gateway. SECURITY_IMAGE chọn cả web/migrate/gateway: up toàn stack có thể đổi gateway, nên routine web update dùng --no-deps --no-build web sau khi được giao.

## Các bước đã xong — không làm lại

Owner đã làm8.2.2 migrate/backfill và8.2.3 bật web mới. Fingerprint2 sites/2 versions trước/sau backfill khớp ngày 21/10; inventory ngày 22/10 tăng sau dùng app. Không migrate/backfill/restart chỉ vì merge docs hoặc mở shell mới. Source/image khác head tài liệu là bình thường khi docs-only.

EACCES #16 fix dc7560e: Dockerfile a+rX scripts/db sau COPY, giữ USER node/root ownership/SQL bytes. CI chmod go-rwx mô phỏng checkout hạn chế, non-root preflight và20 integration groups PASS; VM UID1000/21files và SQL checksum PASS. 0003 đã áp dụng thành công, không chạy root/sửa migrations để né checksum. [Evidence](validation/2026-10-21-runtime-permissions.md).

## Giới hạn kỹ thuật cần giữ

- Auth server Clerk active online session + verified Google identity + DB allowlist/role/status. Employee owner-only, Admin scope; ownership trước ingest/storage và fresh actor/policy/site locks, audit actor thật, exact Origin/Host mutation. Không fallback demo hoặc tin client/JWT role.
- Không đưa /api vào Next proxy: buffering clone có thể phá early upload413. API authenticateRequest SDK trực tiếp; UI/viewer proxy riêng. #9 stream22MiB/file20MiB, ZIP hostile/quota/path/entry validation và atomic immutable publish giữ nguyên.
- UI presentation → hook → typed HTTP adapter, backend services riêng; lint không cho import DB/storage/auth server vào components/features. Next API cùng container lab, gateway process riêng, không cần microservices để thay UI.
- Viewer chỉ trusted shell trên ods.vn, content cfvn.cloud khác eTLD+1; HTTP sandbox mọi HTML + iframe không allow-same-origin. Grant preview 128 bit/hashDB/site-version-actor scope/TTL 3 phút, bearer hostname phải redact toàn pipeline. Không log codes/token/Host grants/HTML.
- Share 10 base62 exact-case CSPRNG/UNIQUE/tombstones; một active/site, rotate/revoke/reissue transaction+audit. Update/publish không hồi revoked. Canonical URL do server sinh, alias 32 hex404. Revoke viewer không thu hồi direct content published; unpublish/delete chặn request mới, không tab đã tải.
- Rollback ưu tiên SHARE_LINK_MUTATIONS_ENABLED=false trên candidate, giữ schema/history. Không lùi binary cũ bật lại host-ID aliases sau revocation khi viewer mở. COMMIT unknown503/refresh, không xóa storage objects chưa đối chiếu references.

## Việc tiếp theo

1. Operator lưu image pin theo LAB_HANDOFF. Reviewer chốt các case session thật ownership/Admin audit/deny/revoke/logout và lifecycle theo MERGE_PLAN; không yêu cầu gửi keys/emails lại hoặc tự khóa người dùng thật.
2. Chuẩn bị/review stack #5 → #12 → #13 → #15. Sau mỗi dependency merge retarget main, check diff/CI/new head, tránh squash ancestry trừ khi re-stack đúng. Chưa tự merge hoặc Ready từ việc owner nghiệm thu lab tổng quát.
3. #8/#10 còn release gates: R2 private/IAM/cleanup, production Clerk/OAuth, cookie cfvn.cloud sibling/cross-environment/browser/mobile/Zalo/crawler, edge limits/cache/unpublish, full log redaction, DNS/vhost inventory và TLS renewal/rollback. ADR-0001/0003 Proposed,0002/0004 Accepted cho quyết định riêng. Staging/pilot/release review trước production; legacy MinIO không đáp ứng gateR2.

## Môi trường và hồ sơ cũ

Owner Docker Desktop checkout `C:\Users\admin\Documents\Codex\html-share-platform-local-mvp` b3f8119, baseline theo09/10 security-613f2b7/Clerk,10 sites/17 versions; không recheck hoặc redeploy ngày 22/10. Foundation port3000 tách biệt. Không build checkout cũ để update VM/Desktop. Test projects synthetic đã down giữ volumes/env, không áp test overlays vào owner; credentials/browser state không commit.

Hồ sơ09/10: [upload](validation/2026-10-09-upload-hardening.md), [auth/origin và rollback images](validation/2026-10-09-auth-origin-gates.md), [86 unit/20 integration/Chrome short-link](validation/2026-10-09-short-viewer-links.md), [VM TLS](validation/2026-10-09-lab-domain-tls.md). Ngày 21/10: [origins/network](validation/2026-10-21-lab-public-origins.md), [build review](validation/2026-10-21-pr15-build-review.md), [permissions/retry](validation/2026-10-21-runtime-permissions.md). Các mốc chưa cutover/tunnel-only trong đó là lịch sử; dùng bằng chứng22/10 cho trạng thái hiện tại.
