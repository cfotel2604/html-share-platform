# Kế hoạch triển khai — A': PostgreSQL nguồn sự thật, D1 public read model

**Quyết định gốc:** [ADR-0006](adr/0006-postgresql-source-of-truth-d1-public-read-model.md) (Accepted, owner chốt 2026-10-24).
**Hướng dẫn thực thi cho Agent:** [D1_READ_MODEL_AGENT_GUIDE.md](D1_READ_MODEL_AGENT_GUIDE.md).
**Refs:** #10 (release/security gates — vẫn mở, không đóng bởi kế hoạch này), #20 (pilot gốc — được thay thế một phần bởi ADR-0006).

Tài liệu này chia việc thành một Epic và 7 Issue con. Mỗi Issue con là một đơn vị làm việc độc lập theo [WORKFLOW](WORKFLOW.md): branch riêng từ `main`, Draft PR sớm, `Refs #<issue>`, chỉ merge khi acceptance đạt. Thứ tự phụ thuộc ghi rõ trong từng Issue; không làm gộp nhiều Issue vào một PR.

---

## Epic — Chuyển pilot sang A': PostgreSQL source of truth, D1 public read model, một Worker public

**Mục tiêu:** Thay kiến trúc 3 Worker (API/public/preview, D1-primary) của Issue #20 bằng kiến trúc đích của ADR-0006, giữ nguyên đặc tả serving công khai của ADR-0005 (path `/<code>/`, CSP sandbox, kiểm tra published/manifest mọi request, tombstone không hồi sinh).

**Hoàn thành khi:** toàn bộ Issue con 1–7 đóng, và các bằng chứng ở mục Validation của ADR-0006 tồn tại trên pilot. Production vẫn cần phê duyệt riêng theo #10.

---

## Issue 1 — D1 public read model: schema tối thiểu và migration riêng

**Phụ thuộc:** không (làm đầu tiên, song song được với Issue 4).

**Phạm vi:**
- Thiết kế schema D1 chỉ cho read model theo ADR-0006 điểm 3: bảng ánh xạ theo `share_code` (site_id, status, active_version, manifest JSON hoặc bảng asset theo version, `projection_version`, `updated_at`), index tra cứu theo code; trạng thái `revoked` là tombstone — không xóa dòng khi revoke.
- Migration D1 riêng, additive, đánh số tiếp nối dãy migration D1 hiện có của pilot; **không** sửa migration PostgreSQL 0001–0003 và không sửa migration D1 đã áp dụng.
- Cấu hình database read model: tắt read replication (hoặc cơ chế tương đương đọc primary) và ghi lại bằng chứng cấu hình.
- Tài liệu dữ liệu: danh mục trường được phép/không được phép có trong D1.

**Ngoài phạm vi:** projector, Worker, thay đổi phía Node.

**Acceptance:**
- [ ] Migration áp được lên D1 trống và lên D1 pilot hiện hữu (additive, không mất dữ liệu pilot cần giữ).
- [ ] Không trường nào ngoài danh mục read model xuất hiện trong schema (đối chiếu danh mục tại ADR-0006 điểm 3).
- [ ] Bằng chứng cấu hình đọc primary/không replica được ghi vào tài liệu validation.
- [ ] Test: tra cứu theo code, tombstone revoke không bị insert lại thành published khi chiếu sự kiện cũ (guard `projection_version`).

## Issue 2 — Transactional outbox trong PostgreSQL + projector Node → D1

**Phụ thuộc:** Issue 1 (schema đích).

**Phạm vi:**
- Bảng outbox trong PostgreSQL (migration PostgreSQL mới, additive): sự kiện thay đổi trạng thái public (publish, unpublish, revoke, rotate, đổi active version) được ghi **trong cùng transaction** với thay đổi trạng thái; có số thứ tự/`projection_version`, trạng thái chiếu, số lần thử, lỗi gần nhất.
- Projector trong Node: vòng lặp/job đọc outbox chưa chiếu theo thứ tự, đẩy D1 qua Cloudflare REST API — **một batch idempotent cho mỗi sự kiện**, guard `projection_version` phía D1; retry với backoff khi REST lỗi/429; sự kiện revoke được ưu tiên trước sự kiện thường.
- Quan sát: log/metric độ trễ chiếu (commit → projected), độ sâu outbox, cảnh báo khi revoke chưa chiếu quá ngưỡng (mặc định đề xuất 60 giây, cấu hình được).
- Trạng thái đồng bộ hiển thị cho Admin/API của Studio: site có đang chờ chiếu hay không.

