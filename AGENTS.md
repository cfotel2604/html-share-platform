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

- Nhân viên đăng nhập và có RBAC khi upload/đổi trạng thái; guest chỉ được truy cập public site đang published.
- HTML/JS upload không được chạy cùng origin/eTLD+1 với dashboard, cũng không được chạy server-side.
- Mỗi site phải có hostname publish riêng (`<host-id>.space-ods.cfvn.cloud`, lab `<host-id>.lab-space-ods.cfvn.cloud`), viewer `view.ods.vn/<share-code>` (lab `view-lab.ods.vn/<share-code>`) chỉ serve shell tin cậy; iframe và HTTP response HTML upload phải có sandbox không `allow-same-origin`. Không giảm mức cô lập origin để đơn giản hóa tính năng preview.
- DNS wildcard mỗi môi trường không được ghi đè record/route website có sẵn. Kiểm kê reserved hostnames và ngăn cookie `Domain=cfvn.cloud` từ HTML upload (kể cả khi mở trực tiếp, sibling host và lab/production) trước khi triển khai P4. Domain/mã link theo [ADR-0004](docs/adr/0004-domains-and-share-codes.md); PR #15 triển khai viewer10base62, migration0003/backfill theo [SHARE_LINKS](docs/SHARE_LINKS.md). Web VM đã cutover theo [LAB_HANDOFF](docs/LAB_HANDOFF.md) ngày22/10; alias host-ID32hex trả404. Không suy runtime VM thành trạng thái Docker Desktop/production. Đổi mã viewer không chặn direct URL; muốn chặn nội dung mới phải unpublish/delete.
- ZIP phải được kiểm tra đầy đủ trước khi publish: traversal, symlink, bomb, quá quota, entry đè nhau, định dạng không cho phép.
- Lưu trữ asset theo version bất biến; đổi bản publish một cách atomic; unpublish thực sự chặn nội dung theo cache policy được công bố.
- Kiểm thử quyền sở hữu site, API authorization, upload validation và origin boundary khi thay đổi các lớp đó.

## Pilot A' — kiến trúc đích và lịch sử cần giữ riêng

