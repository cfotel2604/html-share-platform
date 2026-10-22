# AI Agent handoff — HTML Share Platform

> Bàn giao **2026-10-22 (Asia/Saigon)**. Owner đã merge #5 vào main rồi merge #12 vào base cũ. Recovery UI đang chuẩn bị để đưa UI vào main; không cần revert. [PROJECT_STATUS](PROJECT_STATUS.md), [review/ancestry](reviews/2026-10-22-pr5-and-studio-merge.md).

## Bắt đầu phiên tiếp theo

Đọc AGENTS/README/PLAN/ARCHITECTURE/WORKFLOW/ADRs và status/handoff đúng branch. Kiểm git status/worktree/remotes, fetch origin --prune, gh pr view5/12/13/15 và recovery PR, issues/log origin/main. Không giả định main checkout đã cập nhật, không reset/clean hoặc đổi owner env/volumes.

## GitHub và quyền được giao

Owner giao review/merge #5 và báo #12 đã merge trước retarget. GitHub cho thấy #5 **đã được owner merge** vào main lúc12:02:23UTC, commit `1ed0eb0d35961118de6e22f17be13b4bae95cc19`; #12 merge vào codex/local-mvp lúc12:03:23UTC, commit `2df738b1b262c89a2652fc01a07f093b7037a418`. Main tree đúng235cc62, UI merge tree đúng4ab546a. #9 đã CLOSED, #11 OPEN; #13/#15 Draft và chưa đổi base.

Agent review lại code #5 và exact-main CI: 50 tests PASS/0fail, lint/typecheck/build/docs SUCCESS, không phát hiện thêm blocker trong scope local MVP/upload fix. [Review](reviews/2026-10-22-pr5-and-studio-merge.md) ghi giới hạn/historical integration và links. Không gọi merge lại #5 đã đóng, không tự phê duyệt GitHub review bằng tài khoản tác giả.

## Recovery đã chuẩn bị

Managed worktree `C:\Users\admin\.codex\worktrees\studio-main-recovery\html-share-platform`, branch `codex/11-studio-main-recovery` tạo từ origin/main1ed0eb0. Merge origin/codex/local-mvp2df738b bằng commit `329673884a729b56ca65f6550a39618e93edc434`. Runtime tree đúng UI head4ab546a, backend/API/scripts/db/compose.yaml/.env.example so main không đổi. Docs recovery mới bổ sung sau merge code; PR recovery base main phải giữ Draft đến review/CI và quyền merge cụ thể.

Không revert hoặc mở lại #12; không force-push/squash các dependency để sửa nhầm base. Recovery giữ ancestry UI để sau khi được merge có thể retarget #13 main. Nếu có docs conflict với #13/#15, dùng worktree đúng branch và hợp nhất trạng thái mới; giữ implementation auth/short links và owner files. Không tự retarget/Ready/merge #13/#15 từ yêu cầu #5.

## Lab/env đã kiểm

SSH lab-b, source `/opt/hsp/src` dc7560e, web `html-share-studio:share-dc7560ea1c34`, gateway security-417c50d, schema0001/0002/0003 theo handoff #15; owner nghiệm thu lab/iframe mạng ngoài sau mở443. Lần này SSH chỉ xác nhận SECURITY_IMAGE private env khớp tag, Compose config không shell override PASS, web running. Không restart/deploy/migrate/đổi private env hoặc owner volumes. Main chỉ local-demo/path gateway; không build main trung gian để update VM đang chạy auth/hostname/short-link mới hơn.

Checkout owner Desktop `C:\Users\admin\Documents\Codex\html-share-platform-local-mvp` giữ b3f8119/env/volumes, không đồng bộ bằng reset. Task short-link/handoff đầy đủ `C:\Users\admin\Documents\Codex\html-share-platform-pr5-sync`, codex/14-short-viewer-links, PR15; cập nhật chéo docs trạng thái merge trên đó, không chép toàn runtime #13/#15 vào recovery UI.

## Giới hạn cần giữ

Upload22MiB body/file20MiB, denied preflight/locks trước storage, immutable versions/atomic upload pointer+audit, cleanup attempted keys/retry; COMMIT unknown giữ objects và503/refresh/discard connection. Không sửa migrations đã áp dụng. UI dùng presentation → workflow → typed HTTP adapter, lint cấm server imports, không inject HTML upload vào Studio. Gateway/iframe sandbox/no-store giữ nguyên.

Demo auth/gateway path chỉ local, không production. R2/real-session RBAC/hostname/cookie/mobile/edge/log/DNS/TLS renewal/rollback/pilot vẫn cần các phase/PR tiếp; legacy MinIO không là private R2 proof. Bằng chứng DB/browser cũ ở [validation](validation/2026-10-09-upload-hardening.md), không suy CI unit thành runtime owner proof. Không ghi secrets/token/upload/customer data vào docs/logs.
