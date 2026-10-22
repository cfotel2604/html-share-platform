# Project status — HTML Share Platform

> Snapshot bàn giao **2026-10-09 (Asia/Saigon)**. Code/CI/Docker/browser probes của mốc này chạy ngày 2026-10-08; GitHub, health và preservation đã đối chiếu lại khi bàn giao. GitHub là nguồn live; đọc cùng [AI_HANDOFF](AI_HANDOFF.md), [PLAN](../PLAN.md) và [AGENTS](../AGENTS.md).

## Tiến độ đã kiểm chứng

| Hạng mục | Trạng thái | Bằng chứng |
| --- | --- | --- |
| P0/P1/handoff | PR #2/#4/#7 đã merge; origin/main `78cb7ca` | Git log và GitHub |
| Local MVP | PR #5 **Ready for review**, base main, head codex/local-mvp; chưa merge | [PR #5](https://github.com/cfotel2604/html-share-platform/pull/5) |
| Upload #9 | Hai finding đã sửa tại `a74be7f` + `9147161`; 50 tests, lint/typecheck/build và Docker integration pass | [Validation](validation/2026-10-09-upload-hardening.md), [application](https://github.com/cfotel2604/html-share-platform/actions/runs/37794864775), [docs](https://github.com/cfotel2604/html-share-platform/actions/runs/37794864792) |
| Studio UI | PR #12 **Ready for review**, base codex/local-mvp, đã merge backend fix; code tích hợp `011d0ee`, 55 tests, CI pass | [PR #12](https://github.com/cfotel2604/html-share-platform/pull/12), [application](https://github.com/cfotel2604/html-share-platform/actions/runs/37794864433), [docs](https://github.com/cfotel2604/html-share-platform/actions/runs/37794863701) |
| Docker owner | Web healthy tại http://127.0.0.1:3100, image html-share-studio:upload-011d0ee; Studio và upload fix cùng chạy | [Artifact/rollback](validation/2026-10-09-upload-hardening.md) |
| Preservation | 8 site trước deploy giữ metadata, DB/MinIO/gateway giữ container IDs/mounts; 1 fixture mới để unpublished | Baseline/verify và browser smoke |
| Tracking | #1/#3/#6 CLOSED; #8/#9/#10/#11 OPEN | #9/#11 chờ review/merge; #8/#10 chưa hoàn tất |

Không sửa main, không merge PR hoặc deploy production. Owner đã giao thay UI, sửa #9 và cập nhật Docker Desktop local; hai lần deploy chỉ thay web, không migration/schema change. Checkout owner b3f8119 và .env giữ nguyên; các lần vận hành phải giữ Compose web override.

## Kết quả và giới hạn

Body cap tính byte thực trước multipart parser, trả 413 và hủy stream; ownership trước ingest/storage và dưới row lock, denied site trả 404/zero writes. SQL/storage failure trước COMMIT giữ active cũ và cleanup new keys. ZIP hợp lệ cùng 21 hostile variants pass. COMMIT response không xác định trả 503, giữ objects để tránh xóa active; cleanup persistent failure/crash cần operator reconciliation, chưa có durable orphan reaper P5/P6.

Docker integration thật chạy trên project/DB/MinIO riêng: chunked early rejection, ownership/race, rollback sau real writes, ZIP/cache/unpublish đều pass. Chrome sau deploy owner: HTML/ZIP update giữ URL, sandbox preview, cookie/storage bị chặn, copy/filter/theme, 1280/390/320 không overflow, publish/unpublish và logout pass; dữ liệu test tổng hợp. Không stress/DoS owner lab. [Review cũ](reviews/2026-10-08-pr5.md) là snapshot trước fix; kết quả mới ở [validation #9](validation/2026-10-09-upload-hardening.md).

## Quyết định owner

- Studio tập trung: ODS blue, neutral/graphite, Geist/Mono, sáng/tối. UI/presentation → workflow → typed HTTP adapter → backend theo ADR-0002 trong PR #12; Next backend hiện cùng web container, gateway riêng.
- Dashboard studio.ods.vn và Next API; Google/Clerk Development cho lab, server email allowlist/RBAC khi triển khai P2.
- Viewer view.ods.vn/site-id chỉ trusted shell; HTML từ site-id.matbao.one và sandbox không allow-same-origin. ADR-0001 vẫn Proposed; chưa đổi DNS/TLS.
- Production R2 private; MinIO legacy chỉ local. Docker/VPS giai đoạn đầu. ZIP 20 MiB nén / 100 MiB giải nén / 500 files / depth 12; local hardening thêm cap 1000 entries.
- Retention configurable; backup/restore ngoài MVP theo lựa chọn owner.

## Việc tiếp theo

1. Review PR #5 và #12; #9/#11 giữ mở đến merge. Sau #5 merge, đổi base #12 về main và xác minh CI/mergeability; chưa được giao merge tự động.
2. [#8](https://github.com/cfotel2604/html-share-platform/issues/8): Google/Clerk, allowlist server, Employee/Admin, ownership/RBAC tests. Demo password chỉ local.
3. [#10](https://github.com/cfotel2604/html-share-platform/issues/10): R2 IAM/cleanup permissions, hostname/TLS, reserved DNS inventory, direct/iframe cookie isolation và Safari/Zalo trước public. Lifecycle/retention/orphan reconciliation, rate/concurrency, staging/pilot còn P5–P7.

## Kiểm chứng lại

Dùng git status/worktree/remote, fetch origin --prune, log origin/main, gh pr view 5/12 với state/isDraft/headRefOid/mergeable/statusCheckRollup và gh issue list. Kiểm tra image tag/revision/health đang chạy; không suy diễn checkout main đã có các thay đổi trên PR. Cập nhật status/handoff trong branch được giao khi có mốc mới.
