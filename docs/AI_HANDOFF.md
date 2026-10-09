# AI Agent handoff — HTML Share Platform

> Bàn giao **2026-10-09 (Asia/Saigon)**. Probes code/CI/runtime chạy trong phiên 2026-10-08; trạng thái live được xác nhận lại khi bàn giao. Đọc cùng [PROJECT_STATUS](PROJECT_STATUS.md); GitHub là nguồn live.

## Bắt đầu phiên tiếp theo

Đọc AGENTS, README, PLAN, ARCHITECTURE, WORKFLOW, ADR-0001 và status/handoff từ đúng PR branch. Xác nhận git status --short --branch, worktree list, remote, fetch origin --prune và origin/main. Kiểm tra gh pr view 5/12, gh issue list; không reset/clean, xóa env/volumes hoặc tự merge/deploy production.

## Đã hoàn tất

- Owner giao Studio tập trung, sửa #9 và cập nhật Docker local. Backend `a74be7f` + `9147161b94b343f6adfed877e89e72fb67443af9` đã vào PR #5 từ branch codex/9-upload-hardening. PR #12 merge backend qua `2cf1408`/`011d0ee`, giải quyết docs/ESLint conflict, giữ UI API boundary.
- Body stream cap 22 MiB trước parser, file 20 MiB, multipart shape validation; PUT owner trước body và check lại dưới FOR UPDATE; reserve unique prefix trước writes; pointer/audit atomic. Cleanup attempted new keys kể cả failed PUT, per-key errors/retry 3; COMMIT unknown không delete, trả 503/refresh và discard connection. ZIP thêm directory/special-entry/collision checks và 1000-entry cap.
- Backend 50 tests, Studio tích hợp 55 tests PASS; lint/typecheck/build local/Docker PASS. Code CI #5 và #12 application/docs SUCCESS. [Validation](validation/2026-10-09-upload-hardening.md) chứa links CI, test sources và giới hạn.
- Docker integration thật trên html-share-upload-test: early chunked/declared cap, zero writes cho foreign/deleted/unknown, owner-change race, delete/reassign row lock, DB-failure-after-storage rollback/cleanup, 21 hostile ZIP variants, valid ZIP/cache/unpublish PASS. Không chạy adversarial test lên owner lab.
- Owner web đã deploy image html-share-studio:upload-011d0ee, revision `011d0eebd387352d8b971b3a3d5979bbcdb8165f`, healthy tại http://127.0.0.1:3100. Chỉ web recreate; không migrations. 8 site trước deploy giữ metadata, DB/MinIO/gateway IDs/mounts giữ nguyên. 1 fixture mới HTML rồi ZIP để unpublished. Chrome UI workflow và 1280/390/320 pass, không page JS errors.
- PR #5/#12 đã Ready for review, chưa merge. #9/#11 giữ mở chờ review/merge; #8/#10 chưa triển khai/đạt. main vẫn 78cb7ca; không sửa trực tiếp main.

## Worktrees và vận hành

- Backend worktree C:\Users\admin\Documents\Codex\html-share-platform-pr5-sync, branch codex/9-upload-hardening; push HEAD:codex/local-mvp cập nhật PR #5. Cùng worktree có thể chuyển sang codex/11-studio-ui để cập nhật PR #12; kiểm tra branch/status trước sửa.
- Checkout owner html-share-platform-local-mvp giữ b3f8119, .env/compose nguyên vẹn. Web dùng image từ UI branch qua compose.studio-ui.yaml; các lần up sau phải giữ override để tránh build checkout cũ. Foundation project html-share-platform cổng 3000 không đổi.
- Rollback tag trước fix html-share-studio:rollback-before-upload-20261008 giữ UI nhưng còn findings upload. Commands và image IDs ở validation. Tag UI cũ ui-908901b và trước UI vẫn tồn tại; không prune chúng tùy tiện.
- Test overlay compose.upload-test.yaml chỉ cho project riêng, guard yêu cầu PGDATABASE=upload_test. Test env nằm tmp, Git-ignored; không dùng credentials lab. Down test project không xóa named volumes. Browser cookie/source credential tạm phải được xóa khi kết thúc; không commit screenshot dữ liệu thật.

## Giới hạn và ba bước tiếp

1. Review/merge gate PR #5/#12; sau #5 merge đổi base #12 về main và kiểm tra CI/mergeability. User chưa giao merge/deploy production. Code findings #9 đã xử lý; báo cáo review cũ là snapshot lịch sử.
2. Làm P2 #8: Google/Clerk, email allowlist, Employee/Admin, ownership/RBAC tests. Demo password không production.
3. Giữ P4 #10: R2, DNS/TLS/reserved routes, parent-domain cookie isolation, Safari/Zalo. Cleanup retry failure/crash chưa có durable orphan reaper; cần operator reconciliation và lifecycle P5/P6. COMMIT response loss là unknown outcome; không được xóa objects chưa đối chiếu DB references. Không nới sandbox.

Cập nhật status/handoff trong branch công việc khi có mốc mới; không ghi token, mật khẩu, payload hoặc thông tin khách hàng. PR code và docs commits có thể khác commit image đang chạy; luôn đối chiếu image revision label.