**Ngoài phạm vi:** rebuild toàn bộ (Issue 3), thay đổi Worker (Issue 5).

**Acceptance:**
- [ ] Không đường ghi D1 nào ngoài projector và công cụ rebuild (rà soát code + test).
- [ ] Tắt projector, thực hiện publish + revoke, bật lại: cả hai hiệu lực public đúng thứ tự, trạng thái cuối là revoked, không mất/không sống lại.
- [ ] Gửi trùng/replay một sự kiện cũ: D1 không đổi (idempotent, guard hoạt động).
- [ ] Đo và ghi lại độ trễ chiếu p50/p95 trên pilot, gồm trường hợp gói 500 file.
- [ ] Token REST chỉ tồn tại ở secret của Node; không xuất hiện trong log/response/Git (kiểm tra bằng tìm kiếm trong repo và log mẫu).

## Issue 3 — Rebuild và reconciliation cho read model

**Phụ thuộc:** Issue 1, 2.

**Phạm vi:**
- Lệnh rebuild: chiếu lại toàn bộ trạng thái public hiệu lực từ PostgreSQL lên D1 (dùng cho D1 trống, D1 lệch, hoặc sau sự cố), có `--dry-run` in diff trước khi ghi.
- Lệnh reconciliation: so sánh PostgreSQL ↔ D1 (theo code, status, active_version, `projection_version`), báo cáo lệch, tùy chọn sửa bằng cách chiếu lại từ PostgreSQL.
- Runbook vận hành: khi nào rebuild, khi nào chỉ reconcile, cách xử lý khi REST API lỗi kéo dài, quy trình revoke khẩn cấp thủ công khi projector hỏng (ghi rõ đây là thao tác owner, có audit).

**Acceptance:**
- [ ] Rebuild lên D1 trống cho kết quả phục vụ trùng khớp với trạng thái PostgreSQL.
- [ ] Tạo lệch cố ý trong D1: reconciliation phát hiện đúng và sửa được về khớp.
- [ ] Runbook được một người/agent khác đọc và thực thi thử thành công (ghi bằng chứng).

## Issue 4 — Quản trị nằm hẳn ở Node/PostgreSQL: loại bỏ đường D1-primary và API Worker

