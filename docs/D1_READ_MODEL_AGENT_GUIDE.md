# Hướng dẫn cho Agent — triển khai A' (PostgreSQL nguồn sự thật, D1 public read model)

Tài liệu này dành cho coding agent bắt đầu làm việc trên hướng kiến trúc A'. Đọc tài liệu này **sau** [ADR-0006](adr/0006-postgresql-source-of-truth-d1-public-read-model.md) và **trước** khi chạm vào bất kỳ Issue con nào trong [D1_READ_MODEL_PLAN](D1_READ_MODEL_PLAN.md). Nếu có xung đột giữa tài liệu này và ADR-0006, ADR-0006 thắng; nếu xung đột với `AGENTS.md` ở thư mục gốc về quy trình chung, `AGENTS.md` thắng và phải báo lại cho owner.

## 1. Bối cảnh trong 60 giây

- Owner đã chốt (2026-10-24): **PostgreSQL trên Docker VM = nguồn sự thật duy nhất; D1 = public read model; chỉ một Worker public `hsp-pilot`; toàn bộ quản trị ở Studio/Node trên VM.**
- Kiến trúc 3 Worker + D1-primary của Issue #20 / ADR-0005 (Draft PR #21–#24, #27, #29) **không còn là đích**. Đừng tiếp tục xây theo hướng đó và đừng merge các PR đó nguyên trạng.
- Việc phải làm đã chia sẵn thành Epic + 7 Issue trong [D1_READ_MODEL_PLAN](D1_READ_MODEL_PLAN.md). Làm đúng một Issue trong một branch/PR.

## 2. Thứ tự đọc bắt buộc trước phiên làm việc đầu tiên