**Quyền hiện hành:** [prompt hợp nhất A' và ma trận authority](docs/PILOT_APRIME_AUTHORITY.md) thay Fast-track/prepare-only/per-packet approval cũ. Được chủ động CLI pilot projector/rebuild/publicWorkerdeploy/retire và chỉ xóa legacy D1/R2 theo inventory+manifest guard; không hỏi lại từng bước Cloudflare. Owner25/10đã duyệt ghi VM `lab-b` theo [kế hoạch48](docs/PILOT_APRIME_NODE_ROLLOUT.md): project mới hsp-aprime-pilot, chỉ upstream HSP lab/stop-start dịch vụ mới, operator nạp secrets; chỉ thực thi sau49merge và48đồng bộ/passCI. Giữ source/data/volumes hsp-lab; không DNS/UFW/tắt toàn VM. Ngoài phạm vi này/private files/token ngoài policy, production/merge/#10/ADR-security exception vẫn cần owner. PR21/22/23/24/27/29 và Issues20/25/26/28 đã CLOSED superseded; #10/audit19 giữ OPEN. Tiếp phần độc lập khi PR chờ merge; không dual-path/legacy import/port, không cài pollmerge. Các bullet Fast-track/pending bên dưới là lịch sử trong phạm vi đã được prompt hợp nhất thay thế.

- [ADR-0006](docs/adr/0006-postgresql-source-of-truth-d1-public-read-model.md) **Accepted**: quản trị chỉ Node/PostgreSQL; outbox cùng transaction, projector/recovery Node là đường ghi D1 duy nhất. D1 chỉ public read model; không bật `METADATA_BACKEND=cloudflare`, API Worker hoặc preview Worker. Đọc [Agent Guide](docs/D1_READ_MODEL_AGENT_GUIDE.md) rồi [plan A'](docs/D1_READ_MODEL_PLAN.md) trước Issue con.
- Public A' chỉ một Worker `hsp-pilot`, fixed SELECT tham số hóa từ resolve.sql + R2 get/head theo manifest pin. Owner làm rõ #36: native bindings vẫn có API ghi; chỉ đọc được bảo đảm ở code/test/review/gate deploy, không IAM read-only, không ngoại lệ ADR-0006. Không secret quản trị/Clerk/service token, route quản trị/preview hoặc callback VM trên đường public. Preview chưa publish ở Node/VM theo ADR-0003.
- **Runtime pilot đã kiểm chứng25/10:** owner merge48tại main1fbe19c, application/config khớp source2a396ae/image d927742b đang chạy. Node/PG/outbox/projector/recovery/publicWorker/Nodepreview có receipt; API/previewWorkers và11bảngD1legacy đã retire,0004/0005đã áp/immutable. Chỉ dùng active-deployment.json; PGvolume đã khởi tạo, không chạy lại fresh-start/migration. Giữ oldview4100/owner testlinks, p-preview4110riêng;0R2deletions. [Bằng chứng](docs/validation/2026-10-24-aprime-pilot-execution.md), [packet tiếp](docs/validation/2026-10-25-projector-faults.md). Nghiệm thu owner/#38/#10 vẫn riêng.
- **Snapshot lịch sử trước cutover:** PR39/41/42/43/44 đã merge source. Điều này không chứng minh cutover runtime. Mô tả hostname/VM lab bên trên và runbook 22/10 là lịch sử môi trường khác; path serving A' theo ADR-0006 không thay domain production hoặc giảm sandbox. Metadata chỉ đọc ngày24/10 vẫn thấy ba Worker cũ; chưa được tự tắt/deploy/đổi secret. [Bảng đề xuất #37](docs/ADR0006_TRANSITION.md) tách rõ nguồn bằng chứng và gate #38/#10.
- PR19/21–24/27/29 và Issues10/20/25/26/28 có ghi chú chuyển kiến trúc; quyết định đóng/thu hẹp từng mục chờ owner. Không merge stack cũ nguyên trạng, chạy legacy provision/cleanup hoặc sửa migration đã áp dụng (đặc biệt D1 0004 đã áp một lần theo #32).
- Fast-track: mỗi Issue một branch/Draft, Refs đúng Issue; sau owner **báo merge trong chat** mới xác minh main và tiếp Issue phụ thuộc. Không cài lịch/poll theo dõi merge. Sau #37 chỉ chuẩn bị #38; không auto Ready/merge/deploy. CLI chỉ đọc/D1 local/config private mới không cấp quyền ghi D1 pilot, VM/Docker hoặc đọc private files owner. Owner chốt #38: p95 commit revoke→public404≤60giây khi projector/REST khỏe, cảnh báo revoke pending>60giây/Admin chưa đồng bộ; sự cố báo cáo riêng, không bảo đảm chặn trong60giây. [Hồ sơ chuẩn bị #38](docs/PILOT_APRIME_ACCEPTANCE.md) ghi phương pháp/gate remote; token policy đã chốt ở [projector runbook](docs/PUBLIC_PROJECTOR.md), không hỏi/ghi giá trị token.

## Quy trình thay đổi

1. Xác định Issue và acceptance criteria, tạo branch theo `docs/WORKFLOW.md`.
2. Viết code/test sát phạm vi, giữ thay đổi dễ review.
3. Chạy lint/typecheck/unit/integration tùy khu vực thay đổi; với tài liệu chạy `python scripts/check_docs.py` và `git diff --check`.
4. Trong PR ghi vấn đề, giải pháp, kiểm chứng, rủi ro, cách rollback; link Issue.
5. Chỉ chuyển Draft PR sang Ready khi các gate đã đạt; cần staging/pilot trước production.

## Khi dự án chưa có implementation

Không giả định kiến trúc đề xuất là quyết định đã được chấp nhận. P0 là tài liệu kế hoạch; xác nhận các quyết định mở trong PLAN trước khi triển khai phase liên quan.
