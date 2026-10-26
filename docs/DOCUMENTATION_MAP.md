# Bản đồ tài liệu A'

Hướng dẫn hiện hành được tổng hợp 26/10/2026 theo main `3c965b5` và code đã nghiệm thu. Một tài liệu cũ ghi “Draft”, “chờ merge”, “chưa deploy” không làm mở lại gate đã hoàn tất. Luôn kiểm GitHub/live target khi việc sắp làm phụ thuộc trạng thái hiện tại.

## Thứ tự ưu tiên

1. Chỉ dẫn trực tiếp hiện hành của owner và phạm vi được giao; không suy rộng thành quyền production/merge/secret/deletion.
2. ADR-0006 cùng [authority hiện hành](PILOT_APRIME_AUTHORITY.md); các invariant bảo mật vẫn bắt buộc.
3. Code/SQL/config đã review và contract tương ứng. Nếu tài liệu mô tả tính năng chưa có, không tự coi đó là implementation hoặc tự đổi code/ADR để khớp.
4. Runbook hiện hành và readback của đúng target/artifact. Snapshot không thay việc recheck trước mutation.
5. Bằng chứng theo ngày/head và tài liệu lịch sử: dùng đúng scope, không dùng như lệnh vận hành hiện tại.

## Các lối vào

| Loại | Tài liệu | Cách dùng |
| --- | --- | --- |
| Tổng quan | [README](../README.md), [ARCHITECTURE](ARCHITECTURE.md), [PLAN](../PLAN.md) | Sản phẩm, topology, route thật và việc để sau |
| Trạng thái | [PROJECT_STATUS](PROJECT_STATUS.md), [AI_HANDOFF](AI_HANDOFF.md) | Tóm tắt hiện hành, provenance và giới hạn; kiểm GitHub lại |
| Quy trình | [AGENTS](../AGENTS.md), [WORKFLOW](WORKFLOW.md), [Agent Guide](D1_READ_MODEL_AGENT_GUIDE.md) | Repository/worktree, branch/Draft/review/authority |
| Hợp đồng | [ADR-0006](adr/0006-postgresql-source-of-truth-d1-public-read-model.md), [D1 model](D1_PUBLIC_READ_MODEL.md), [share links](SHARE_LINKS.md), [Node](NODE_POSTGRES_ADMIN.md), [Worker](PUBLIC_READ_MODEL_WORKER.md) | Quy tắc code hiện tại; không tự thêm OG/raw metadata hoặc writer khác |
| Vận hành | [Node pilot](PILOT_APRIME_NODE_ROLLOUT.md), [secret roles](PILOT_APRIME_SECRET_SETUP.md), [projector](PUBLIC_PROJECTOR.md), [recovery](READ_MODEL_RECOVERY.md) | Hệ thống đã khởi tạo; cần target/artifact/policy guards |
| Phát triển | [DEVELOPMENT](DEVELOPMENT.md) | Test local/CI bằng fixture, tách khỏi pilot |
| Nghiệm thu | [PILOT_APRIME_ACCEPTANCE](PILOT_APRIME_ACCEPTANCE.md) | Đã đo, owner-confirmed, bỏ qua và chưa xác minh được tách rõ |
| Kế hoạch đã thực hiện | [D1_READ_MODEL_PLAN](D1_READ_MODEL_PLAN.md), [disposition](ADR0006_TRANSITION.md) | Scope/acceptance của các issue đã đóng; không là backlog đang chờ |
| Bằng chứng | `docs/validation/`, `docs/reviews/` | Snapshot đúng ngày/head/môi trường, không phải quyền chạy lại lệnh |
| Lịch sử | [history index](history/README.md), LAB_HANDOFF/SECURITY_LAB/MERGE_PLAN cũ | Đọc bản Git cố định; không triển khai lại luồng đó |

## Cách giữ tài liệu không gây hiểu nhầm

- Trạng thái hiện hành chỉ viết ngắn ở PROJECT_STATUS/AI_HANDOFF; chi tiết từng lần chạy vào receipt có ngày/head. Không tiếp tục prepend hàng chục snapshot trái trạng thái vào lối vào chính.
- Không đặt Draft/pending labels của một PR bảo trì vào README như một gate sản phẩm. Merge tài liệu không tạo nhu cầu mở PR tiếp chỉ để đổi nhãn Draft.
- Không sửa số liệu lịch sử thành kết quả mới. Owner-confirmed không là agent trace; local/CI không là pilot/production; omitted/unverified không là PASS.
- Hướng dẫn setup một lần phải được tách khỏi bảo trì hệ thống có volume/ledger. Không sao chép các lệnh cũ vào runbook mới nếu chưa đối chiếu code.