**Phạm vi:**
- Mọi thao tác quản trị (Clerk, allowlist/RBAC, ownership, ZIP, R2 upload/readback, publish/unpublish/rotate/revoke, cleanup) chạy qua PostgreSQL như lab hiện hữu; chế độ `METADATA_BACKEND=cloudflare` (D1-primary) bị gỡ hoặc khóa tắt vĩnh viễn kèm tài liệu — không còn đường chạy song song.
- Logic mint/refresh token để gọi API Worker (phát sinh từ #25) không còn trên đường quản trị.
- Preview chưa publish: thực hiện phía VM/Studio theo grant ngắn hạn (ADR-0003); bảo đảm không có đường preview nào phụ thuộc Worker Cloudflare trong phạm vi này.
- Phần việc còn đúng của #28 (mở workspace chậm, healthcheck polls) được xử lý trong phạm vi Node/PostgreSQL local: bootstrap workspace một lần đọc, healthcheck local không gọi ra ngoài.

**Ngoài phạm vi:** thay đổi UI Studio ngoài những gì cần để hiển thị trạng thái đồng bộ của Issue 2.

**Acceptance:**
- [ ] Toàn bộ flow quản trị chạy khi Cloudflare Workers/D1 không tồn tại (chỉ trừ bước chiếu của projector): tạo site, upload, publish, unpublish, revoke, rotate đều commit đúng ở PostgreSQL.
- [ ] Không còn code path quản trị nào gọi API Worker hoặc đọc/ghi D1 trực tiếp ngoài projector/rebuild (rà soát + test hồi quy).
- [ ] RBAC/ownership/audit: bộ test hiện hữu của lab vẫn pass; thao tác trái quyền bị chặn ở Node như trước.
- [ ] Upload gói 500 file: finalize commit ở PostgreSQL + R2 readback đạt, không phụ thuộc giới hạn Worker (kế thừa yêu cầu của #26 ở phía Node).

## Issue 5 — Worker public duy nhất `hsp-pilot`

**Phụ thuộc:** Issue 1 (schema), dùng dữ liệu chiếu mẫu hoặc kết quả Issue 2 để kiểm thử đầu-cuối.

**Phạm vi:**
- Một Worker duy nhất phục vụ public theo đặc tả serving của ADR-0005/ADR-0006 điểm 4: tra D1 (primary) theo code → kiểm published/chưa revoke → đọc R2 theo manifest đã pin size/ETag → trả nội dung + security headers (CSP sandbox `allow-scripts` không `allow-same-origin`, `no-store`, `nosniff`, `no-referrer`); canonical `/<code>/` → `index.html`; ngoài manifest trả 404; tối đa 1 truy vấn D1 cho mỗi request.
- Worker không có code path ghi D1/R2, không secret quản trị/Clerk/service token, không route quản trị, không gọi về VM/Node/PostgreSQL (kể cả qua Tunnel/VPC — theo ADR-0006, đó không phải đường public chính). Owner làm rõ #36 ngày2026-10-24: read-only ở code/test/review/gate deploy (fixed SELECT tham số hóa từ resolve.sql, R2GET/HEAD), native bindings vẫn có khả năng ghi, không IAM read-only; đây không phải ngoại lệ ADR0006 và chưa duyệt deploy.
- Tái sử dụng phần serving đã review trong PR #22 ở mức code nếu phù hợp, sau khi cắt bỏ API Worker và preview Worker.

**Acceptance:**
- [ ] Bộ test serving đạt: published 200 đúng nội dung/headers; unpublished/revoked/không tồn tại 404; asset ngoài manifest 404; nested HTML cũng có CSP sandbox; direct navigation cũng bị sandbox.
- [ ] Kiểm tra cấu hình đã deploy: đúng một Worker public, native bindings chỉ được code dùng fixed SELECT/get/head, không secret quản trị (liệt kê bằng chứng). Theo owner clarification #36, đây là read-only ở code/test/review/gate deploy, không IAM read-only; native capability vẫn rộng hơn.
- [ ] Tắt VM/Node/PostgreSQL: site đã publish vẫn phục vụ 200; bật lại không cần thao tác tay.
- [ ] Không request public nào phát sinh request về VM (kiểm tra log hai phía trong kịch bản test).

## Issue 6 — Xử lý các PR/Issue đang mở theo quyết định mới + đồng bộ tài liệu

**Phụ thuộc:** ADR-0006 đã merge (PR của bộ tài liệu này). Có thể làm song song với Issue 1–5 nhưng kết luận từng PR chỉ chốt khi phần thay thế tương ứng đã rõ.

**Phạm vi — lập bảng đề xuất để owner quyết trên từng mục; không tự đóng/merge:**

Live [Issue #37](https://github.com/cfotel2604/html-share-platform/issues/37) giới hạn phạm vi là đề xuất; cập nhật này thay wording cũ "thực thi". [Bảng xử lý](ADR0006_TRANSITION.md) và ghi chú kiến trúc trên từng mô tả PR/Issue giữ nguyên trạng thái/base/head gốc; đóng/thu hẹp hay thay runtime cần owner quyết riêng.
- PR #21 (ADR-0005): sửa trạng thái/tham chiếu để ghi nhận ADR-0006 supersede một phần, hoặc đóng kèm liên kết ADR-0006 — theo quyết định owner trên PR.
- PR #22: tách phần serving dùng lại cho Issue 5; phần API Worker/preview Worker bị thay thế — đóng hoặc thu hẹp, không merge nguyên trạng.
- PR #23: đóng/thay thế (đường D1-primary bị loại bỏ bởi Issue 4); giữ lại bằng chứng test còn giá trị vào tài liệu validation.
- PR #24: đối chiếu hạ tầng đã provision (R2/D1/Workers) với đích tái sử dụng D1/R2 và bỏ Worker quản trị/preview. Ghi rõ lịch sử, metadata chỉ đọc hiện tại và cutover/retirement chưa làm; cập nhật handoff. Không tự gỡ tài nguyên trong Issue6.
- PR #27: đóng/thay thế — #25 hết hiệu lực khi không còn API Worker; phần finalize bằng listing của #26 đã chuyển thành yêu cầu phía Node trong Issue 4.
- PR #29: phần tối ưu workspace/healthcheck được tiếp nhận trong Issue 4; phần gộp request qua Worker API bị thay thế.
- PR #19 và Issue #10: giữ mở; cập nhật tham chiếu để #10 phản ánh kiến trúc đích mới khi đánh giá gate.
- Issue #20: phần serving giữ, D1-primary/API/preview Worker ghi "superseded by ADR-0006"; Issue #25, #26, #28: đề xuất đóng/thay thế kèm lý do, liên kết Issue con và phân biệt source với runtime. Owner quyết đóng riêng; không tự đóng.
- Đồng bộ `PLAN.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_STATUS.md`, `docs/AI_HANDOFF.md` và `AGENTS.md` (mục pilot) theo ADR-0006 trong các PR tương ứng — ghi rõ phần nào mô tả lab cũ, phần nào mô tả kiến trúc đích.

**Acceptance:**
- [ ] Bảng xử lý có đề xuất, trạng thái quyết định owner + liên kết cho đủ PR #19, #21–#24, #27, #29 và Issues #10, #20, #25, #26, #28; không Draft PR mâu thuẫn ADR-0006 mà thiếu ghi chú kiến trúc. Không cần tự đóng/merge để đạt gate tài liệu này.
- [ ] Tài liệu trạng thái/handoff phản ánh đúng kiến trúc đích và việc còn mở.

## Issue 7 — Gate bảo mật, vận hành và nghiệm thu pilot A'

**Phụ thuộc:** Issue 1–5.

**Phạm vi:**
- Kiểm chứng bảo mật đường mới: token REST (phạm vi account, lưu trữ, rotate/revoke thử), D1 không chứa dữ liệu quản trị (quét thực tế), Worker không code path ghi/không secret quản trị, revoke propagation đo thực tế (projector khỏe và chết rồi hồi phục). Theo owner #36, native D1/R2 bindings vẫn có khả năng ghi; fixed SELECT/get/head + code/test/review/deploy gate bảo đảm read-only, không IAM. Phải kiểm cả legacy khi đánh giá gate dữ liệu D1, không chỉ bảng model mới. Quét dữ liệu/retirement/deploy là bước remote cần duyệt riêng; không suy quyền từ chuẩn bị #38 hoặc tự xóa legacy.
- Kịch bản sự cố: REST API lỗi/429 kéo dài; projector crash giữa chừng; D1 lệch; R2 object thiếu/lệch ETag — mỗi kịch bản có kết quả mong đợi fail-closed ở phía quản trị và không phục vụ sai nội dung ở phía public.
- Nghiệm thu pilot đầu-cuối: upload → publish → xem public (desktop + mobile/Zalo ở mức khả thi) → update giữ code → unpublish → revoke → rotate; VM tắt/bật; rebuild drill (Issue 3).
- Cập nhật runbook và ghi bằng chứng validation; liệt kê rõ gate nào của #10 còn mở sau pilot này (dự kiến: production Clerk/OAuth, domain/DNS production, cookie/browser matrix đầy đủ — không tự đóng #10).

**Acceptance:**
- [ ] Toàn bộ kịch bản sự cố có kết quả ghi lại; không kịch bản nào dẫn tới phục vụ nội dung đã revoke quá ngưỡng đã công bố, hoặc ghi nhận thành gate mở với mức rủi ro rõ ràng.
- [ ] Số liệu revoke propagation và độ trễ chiếu được công bố trong tài liệu validation.
- [ ] Owner nghiệm thu pilot và quyết định riêng về các bước tiếp theo; không có bước nào trong Issue này tự phê duyệt production.

---

## Thứ tự thực hiện đề xuất

1. Merge bộ tài liệu ADR-0006 (PR này) → tạo Epic và Issue 1–7 trên GitHub theo đúng nội dung trên.
2. Issue 1 và Issue 4 làm trước/song song (hai đầu của đường chiếu).
3. Issue 2 nối hai đầu; Issue 3 ngay sau Issue 2.
4. Issue 5 dùng schema + dữ liệu chiếu để hoàn thiện Worker duy nhất.
5. Issue 6 chạy xuyên suốt nhưng chốt khi Issue 2/4/5 rõ hình.
6. Issue 7 cuối cùng, trước mọi đề xuất pilot mở rộng hay production.
