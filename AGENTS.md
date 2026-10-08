# Hướng dẫn cho coding agents

Dự án này xuất bản HTML/CSS/JavaScript do nhân viên upload lên HTTPS để người có link có thể xem. Nội dung upload là **untrusted code** chạy trong trình duyệt người xem.

## Trước khi sửa code

- Đọc [PLAN.md](PLAN.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/WORKFLOW.md](docs/WORKFLOW.md) và [ADR-0001](docs/adr/0001-public-site-origin-isolation.md).
- Giữ phạm vi của GitHub Issue đang xử lý. Nếu cần thay đổi kiến trúc lớn, nêu phương án và cập nhật ADR trong PR.
- Dùng feature branch từ `main`, mở Draft PR, cập nhật các phần đã xử lý và kiểm chứng. Không tự merge hoặc deploy production nếu chưa được giao.
- Không commit secret, `.env`, tệp upload riêng tư, credential, token hoặc dữ liệu nhạy cảm. Không ghi nội dung file HTML người dùng vào logs.

## Các ranh giới kỹ thuật bắt buộc

- Nhân viên đăng nhập và có RBAC khi upload/đổi trạng thái; guest chỉ được truy cập public site đang published.
- HTML/JS upload không được chạy cùng origin/eTLD+1 với dashboard, cũng không được chạy server-side.
- Mỗi site phải có hostname publish riêng (`<site-id>.matbao.one`), viewer `view.ods.vn/<site-id>` chỉ serve shell tin cậy; iframe và HTTP response HTML upload phải có sandbox không `allow-same-origin`. Không giảm mức cô lập origin để đơn giản hóa tính năng preview.
- DNS wildcard `*.matbao.one` không được ghi đè record/route website có sẵn. Kiểm kê reserved hostnames và ngăn cookie `Domain=matbao.one` từ HTML upload (kể cả khi mở trực tiếp) trước khi triển khai P4.
- ZIP phải được kiểm tra đầy đủ trước khi publish: traversal, symlink, bomb, quá quota, entry đè nhau, định dạng không cho phép.
- Lưu trữ asset theo version bất biến; đổi bản publish một cách atomic; unpublish thực sự chặn nội dung theo cache policy được công bố.
- Kiểm thử quyền sở hữu site, API authorization, upload validation và origin boundary khi thay đổi các lớp đó.

## Quy trình thay đổi

1. Xác định Issue và acceptance criteria, tạo branch theo `docs/WORKFLOW.md`.
2. Viết code/test sát phạm vi, giữ thay đổi dễ review.
3. Chạy lint/typecheck/unit/integration tùy khu vực thay đổi; với tài liệu chạy `python scripts/check_docs.py` và `git diff --check`.
4. Trong PR ghi vấn đề, giải pháp, kiểm chứng, rủi ro, cách rollback; link Issue.
5. Chỉ chuyển Draft PR sang Ready khi các gate đã đạt; cần staging/pilot trước production.

## Khi dự án chưa có implementation

Không giả định kiến trúc đề xuất là quyết định đã được chấp nhận. P0 là tài liệu kế hoạch; xác nhận các quyết định mở trong PLAN trước khi triển khai phase liên quan.
