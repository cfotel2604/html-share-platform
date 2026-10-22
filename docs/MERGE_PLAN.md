# Merge stack đã hoàn tất — 2026-10-22

Owner đã giao Ready/merge #13 → #15 bằng merge commit, kiểm lại CI sau retarget #15 và chốt handoff. Chuỗi đã hoàn tất tại main `0c17a09b68960d785f8b67b2a1585b0f3af919b8`. [Workflow](WORKFLOW.md), [lab runtime](LAB_HANDOFF.md), [review/CI](reviews/2026-10-22-stack-merged.md). Merge source không đổi containers; không cần chạy lại migration/backfill hoặc deploy lab.

## GitHub đã kiểm trực tiếp

| PR | Kết quả | Kiểm chứng |
| --- | --- | --- |
| [#5](https://github.com/cfotel2604/html-share-platform/pull/5) | MERGED main1ed0eb0 | Owner merge; review sau merge và exact-main50tests PASS; #9 CLOSED |
| [#12](https://github.com/cfotel2604/html-share-platform/pull/12) | MERGED codex/local-mvp2df738b | Base cũ; UI không mất, đã đưa vào main qua #17 |
| [#17](https://github.com/cfotel2604/html-share-platform/pull/17) | MERGED main6bdd298 | Tested headcc5a85c/55tests; UI4ab546a ancestry/tree/backend equality PASS; #11 CLOSED |
| [#13](https://github.com/cfotel2604/html-share-platform/pull/13) | MERGED main6d30d22 | Tested head8f204c3/79unit/15groups/3checks PASS; owner real-session cases đạt; #8 CLOSED |
| [#15](https://github.com/cfotel2604/html-share-platform/pull/15) | Retarget main rồi MERGED main0c17a09 | Tested headb21ea12/86unit/20groups/3checks PASS; tree/source/SQL equality và fix ancestry PASS; #14/#16 CLOSED |

Agent dùng --match-head-commit cho từng merge sau kiểm live base/head/checks, giữ merge commits/ancestry, không force-push/xóa branch hoặc reset owner worktree. Các sync chỉ docs conflicts, runtime/SQL không đổi. Source milestone main sau #15 bằng tested PR15 tree; PR tài liệu chốt handoff trên đó không đổi runtime. CI PR tài liệu theo Checks.

## Acceptance và Issue

Owner xác nhận Admin/Employee login/preview, khách ngoài tải iframe sau mở443 và từng case Employee ownership/Admin audit/ngoài allowlist/revoke/disable/logout/rotate/revoke/reissue/unpublish đều PASS. Đây là owner-confirmed real-session/lifecycle evidence; agent không tự thu session thật hoặc suy số rows thành browser matrix.

#8 lab/P2, #9 upload, #11 UI, #14 short links và #16 packaging đã CLOSED khi acceptance và code main đạt. **#10 vẫn OPEN** cho security/release gates; production Clerk/OAuth riêng theo scope #8 đã ghi, không mất checklist khi đóng Issue implementation.

## Tiếp theo và ranh giới

Theo #10: DNS/reserved/nginx inventory/regression vì443 mở chungIP; private R2/IAM/cleanup; production Clerk/OAuth; cookie cfvn.cloud sibling/cross-environment/mobile/Zalo/crawler; edge/concurrency/cache/unpublish; complete preview log redaction; TLS renewal/failure/rollback, security review ADR0001/0003 và staging/pilot trước production. ADR0001/0003 Proposed; legacyMinIO không đạt R2 gate.

Lab giữ web/source dc7560e, gateway security-417c50d, schema0003 và tombstones; không chạy upgrade chỉ để khớp docs HEAD. SECURITY_IMAGE đã lưu/Compose config PASS. Các bước8.2 runbook chỉ áp dụng candidate nâng cấp mới đã review/được giao. Rollback share ưu tiên kill switch, không bật lại host-ID aliases sau revocation.

Kiểm trạng thái lần sau bằng gh pr view/gh issue list và git fetch origin --prune; dùng git diff --stat origin/main...HEAD khi review branch mới. Snapshot này không thay xác minh live, không tự phê duyệt production/DNS/deploy.
