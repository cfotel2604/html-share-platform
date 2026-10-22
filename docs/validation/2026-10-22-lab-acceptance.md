# Nghiệm thu lab và chuẩn bị merge — 2026-10-22

Refs [PR #15](https://github.com/cfotel2604/html-share-platform/pull/15), Issues #8/#10/#14/#16; [handoff](../LAB_HANDOFF.md), [merge plan](../MERGE_PLAN.md). Mốc này cập nhật tài liệu/env mẫu, không build/restart/migrate/merge hoặc đổi UFW/DNS.

## Owner xác nhận

Owner đã mở UFW443 cho mọi nguồn, bên ngoài đã tải được iframe. Owner dùng thử lab và báo OK về mọi thứ. Trước đó đã xác nhận Admin/Employee login và private preview/retests. Đây là xác nhận chức năng tổng quát; chưa có kết quả từng case real-session RBAC hoặc browser/mobile matrix. Không đổi thành full security/production approval.

## Agent kiểm độc lập, chỉ đọc

- Source VM `/opt/hsp/src` detached `dc7560ea1c34cbe060779fbe69bb2f574e170431`, tracked sạch; giữ `compose.lab.yaml`/`compose.edge.yaml` operator.
- Web `html-share-studio:share-dc7560ea1c34`, image ID `sha256:7967815b1c25611fc4237f929bc3cf21c21243f242524073f1509e3a3654232a`, revision label khớp; gateway giữ `html-share-studio:security-417c50d`. Web/gateway/DB/MinIO running/healthy.
- Web3100/gateway 4100 bind127.0.0.1, DB/MinIO không publish ports. UFW active, `443/tcp ALLOW IN Anywhere` cả IPv4/IPv6. Không tự đổi firewall hoặc chứng minh các nginx vhost khác đã được inventory/regression.
- DB READ ONLY: migrations 0001/0002/0003; 3 sites/7 versions, 3 active/3 revoked share links; thiếu history0, thiếu asset manifest0. Inventory tăng sau owner dùng ứng dụng; không so với baseline2 sites/2 versions trước cutover hoặc Desktop10 sites/17 versions.
- AUTH_MODE=clerk, trusted public Studio cùng loopback vận hành cũ; canonical viewer HTTPS, content domain lab HTTPS, public port rỗng, preview/viewer frame origins đúng. Viewer budget 600, share mutations enabled.
- HTTPS GET với CA validation và browser-style User-Agent: Studio 200; một canonical viewer published200/1 iframe sandbox allow-scripts, frame-src đúng; direct content 200 với HTTP sandbox allow-scripts/frame-ancestors đúng viewer; viewer API 404 và legacy32hex alias 404. Viewer/content no-store, không Set-Cookie. Không log codes/hostname grants/cookies/upload payload. Kiểm từ VM, không có independent probe từ4G.
- `.env` VM chưa lưu SECURITY_IMAGE; Compose config trong process không có shell override FAIL vì thiếu biến. Đã ghi cách operator lưu đúng tag và config--quiet ở handoff; không sửa `.env` thật hoặc ảnh hưởng web đang chạy.
- GitHub fetch/live: main 78cb7ca; #5/#12 Ready, #13/#15 Draft, bốn PR OPEN/MERGEABLE/CI SUCCESS tại heads trong MERGE_PLAN. #8/#9/#10/#11/#14/#16 OPEN. Repo cho phép merge commit, không auto-delete branches. Head docs sau mốc này cần check riêng sau push.

## Kết luận

Lab đã cutover web #15 và owner nghiệm thu truy cập iframe bên ngoài sau mở443. [Finding mạng ngày 21/10](2026-10-21-lab-public-origins.md) đã có xử lý của owner; khác biệt nguồn bằng chứng vẫn giữ. [Migration/backfill](2026-10-21-runtime-permissions.md) đã PASS; không yêu cầu chạy lại. Một việc lưu bền env còn chờ operator; review #13/#15/production gates theo MERGE_PLAN, chưa tự chuyển Ready/merge/đóng Issues.

Kiểm tra cập nhật PASS: required docs và 25 Markdown files/local links, 6 GitHub YAML files cùng overlay example, render Compose bằng env synthetic (local + lab HTTPS) với assertions cho origins/image/ports/public port rỗng/Clerk secret scope; 8 Bash blocks phần8.2/8.3 syntax PASS, credential lines trong runbook so backup không đổi, git diff check PASS. Không start container cho kiểm template hoặc rerun browser/DB integration chỉ vì sửa tài liệu; CI hiện có vẫn kiểm application/security và được đối chiếu đúng head sau push.
