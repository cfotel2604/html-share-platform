# Hướng dẫn cho coding agents

Dự án này xuất bản HTML/CSS/JavaScript do nhân viên upload lên HTTPS để người có link có thể xem. Nội dung upload là **untrusted code** chạy trong trình duyệt người xem.

## Bắt đầu một phiên Agent mới

1. Xác nhận đúng repository và worktree bằng `git status --short --branch`, `git worktree list` và `git remote -v`. **Không giả định** nhánh `main` trong workspace đã cập nhật; kiểm tra `git fetch origin --prune` rồi đối chiếu `origin/main`. Giữ nguyên file chưa được Git theo dõi và dữ liệu Docker; không tự động reset/clean worktree.
2. Đọc `AGENTS.md`, `README.md`, `PLAN.md`, `docs/ARCHITECTURE.md`, `docs/WORKFLOW.md`, `docs/adr/`, sau đó đọc [PROJECT_STATUS](docs/PROJECT_STATUS.md) và [AI_HANDOFF](docs/AI_HANDOFF.md).
3. Xác minh lại các thông tin dễ thay đổi bằng GitHub (`gh pr list`, `gh issue list`, `gh pr view <id> --json state,isDraft,baseRefName,headRefName,mergeable,statusCheckRollup`) và log `origin/main`. Trạng thái ghi trong Markdown là **snapshot tại ngày cập nhật**, không thay thế kiểm chứng GitHub.
4. Nêu ngắn gọn phase đã xong, PR/Issue còn mở, rủi ro và bước tiếp theo trước khi bắt tay vào việc mới. Phân biệt rõ **đã kiểm chứng**, **theo ghi nhận phiên trước** và **chưa xác minh**.

Khi kết thúc một mốc công việc (merge PR, đổi base, giải quyết conflict, đổi kiến trúc, hoàn tất review), cập nhật `docs/PROJECT_STATUS.md` và `docs/AI_HANDOFF.md` trong **branch/PR được giao**, ghi ngày, commit, PR/Issue, kết quả kiểm tra và việc còn lại. Không cập nhật trực tiếp `main` từ một phiên chat. Không ghi secrets, token, mật khẩu, dữ liệu upload hoặc thông tin khách hàng vào tài liệu bàn giao. Nếu chưa được giao quyền sửa branch, đưa đề xuất cập nhật để owner xem xét.

## Trước khi sửa code

- Đọc [PLAN.md](PLAN.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/WORKFLOW.md](docs/WORKFLOW.md) và [ADR-0001](docs/adr/0001-public-site-origin-isolation.md).
- Giữ phạm vi của GitHub Issue đang xử lý. Nếu cần thay đổi kiến trúc lớn, nêu phương án và cập nhật ADR trong PR.
- Dùng feature branch từ `main`, mở Draft PR, cập nhật các phần đã xử lý và kiểm chứng. Không tự merge hoặc deploy production nếu chưa được giao.
- Không commit secret, `.env`, tệp upload riêng tư, credential, token hoặc dữ liệu nhạy cảm. Không ghi nội dung file HTML người dùng vào logs.

## Các ranh giới kỹ thuật bắt buộc

**Pilot remote được giao riêng ngày 2026-10-23:** owner cho phép chủ động CLI/Docker/SSH để triển khai pilot độc lập; [provider preflight](docs/validation/2026-10-23-cloudflare-desktop.md) ghi tài nguyên đã tạo và gate còn thiếu. Dùng branch/PR vận hành, private config ngoài Git và standalone Compose project hsp-cf-desktop. Quyền này không cho merge source, thay runtime lab/unrelated resources, DNS/UFW hoặc production cutover. Không provision/deploy lại chỉ để kiểm trạng thái, không tạo dual-write, không nới Clerk azp hoặc sandbox để vượt gate.

**Pilot mới được owner giao ngày 2026-10-23:** áp dụng [ADR-0005](docs/adr/0005-path-sandbox-cloudflare-pilot.md) và [contract](docs/CLOUDFLARE_PILOT.md) cho Workers path-based + D1/private R2, không yêu cầu hostname mỗi site hoặc viewer iframe trong pilot. Mọi HTML/direct/nested vẫn có HTTP sandbox không allow-same-origin, không browser persistence. Đây là scope triển khai thử, ADR vẫn Proposed; các yêu cầu hostname/viewer bên dưới tiếp tục áp dụng cho lab cũ. Không sửa runtime/DNS/UFW/env/SQL lab hoặc tạo dual-write; không provision/deploy remote khi chưa được giao riêng.

- Nhân viên đăng nhập và có RBAC khi upload/đổi trạng thái; guest chỉ được truy cập public site đang published.
- HTML/JS upload không được chạy cùng origin/eTLD+1 với dashboard, cũng không được chạy server-side.
- Mỗi site phải có hostname publish riêng (`<host-id>.space-ods.cfvn.cloud`, lab `<host-id>.lab-space-ods.cfvn.cloud`), viewer `view.ods.vn/<share-code>` (lab `view-lab.ods.vn/<share-code>`) chỉ serve shell tin cậy; iframe và HTTP response HTML upload phải có sandbox không `allow-same-origin`. Không giảm mức cô lập origin để đơn giản hóa tính năng preview.
- DNS wildcard mỗi môi trường không được ghi đè record/route website có sẵn. Kiểm kê reserved hostnames và ngăn cookie `Domain=cfvn.cloud` từ HTML upload (kể cả khi mở trực tiếp, sibling host và lab/production) trước khi triển khai P4. Domain/mã link theo [ADR-0004](docs/adr/0004-domains-and-share-codes.md); PR #15 triển khai viewer10base62, migration0003/backfill theo [SHARE_LINKS](docs/SHARE_LINKS.md). Web VM đã cutover theo [LAB_HANDOFF](docs/LAB_HANDOFF.md) ngày22/10; alias host-ID32hex trả404. Không suy runtime VM thành trạng thái Docker Desktop/production. Đổi mã viewer không chặn direct URL; muốn chặn nội dung mới phải unpublish/delete.
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
