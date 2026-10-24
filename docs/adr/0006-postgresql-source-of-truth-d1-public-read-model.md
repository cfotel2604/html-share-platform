# ADR-0006: PostgreSQL trên VM là nguồn sự thật duy nhất; D1 là public read model

- **Status:** Accepted — owner chốt ngày 2026-10-24. Đây là phê duyệt *quyết định kiến trúc*, không phải phê duyệt release/production; các gate của Issue #10 vẫn áp dụng.
- **Date:** 2026-10-24
- **Refs:** #10, #20; Draft PR #21–#24, #27, #29 (xem mục Hệ quả với các PR đang mở).
- **Supersedes (một phần):** ADR-0005 `docs/adr/0005-path-sandbox-cloudflare-pilot.md` (Proposed, hiện chỉ có trong Draft PR #21, chưa lên `main`) ở các điểm: (1) "Worker API là metadata writer duy nhất vào D1", (2) "không dual-write/fallback về PostgreSQL trong pilot mode", (3) preview Worker riêng trên Cloudflare. Các phần còn lại của ADR-0005 về *serving* (path-based `/<code>/`, HTTP CSP sandbox, kiểm tra published/manifest ở mọi request, tombstone không hồi sinh) được **giữ nguyên** và dẫn lại trong ADR này.
- **Không thay đổi:** [ADR-0001](0001-public-site-origin-isolation.md) và [ADR-0004](0004-domains-and-share-codes.md) cho lab VM/hostname hiện hữu; [ADR-0002](0002-replaceable-studio-ui.md) về ranh giới Studio UI.

## Context

Pilot Cloudflare theo Issue #20 đã triển khai 3 Worker: API Worker (giữ toàn bộ logic quản trị: Clerk session, allowlist/role trong D1, ownership, finalize), public Worker và preview Worker; PostgreSQL bị loại khỏi pilot ("D1-only, no fallback"). Bằng chứng vận hành ngày 2026-10-23 cho thấy phần lớn độ phức tạp phát sinh từ việc đặt logic quản trị vào Worker, không phải từ nghiệp vụ:

- Issue #25 / PR #27: Clerk BAPI mint token thiếu `azp`, phải vòng qua `refreshSession` bằng cookie của đúng instance mới gọi được API Worker.
- Issue #26: finalize gói 500 file trong Worker phải né giới hạn CPU/subrequest (500 HEAD tuần tự).
- Issue #28 / PR #29: healthcheck và bootstrap của Studio tạo hàng nghìn Worker/D1 request khi không có người dùng (8.640 probe/ngày), và mỗi lần mở workspace lặp lại 2–3 vòng identity check qua Worker.

Trong khi đó lưu lượng ghi vốn thấp và nội bộ (vài nhân viên, tại VM), còn lưu lượng đọc public mới cần edge. Studio/Node trên Docker VM đã có sẵn: phiên Clerk đúng origin, PostgreSQL với transaction/CAS/audit/receipt đã nghiệm thu ở lab, và pipeline ZIP/R2 không bị giới hạn của Worker.

## Decision

1. **PostgreSQL trên Docker VM là database chính — nguồn sự thật duy nhất (source of truth).** Toàn bộ dữ liệu quản trị nằm ở PostgreSQL: user/allowlist/role, ownership, site, version, share code, audit log, idempotency receipt, trạng thái publish/unpublish/revoke. Không hệ thống nào khác được coi là nguồn sự thật cho các dữ liệu này.
2. **Toàn bộ logic quản trị ở Studio/Node trên VM.** Clerk đăng nhập/session, allowlist và RBAC Employee/Admin, kiểm tra ownership, validate HTML/ZIP (20 MiB nén / 100 MiB giải nén / 500 file / depth 12), upload create-only vào private R2 + readback SHA-256/size/ETag, publish/unpublish/rotate/revoke, cleanup — tất cả thực hiện trong Node và commit bằng transaction PostgreSQL. **Không còn API Worker quản trị** (`hsp-pilot-api` bị loại bỏ khỏi kiến trúc đích).
3. **D1 chỉ là public read model.** D1 chứa đúng dữ liệu tối thiểu để phục vụ người xem, không chứa dữ liệu quản trị: ánh xạ `share_code → site_id, status (published/unpublished/revoked), active_version, manifest (danh sách asset: path, R2 key, size, ETag), projection_version, updated_at`. Không lưu email, allowlist, role, audit, session hay bất kỳ dữ liệu định danh nào vào D1.
4. **Chỉ một Worker công khai: `hsp-pilot`.** Worker này chỉ làm: tra read model trong D1 (đọc primary, không read replica — xem điểm 7), kiểm tra code còn `published` và chưa revoke, đọc asset từ private R2 theo manifest đã pin size/ETag, trả nội dung kèm security headers theo đặc tả serving của ADR-0005 (HTTP CSP `sandbox allow-scripts` không `allow-same-origin`, `no-store`, `nosniff`, `no-referrer`; chỉ relative assets và đường dẫn có trong manifest; còn lại 404). Worker **không** chứa logic quản trị, không gọi Clerk, không giữ service token gọi về VM, không ghi D1/R2.
5. **Đồng bộ một chiều PostgreSQL → D1 bằng transactional outbox, không dual-write.** Transaction PostgreSQL thay đổi trạng thái public (publish, unpublish, revoke, rotate code, đổi active version) đồng thời ghi một sự kiện vào bảng outbox trong **cùng transaction**. Một projector chạy trong Node (background job) đọc outbox theo thứ tự, đẩy lên D1 qua Cloudflare REST API bằng **một batch idempotent cho mỗi sự kiện**, rồi đánh dấu đã chiếu (projected) kèm thời điểm. Request quản trị không bao giờ ghi thẳng vào D1 ngoài cơ chế outbox này.
6. **Chống chiếu ngược/lệch (stale projection).** Mỗi bản ghi read model có `projection_version` đơn điệu lấy từ revision/số thứ tự sự kiện của PostgreSQL. Câu ghi D1 phải có điều kiện chỉ áp dụng khi `projection_version` mới lớn hơn bản hiện tại (guard trong SQL), để retry, chạy song song hoặc replay sự kiện cũ không thể ghi đè trạng thái mới hơn — đặc biệt không thể làm một code đã revoke "sống lại".
7. **Tính nhất quán của revoke là gate, không phải giả định.** Read model D1 phải tắt read replication hoặc Worker phải đọc primary, để trạng thái vừa chiếu không bị đọc trễ từ replica. Thời gian từ lúc transaction revoke commit ở PostgreSQL đến lúc Worker trả 404 phải được đo và công bố (mục tiêu đề xuất: p95 ≤ 60 giây khi projector khỏe; xem [kế hoạch](../D1_READ_MODEL_PLAN.md)) và có cảnh báo vận hành khi có sự kiện revoke chưa được chiếu quá ngưỡng. Khi projector/REST API lỗi, sự kiện nằm lại trong outbox và tự khôi phục — không mất sự kiện, nhưng phải hiện rõ trạng thái "chưa đồng bộ" cho Admin thay vì im lặng.
8. **D1 có thể xây lại hoàn toàn từ PostgreSQL.** Phải có công cụ rebuild read model (chiếu lại toàn bộ site đang có hiệu lực public từ PostgreSQL, có dry-run diff trước khi áp dụng) và quy trình đối chiếu (reconciliation) định kỳ/theo lệnh. D1 hỏng, lệch hoặc bị ghi sai đều xử lý bằng rebuild, không sửa tay làm nguồn sự thật và không bao giờ ghi ngược từ D1 về PostgreSQL.
9. **Preview không nằm trong Worker public.** Preview site chưa publish thực hiện ở phía VM/Studio theo cơ chế grant ngắn hạn của lab (ADR-0003). Nếu sau này cần preview trên Cloudflare, phải có ADR riêng; không tự gộp preview Worker trở lại và không nới lỏng ranh giới của điểm 4.
10. **Token Cloudflare REST là secret quản trị, có phạm vi nổ nhỏ nhất có thể.** Token dùng cho projector chỉ để trong secret store của Node trên VM, không xuống browser, không vào Git/log/response. Ưu tiên account Cloudflare riêng cho pilot để giới hạn phạm vi (token D1 không phân quyền theo từng database). Có kế hoạch rotate/revoke token; rò token phải được coi là sự cố bảo mật. Mọi thao tác ghi D1 khác (migration read model, rebuild) cũng đi qua cùng kỷ luật secret này.

## Làm rõ binding chỉ đọc — owner chốt 2026-10-24, Issue #36 / PR #44

“Chỉ đọc” của Worker được bảo đảm bằng **code/test/review và gate deploy**, không phải IAM chỉ đọc ở cấp native binding. Native D1/R2 bindings vẫn có API ghi. Worker chỉ dùng đúng SELECT tham số hóa từ `resolve.sql` theo share_code/status published; R2 chỉ GET/HEAD theo manifest pin path/size/ETag. Không SQL động, INSERT/UPDATE/DELETE/batch ghi, R2put/delete, route quản trị hoặc secret quản trị. CI phải chặn API ghi bằng quét tĩnh và kiểm thử phủ định. Đây là làm rõ cách hiểu, **không phải ngoại lệ ADR-0006**; không cấp quyền deploy pilot. Không gọi facade/type hoặc native binding là IAM read-only.

## Sơ đồ đích

```text
Người quản trị
      │
      ▼
Studio / Node — Docker VM
  ├─ Clerk: đăng nhập, kiểm session/user
  ├─ PostgreSQL (source of truth): allowlist, ownership,
  │    idempotency, audit, trạng thái site/share code
  ├─ Kiểm tra HTML/ZIP, upload + readback private R2
  └─ Transaction trạng thái + outbox ──► Projector (Node)
                                              │ Cloudflare REST API
                                              │ 1 batch idempotent / sự kiện
                                              ▼
                                     D1 — public read model
                                              │
Người xem                                     ▼
      └────────────────────────────► hsp-pilot Worker (duy nhất)
                                        ├─ Kiểm code published, chưa revoke
                                        ├─ Đọc manifest trong D1
                                        ├─ Đọc private R2
                                        └─ Trả HTML + security headers
```

Đường đọc public **không** phụ thuộc VM/Node/PostgreSQL đang chạy: VM tắt, site đã publish vẫn phục vụ từ D1 + R2. Đổi lại, thay đổi quản trị (kể cả revoke) chỉ có hiệu lực public sau khi projector chiếu xong — độ trễ này được quản lý bằng điểm 7.

## Consequences

**Được:**

- Loại bỏ cả lớp vấn đề của #25 (mint/refresh token cho API Worker), phần lớn #26 (finalize trong giới hạn Worker) và #28 (identity pass lặp + idle polling qua Worker): các thao tác đó trở về Node/PostgreSQL local.
- Một Worker duy nhất để deploy, quan sát và rollback ở phía Cloudflare; bề mặt quản trị lộ ra Internet giảm xuống còn Studio/VM.
- Transaction, CAS, audit và receipt giữ nguyên ở PostgreSQL — nơi đã có bằng chứng nghiệm thu — thay vì tái hiện trong D1.
- Read model tối thiểu làm giảm dữ liệu nhạy cảm phía edge; D1 mất/lệch không mất dữ liệu gốc.

**Phải trả:**

- Có độ trễ chiếu giữa PostgreSQL và public (điểm 7). Publish/revoke không tức thời như đọc thẳng database chính; đây là đánh đổi có ý thức để lấy tính độc lập của đường đọc.
- Projector là thành phần vận hành mới: cần giám sát độ trễ outbox, retry/backoff, cảnh báo và runbook (xem kế hoạch triển khai).
- Phần lớn công của PR #23 (tích hợp D1-primary) và API Worker trong PR #22 không còn dùng ở dạng hiện tại; schema D1 và public/preview serving trong #22 được tái sử dụng một phần sau khi cắt bỏ phần quản trị/preview. Các PR stacked #21–#24, #27, #29 **không được merge nguyên trạng**; việc xử lý từng PR (đóng, tách phần dùng lại, thay thế) nằm trong kế hoạch triển khai và cần quyết định của owner trên từng PR.
- Token REST trên VM có quyền ghi D1 ở mức account (điểm 10) — không có lớp policy ứng dụng phía Cloudflare nữa; Node/projector là nơi thực thi policy duy nhất cho đường ghi này.

## Alternatives considered

- **A (gốc) — D1 là database chính, Node truy vấn mọi thứ qua Cloudflare REST API:** loại bỏ. Đưa API quản trị của Cloudflare vào mọi đường thao tác ứng dụng (rate limit toàn cục của API token, latency mỗi call, batch không có quyết định giữa chừng), Studio đọc thường xuyên cũng phải qua REST, và token ghi D1 trở thành chìa khóa của toàn bộ hệ thống thay vì chỉ của read model.
- **Worker gọi PostgreSQL qua Workers VPC + Hyperdrive/Tunnel:** loại bỏ làm đường đọc public chính. Về kết nối là khả thi và chính thống, revoke nhất quán tức thời; nhưng mỗi lượt xem public lại phụ thuộc VM, tunnel và PostgreSQL đang sống, và latency nhân theo số asset — mất tính độc lập của đường đọc mà read model mang lại. Giữ làm phương án dự phòng/đối chứng khi cần kiểm chứng dữ liệu, không phải kiến trúc đích.
- **B — Bỏ D1, Worker chỉ đọc manifest/pointer trong R2:** khả thi và đơn giản, nhưng thêm một lần đọc R2 cho mỗi request, việc tra cứu/chiếu trạng thái tập trung kém rõ ràng hơn read model có schema và `projection_version`, và đối chiếu/rebuild khó quan sát hơn. Không chọn; xem lại nếu read model D1 phát sinh chi phí vận hành không tương xứng.
- **Giữ nguyên 3 Worker (API/public/preview) theo ADR-0005:** loại bỏ vì bằng chứng vận hành ở phần Context.

## Validation / revisit

Quyết định này được coi là đã triển khai đúng khi các bằng chứng sau tồn tại (chi tiết và acceptance trong [D1_READ_MODEL_PLAN.md](../D1_READ_MODEL_PLAN.md) và hướng dẫn thực thi trong [D1_READ_MODEL_AGENT_GUIDE.md](../D1_READ_MODEL_AGENT_GUIDE.md)):

- Publish một site từ Studio → nội dung xuất hiện qua `hsp-pilot` chỉ sau khi sự kiện outbox được chiếu; unpublish/revoke → Worker trả 404 trong ngưỡng thời gian đã đo và công bố.
- Tắt VM/Node/PostgreSQL: site đã publish vẫn phục vụ; bật lại: outbox tồn đọng được chiếu hết, không mất/không trùng hiệu lực.
- Rebuild D1 từ PostgreSQL trên môi trường trống cho kết quả trùng khớp; reconciliation phát hiện được lệch cố ý.
- Worker không có code path ghi theo mục làm rõ binding chỉ đọc, không có secret quản trị, không endpoint quản trị; D1 không chứa dữ liệu ngoài danh mục ở điểm 3. Native capability vẫn rộng hơn code và không được mô tả là IAM read-only.
- Xem lại ADR nếu: cần revoke tức thời dưới ngưỡng projector không đạt được, preview trên Cloudflare trở thành yêu cầu, hoặc quy mô ghi tăng tới mức REST API của D1 thành nút thắt đo được.
