# Kế hoạch hiện hành — HTML Share Platform

## Mục tiêu và phạm vi đã có

Nhân viên được phép upload website tĩnh, xem riêng, publish/update/unpublish/rotate/revoke và gửi link HTTPS cho người không cần đăng nhập. Node/PostgreSQL giữ quyền, ownership và audit; R2 giữ asset bất biến; D1 là public read model; một Worker public phục vụ asset có sandbox. [Kiến trúc](docs/ARCHITECTURE.md), [ADR-0006](docs/adr/0006-postgresql-source-of-truth-d1-public-read-model.md).

## Mốc đã hoàn tất

| Phạm vi | Kết quả |
| --- | --- |
| A'32–37 / Epic #31 | Code đã merge, outbox/projector/recovery/public Worker/Node admin/preview vận hành; các issue đã đóng |
| Pilot #38 | Owner nghiệm thu, có evidence thực tế và nhãn owner-confirmed/omitted/unverified rõ ràng |
| Bounded upload 50/52, dependency 40, preview 54 | Đã merge, kiểm chứng và đóng;12 transfer giữ integrity/drain/atomiccommit |
| Audit 10/PR #19 | Đóng cho pilot/lab sau owner merge #19 ngày 26/10; không là production clearance |

Không dùng roadmap P0–P 7 hoặc acceptance ban đầu như backlog còn mở. [Ledger](docs/PILOT_APRIME_ACCEPTANCE.md), [bản kế hoạch A' đã thực hiện](docs/D1_READ_MODEL_PLAN.md), [lịch sử](docs/history/README.md).

## Việc để sau hoặc cần quyết định mới

- Shell có OG do nền tảng dựng và route `/raw/<code>`: **chưa implement, owner để sau**. Hiện Worker trả trực tiếp HTML tại `/<share-code>/`. Thay đổi tương lai cần issue/contract/test riêng; không mô tả như tính năng đang chạy.
- Production: chưa được phê duyệt trong nghiệm thu pilot. Chỉ lập kế hoạch trên target/domain/Clerkinstance/IAM/logging/abuse-capacity/rollback thực tế khi owner giao.
- Oldviewer/testlinks 4100 và dữ liệu legacy giữ đến owner cleanup riêng. Không là fallback A', không tự di chuyển hoặc xóa.
- Retention/orphan sweeping, backup/restore mở rộng và hardening khác chỉ triển khai theo scope mới; không suy từ nhận xét trong tài liệu cũ thành yêu cầu đang được giao.

## Cách tiếp tục

Đọc [bản đồ tài liệu](docs/DOCUMENTATION_MAP.md), [status](docs/PROJECT_STATUS.md) và [handoff](docs/AI_HANDOFF.md), fetch và kiểm GitHub. Dùng issue/feature branch/Draft PR, owner review/merge. Merge source không tự cho phép thay runtime, D1 schema, secrets hoặc production. Một thay đổi tài liệu không được lôi lại setup hay các drill owner đã cho bỏ qua.
