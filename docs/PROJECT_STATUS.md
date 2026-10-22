# Project status — HTML Share Platform

> Snapshot **2026-10-22 (Asia/Saigon)**. GitHub/main đã kiểm trực tiếp; recovery UI đang chuẩn bị trên feature branch. [Review và ancestry](reviews/2026-10-22-pr5-and-studio-merge.md), [AI_HANDOFF](AI_HANDOFF.md). Main chưa chứa các implementation #13/#15 dù lab đã chạy image mới hơn.

## Trạng thái đã xác minh

| Hạng mục | Trạng thái |
| --- | --- |
| P0/P1 | #2/#4/#7 merged |
| MVP/upload #5 | Owner đã merge vào main: `1ed0eb0d35961118de6e22f17be13b4bae95cc19`, head235cc62; review sau merge không phát hiện thêm blocker trong local MVP scope |
| CI main | Application/docs SUCCESS đúng1ed0eb0; 50 tests PASS, lint/typecheck/build PASS |
| Studio #12 | MERGED vào codex/local-mvp: `2df738b1b262c89a2652fc01a07f093b7037a418` sau khi #5 đã đóng; UI còn ngoài main |
| Recovery UI #11 | Branch codex/11-studio-main-recovery từ main1ed0eb0, merge2df738b bằng3296738; tree runtime đúng UI4ab546a, không đổi backend/API/scripts/db/base Compose/env |
| Auth/origin #13 | Draft, base codex/11-studio-ui, head4ac9689; chưa retarget/main merge |
| Short viewer #15 | Draft, base codex/8-10-auth-origin-gates; lab handoff trên branch đó, chưa main merge |
| Issues | #9 CLOSED sau merge #5; #8/#10/#11/#14/#16 OPEN |

## Review và hướng xử lý

#5 đã được owner merge trước lúc agent bắt đầu kiểm; không thực hiện lại merge. Code counter body trước parser, ownership trước ingest/storage và fresh row lock, reserve prefix, atomic upload pointer/audit, cleanup/COMMIT unknown và ZIP rejection đã đối chiếu. [CI main application](https://github.com/cfotel2604/html-share-platform/actions/runs/39775149932) có50 tests/0fail; [docs](https://github.com/cfotel2604/html-share-platform/actions/runs/39775149938) PASS. DB/browser integration trong [validation09/10](validation/2026-10-09-upload-hardening.md) là bằng chứng lịch sử, không rerun22/10.

Không revert #12. Recovery PR base main đưa đúng22files UI từ nhánh đã merge vào main, giữ ancestry cho #13. Các docs recovery/status/handoff được bổ sung riêng; CI head mới phải kiểm sau push. Giữ Draft đến khi owner giao review/merge recovery; yêu cầu merge #5 không được hiểu là tự merge #13/#15 hoặc deploy.

## Lab hiện tại — khác main

Theo handoff #15 và SSH chỉ đọc ngày22/10: VM `/opt/hsp/src` web/source dc7560e, gateway security-417c50d, DB0001/0002/0003; owner nghiệm thu lab và iframe từ ngoài sau mở443. SECURITY_IMAGE nay đã lưu đúng `html-share-studio:share-dc7560ea1c34`; Compose config không có shell override PASS, web running. Không đổi containers/env/data/DNS trong review này. Không build/deploy main trung gian local-demo/path gateway lên lab đang chạy Clerk/hostname/short links.

Handoff chi tiết lab và accepted domains nằm trong [PR #15](https://github.com/cfotel2604/html-share-platform/pull/15); branch recovery chỉ mang code local MVP + Studio. Các tài liệu domain/auth cũ trên main phản ánh phase trước, không thay quyết định domain mới của owner; #13 sẽ mang ADR/domain/auth implementation vào main sau review.

## Tiếp theo

1. Review/CI recovery UI và xin quyền merge PR bổ sung; không có dữ liệu/code bị mất, không cần thao tác VM hoặc undo #12.
2. Sau recovery vào main, retarget #13 về main khi được giao, giải quyết docs conflicts nếu có, kiểm diff/CI/security gates. #15 theo sau #13; không tự retarget/Ready/merge trong phiên #5.
3. #8/#10 và production gates vẫn còn: real-session RBAC/audit/deny/revoke/logout, R2 private/IAM/cleanup, hostname/cookie/mobile/Zalo, edge/log/DNS/vhost/renewal/rollback và staging/pilot. Main hiện chỉ local-only; không coi CI xanh là public release approval.
