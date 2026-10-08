# ADR-0001: Cô lập origin cho HTML được upload

- **Status:** Proposed
- **Date:** 2026-10-08
- **Owners:** Project maintainers

## Context

Nhân viên tải lên HTML/CSS/JS tùy ý để người khác xem qua URL HTTPS. HTML có thể chạy JavaScript, truy cập localStorage/cookies trên origin và tải script từ mạng. Dashboard chứa session quản trị và dữ liệu về site, vì vậy cần boundary rõ ràng.

## Decision

1. Dashboard/API chạy trên **registrable domain khác** so với domain public serving (ví dụ `admin.example.com` và `<siteId>.pages-example.net`), không cùng eTLD+1.
2. Mỗi site được publish từ một hostname riêng với ID ngẫu nhiên >=128 bits; wildcard DNS/TLS. Điều này cô lập state của các site với nhau.
3. Admin sử dụng cookie host-only, HttpOnly, Secure, SameSite phù hợp; không thiết lập cookie `Domain` bao trùm nhiều host.
4. Static gateway chỉ phục vụ asset đã qua validation từ object storage, không thực thi mã phía server hoặc cấp credential admin. Object storage không cho phép public listing.
5. Preview cũng dùng origin cô lập, không iframe cùng-origin dashboard. Nếu cần quyền xem preview, dùng token phạm vi hẹp, TTL ngắn, không gắn session admin với publish origin.

## Consequences

- Cần thêm domain và wildcard DNS/TLS, routing hostname, test cross-origin.
- HTML/CSS/JS client-side và URL tài nguyên bắt đầu bằng `/` có thể chạy từ root riêng cho từng site.
- HTTPS không loại bỏ giới hạn của trình duyệt tích hợp Zalo hoặc cho phép server-side code.
- Hostname là public. Không dùng tính không thể đoán ID để thay thế xác thực cho dữ liệu bí mật.
- Có thể áp CSP, quotas, content policy và reporting sau khi đo compatibility; luôn giữ origin isolation dù CSP được nới cho nội dung tương tác.

## Alternatives considered

- `https://admin.example.com/p/<id>/`: loại bỏ vì JavaScript upload sẽ cùng origin với dashboard.
- `https://pages-example.net/p/<id>/` cho tất cả site: phân tách khỏi dashboard nhưng các site chia sẻ origin/state với nhau.
- Render HTML bằng iframe sandbox trên dashboard: vẫn có rủi ro UX/compatibility và khó hỗ trợ link chia sẻ public như website độc lập.

## Validation / revisit

Trước P4, chứng minh bằng browser test rằng một site không đọc cookie/localStorage từ admin và site khác, không có credential forwarding trong gateway, wildcard TLS hoạt động. Xem lại khi có yêu cầu custom domains hoặc auth riêng cho trang chia sẻ.
