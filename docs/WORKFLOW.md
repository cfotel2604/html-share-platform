# Quy trình làm việc với GitHub

**Repository:** private `cfotel2604/html-share-platform`

**Main:** nhánh ổn định; phát triển qua issue, branch và pull request.

## Nhịp phát triển

1. Tạo GitHub Issue với bối cảnh, user story, acceptance criteria; label `phase:P0`…`phase:P7`, `security`, `bug` nếu phù hợp.
2. Tạo branch từ `main`: `feat/<issue-id>-<scope>`, `fix/<issue-id>-<scope>` hoặc `docs/<scope>`.
3. Commit nhỏ, thông điệp rõ; không commit `.env`, secrets hoặc nội dung HTML riêng tư của nhân viên.
4. Push branch và mở **Draft PR** sớm; link Issue bằng `Refs #N`, chỉ dùng `Closes #N` khi PR hoàn tất scope.
5. PR ghi vấn đề, thay đổi, rủi ro, hướng dẫn test và bằng chứng; cập nhật PR trong lúc giải quyết review comments.
6. Chỉ đổi sang Ready for review khi lint/typecheck/build/test phù hợp pass và checklist xong.
7. Review, merge vào `main` sau khi đạt gate. Release production yêu cầu quyết định triển khai riêng; dùng staging và canary/pilot.

## Quy ước kiểm tra

- Docs only: đọc lại đường dẫn nội bộ, syntax Markdown/YAML, `git diff --check`.
- Code: lint + typecheck + unit test; API permissions, upload validation, gateway isolation có integration test.
- Release: mobile/Zalo compatibility, backup restore và rollback chứng minh trên staging.
- Merge/deploy: không tự động merge hay deploy production từ agent nếu chưa có chỉ dẫn rõ.

## Ghi chép và theo dõi

Một PR phải giúp người không tham gia cuộc chat hiểu yêu cầu, cách triển khai, test nào đã chạy và điểm còn mở. Phát hiện mới thành GitHub Issue, không để chỉ trong lịch sử chat. ADR dùng cho quyết định ảnh hưởng sâu đến bảo mật, kiến trúc, dữ liệu hoặc hạ tầng. Đánh dấu trạng thái: Proposed / Accepted / Superseded.

## Cấu hình khuyến nghị sau P0

Cấu hình GitHub branch protection trên `main`: bắt buộc PR trước merge và status checks (khi CI tồn tại); chỉ yêu cầu review từ người khác nếu thực tế có reviewer. Với repo 1 maintainer, đảm bảo workflow vận hành được. Bật secret scanning theo khả năng plan.