1. `AGENTS.md` (gốc repo) — quy trình bắt đầu phiên, ranh giới kỹ thuật, cách cập nhật handoff.
2. [ADR-0006](adr/0006-postgresql-source-of-truth-d1-public-read-model.md) — quyết định đích, đọc kỹ 10 điểm trong mục Decision.
3. [D1_READ_MODEL_PLAN](D1_READ_MODEL_PLAN.md) — Issue bạn được giao, các Issue phụ thuộc, acceptance.
4. `PLAN.md`, `docs/ARCHITECTURE.md`, `docs/WORKFLOW.md` — bối cảnh tổng thể và nhịp Issue → branch → Draft PR.
5. [ADR-0001](adr/0001-public-site-origin-isolation.md), [ADR-0004](adr/0004-domains-and-share-codes.md) — ranh giới origin/domain/mã chia sẻ vẫn còn hiệu lực.
6. ADR-0005 (`docs/adr/0005-path-sandbox-cloudflare-pilot.md`, trong Draft PR #21) — chỉ còn giá trị ở phần *serving*; các phần về API Worker/D1-primary/preview Worker đã bị ADR-0006 thay thế. Nếu ADR-0005 chưa có trên `main` (nó đang ở Draft PR #21), đọc nó từ branch của PR #21 và ghi rõ nguồn trong PR của bạn.
7. `docs/PROJECT_STATUS.md` và `docs/AI_HANDOFF.md` — trạng thái snapshot; **luôn** kiểm chứng lại bằng GitHub (`gh pr list`, `gh issue list`, trạng thái CI tại head chính xác) trước khi kết luận, theo đúng hướng dẫn trong `AGENTS.md`.

Trước khi viết code, hãy nêu ngắn gọn trong PR (hoặc báo owner nếu chưa có PR): bạn hiểu đích kiến trúc là gì, Issue của bạn chạm vào phần nào, phần nào bạn **không** đụng tới.

## 3. Các bất biến — không được phá, kể cả để "làm cho nhanh"

1. PostgreSQL là nguồn sự thật duy nhất. Mọi trạng thái quản trị chỉ commit ở PostgreSQL.
2. D1 chỉ chứa danh mục read model của ADR-0006 điểm 3. Không email, allowlist, role, audit, session, dữ liệu định danh.
3. Đường ghi D1 duy nhất: projector từ outbox (và công cụ rebuild/reconcile). Không ghi D1 trực tiếp trong request handler, trong Worker, hay trong script ad-hoc không qua hai cơ chế này.
4. Outbox event nằm **trong cùng transaction PostgreSQL** với thay đổi trạng thái. Cấm dual-write kiểu "commit PostgreSQL xong rồi gọi REST D1 luôn trong request".
5. Mọi bản ghi read model có `projection_version` đơn điệu; ghi D1 luôn có guard chỉ áp dụng khi mới hơn hiện tại. Revoke là tombstone, không xóa dòng, không sự kiện cũ nào được làm code đã revoke xuất hiện lại.
6. Worker `hsp-pilot` là Worker public duy nhất: chỉ đọc D1 (primary) + đọc R2, không binding ghi, không secret quản trị, không Clerk, không service token, không route quản trị, không gọi về VM/Node/PostgreSQL dưới bất kỳ hình thức nào (HTTP, Tunnel, Workers VPC/Hyperdrive đều không) trên đường phục vụ public.
7. Serving giữ nguyên kỷ luật của ADR-0005: kiểm tra published/manifest ở mọi request, CSP sandbox `allow-scripts` không `allow-same-origin` cho mọi HTML kể cả nested/direct, `no-store`/`nosniff`/`no-referrer`, ngoài manifest là 404, tối đa 1 truy vấn D1 mỗi request.
8. Preview chưa publish ở phía VM/Studio (grant ngắn hạn, ADR-0003). Không tự thêm preview vào Worker public.
9. Token Cloudflare REST là secret quản trị: chỉ trong secret store của Node, không log, không response, không Git, không đưa vào prompt/báo cáo. Không dùng token này cho việc ngoài projector/rebuild/migration read model.
10. Không sửa migration đã áp dụng (cả PostgreSQL 0001–0003 và dãy migration D1 đã dùng trên pilot). Thay đổi schema = migration additive mới.
11. Không merge/deploy tự động. Mọi PR để Draft cho owner review; merge source, provision/deploy Cloudflare và production là các quyết định riêng của owner, theo `WORKFLOW.md` và gate #10.
12. Không ghi secret, nội dung HTML upload, hay dữ liệu người dùng vào tài liệu, log kiểm chứng, hay PR.

## 4. Cách làm một Issue

1. Đọc Issue và acceptance của nó trong [D1_READ_MODEL_PLAN](D1_READ_MODEL_PLAN.md); kiểm tra Issue phụ thuộc đã đóng/merge chưa. Nếu phụ thuộc chưa xong, dừng và báo owner thay vì làm tắt.
2. Tạo branch từ `main` mới nhất theo `WORKFLOW.md` (`feat/<issue>-<scope>`, `fix/<issue>-<scope>` hoặc `docs/<scope>`), mở Draft PR sớm, liên kết bằng `Refs #<issue>` (chỉ dùng `Closes` khi PR hoàn tất toàn bộ scope).
3. Giữ thay đổi trong phạm vi Issue. Phát hiện việc ngoài phạm vi → tạo Issue mới hoặc ghi vào PR để owner quyết, không tự mở rộng.
4. Viết test tương ứng với từng acceptance trước/song song với code; acceptance nào chưa kiểm được thì ghi rõ "chưa xác minh" và lý do trong PR — không đánh dấu đạt theo suy đoán, không dùng bằng chứng của môi trường khác (local ≠ pilot ≠ production).
5. Chạy kiểm tra theo loại thay đổi:
   - Tài liệu: `python scripts/check_docs.py`, `python scripts/check_yaml.py` (nếu chạm YAML), `git diff --check`.
   - Code: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` và các nhóm integration liên quan (auth/upload/serving) như CI của repo.
   - Ghi trong PR: lệnh đã chạy, kết quả tại **head chính xác**, bằng chứng đo lường nếu acceptance yêu cầu số liệu (độ trễ chiếu, revoke propagation, số request).
6. Cuối mỗi mốc (merge, đổi trạng thái PR/Issue liên quan, hoàn tất một Issue), cập nhật `docs/PROJECT_STATUS.md` và `docs/AI_HANDOFF.md` **trong chính branch/PR đang làm**, theo quy định ở `AGENTS.md`: ngày, commit, PR/Issue, kết quả kiểm tra, việc còn lại. Không sửa trực tiếp `main`.

## 5. Các câu hỏi phải hỏi owner — không tự đoán

**Owner đã trả lời ngày2026-10-24 cho #33:** giữ account pilot hiện tại; token riêng `hsp-projector-pilot`, D1 Read/Write only, chỉ secret store Node/VM; rotate90ngày hoặc ngay khi nghi rò rỉ/đổi quản trị/VM bị nghi xâm nhập. Trình tự và revoke khẩn cấp ở [PUBLIC_PROJECTOR](PUBLIC_PROJECTOR.md). Không yêu cầu lại quyết định này hoặc giá trị token. Remote projector vẫn cần duyệt riêng; ngưỡng60giây chưa được owner chốt. Fast-track Draft #33→#34→#36→#37 rồi chuẩn bị#38: chỉ chuyển issue kế sau khi owner merge PR phụ thuộc, mỗi issue branch/Draft riêng, không tự merge/deploy. CLI chỉ đọc/D1 local/chuẩn bị config private mới được phép; không suy ra quyền ghi D1/VM/Docker.

Dừng và hỏi owner (ghi câu hỏi trong PR/Issue) khi gặp các điểm sau, thay vì tự chọn:

- Ngưỡng revoke propagation chính thức (kế hoạch đang đề xuất p95 ≤ 60 giây) và mức cảnh báo vận hành.
- Account Cloudflare dùng cho token REST của projector (account riêng cho pilot hay dùng chung) và quy trình rotate.
- Hostname public chính thức của `hsp-pilot` ngoài môi trường pilot (thuộc gate domain của #10/ADR-0004, không tự chọn domain).
- Quyết định đóng/thu hẹp từng PR trong nhóm #21–#24, #27, #29 (Issue 6 chỉ chuẩn bị bảng đề xuất).
- Bất kỳ nhu cầu nào đòi phá một bất biến ở mục 3 — những việc đó cần ADR mới hoặc sửa ADR-0006, không giải quyết bằng ngoại lệ trong code.

## 6. Mẫu bàn giao cuối phiên (dán vào PR hoặc AI_HANDOFF)

```text
Phiên: <ngày, Asia/Saigon> — Issue #<n> / PR #<n> @ <head sha>
Đã làm: <1–3 dòng, đúng phạm vi Issue>
Kiểm chứng: <lệnh/test + kết quả tại head; tách rõ owner-confirmed / agent-checked / chưa xác minh>
Trạng thái đồng bộ (nếu liên quan): <độ trễ chiếu đo được, outbox tồn đọng, kết quả reconcile>
Còn mở: <acceptance chưa đạt, gate liên quan, câu hỏi chờ owner>
Không đụng tới: <lab VM / production / PR khác — xác nhận giữ nguyên>
```
