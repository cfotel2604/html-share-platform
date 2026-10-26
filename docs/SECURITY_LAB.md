# Security lab cũ và fixture — tham chiếu lịch sử

Loại: lối vào tương thích cho tài liệu lịch sử. Các lệnh deploy/backfill/authbootstrap trong bản cũ thuộc môi trường trước A'. MinIO trong CI hiện tại vẫn là isolated fixture, không phải storagepilot. Không chạy setup cũ lên VM đang dùng.

- Hướng dẫn hiện hành: [DEVELOPMENT.md](DEVELOPMENT.md) và [bản đồ](DOCUMENTATION_MAP.md).
- [Bản đầy đủ cố định trước tổng hợp](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/docs/SECURITY_LAB.md) giữ nguyên ngày/head/evidence/lệnh cũ; chỉ đọc theo scope lịch sử, không thực thi như runbook hiện tại.
- [Historyindex](history/README.md) giải thích precedence và các snapshot khác.

Không sửa/xóa dữ liệu, chạy migration lại, đổi secrets hoặc tắtold viewer theo trang này. Production và mọi thao tác ngoài [authority](PILOT_APRIME_AUTHORITY.md) cần quyết định riêng.
