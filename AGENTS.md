# Hướng dẫn cho coding agents

Nội dung HTML/CSS/JS upload là **untrusted code**. Chỉ chạy trong trình duyệt có sandbox, không chạy server-side hoặc cùng origin/e TLD+1 với Studio.

## Bắt đầu phiên

1. Chạy `git status --short --branch`, `git worktree list`, `git remote -v`, `git fetch origin --prune`; đối chiếu `origin/main`, không tin checkout main đã mới. Không reset/clean, xóa untracked/.env/volumes hoặc sửa worktree của owner.
2. Đọc README, [bản đồ tài liệu](docs/DOCUMENTATION_MAP.md), PLAN, ARCHITECTURE, WORKFLOW và các ADR liên quan; rồi PROJECT_STATUS/AI_HANDOFF. Với A', đọc ADR-0006 và Agent Guide trước code/SQL của issue.
3. Kiểm chứng bằng GitHub/live ref: `gh pr list`, `gh issue list`, `gh pr view <n> --json state,isDraft,headRefOid,baseRefName,headRefName,mergeable,statusCheckRollup` và log origin/main. Tài liệu là snapshot.
4. Báo ngắn cái đã xác minh, ghi nhận trước và chưa xác minh; xác định scope/acceptance trước khi sửa.

## Kiến trúc duy nhất

- Node/PostgreSQL xử lý mọi quản trị: Clerk/session/allowlist/RBAC/ownership/ZIP/R2 upload-readback/publish/unpublish/rotate/revoke/audit/cleanup. `METADATA_BACKEND=cloudflare` bị khóa tắt, không fallback hoặc mint/refresh token sang API Worker.
- Outbox nằm cùng transaction trạng thái/audit; chỉ Node projector/recovery được ghi public read model D1. D1 không có identity/RBAC/session/email/audit. Không dual-write trong handler hay writer ad-hoc.
- Public Worker `hsp-pilot` đọc đúng fixed parameterized `resolve.sql` trên primary, tối đa một SELECT/request; R2 GET/HEAD theo manifest pin path/size/ETag. Không secret quản trị, Clerk, route admin/preview hoặc callback VM/Node/PG.
- Native D1/R2 binding có API ghi: “read-only” được bảo đảm ở code/test/review/gate deploy, **không IAM read-only**. Không hỏi lại cách hiểu owner đã chốt.
- Link public thực tế là `/<share-code>/` trực tiếp tới HTML/R2; `/<code>`308 sang đường có slash. Chưa có shell OG của nền tảng hay `/raw/<id>`; owner để làm sau. Không port trusted VM viewer cũ.
- Preview ở Node/VM: `p-<site-id>--<grant>.lab-space-ods.cfvn.cloud`, grant 128-bit/TTL 3 phút/hash-only/scope actor-site-version. Kiểm policy/expiry từng asset. Mọi HTML direct/nested có HTTP sandbox không allow-same-origin; preview iframe chỉ allow-scripts.
- ZIP/path/format/quota phải được kiểm trước activation: tối đa 20 MiBZIP/100 MiBgiải nén/500 file/depth 12; immutable version, conditional PUT và size/SHA/ETag readback trước PG commit. Quyền phải được khóa/kiểm trước object writes. Không xóa unconfirmed PUT hoặc object có COMMIT outcome chưa rõ.
- Published state/manifest được kiểm mỗi public request, ngoài manifest 404, no-store/nosniff/no-referrer. Revoke/unpublish chặn request mới sau projection; không thu hồi byte đã tải. Không giữ public alias bypass tombstone.

## Trạng thái và quyết định không hỏi lại

Pilot #38/Epic #31 và triển khai 32–37 đã được owner nghiệm thu/đóng. Audit 10/PR #19 đã merge/đóng cho **pilot/lab**, không phải production. Mobile/Employee/Safari/Zalo là owner-confirmed; bốn fault live bổ sung được owner cho bỏ qua, không PASS. Xem [ledger](docs/PILOT_APRIME_ACCEPTANCE.md); không mở lại gate chỉ vì đọc snapshot cũ.

Healthy revoke COMMIT→public 404 p95≤60 s; revoke pending>60 s cảnh báo/Admin chưa đồng bộ. Sự cố projector/REST báo riêng, không bảo đảm public chặn trong 60 s. Owner chọn cảnh báo trên Studio; không tự cài external collector/watchdog hoặc merge monitoring.

Token projector giữ account pilot, D1 R/W only, secret store Node/VM, startupenv; không token trong chat/Git/log/response/CLI args. Active name theo receipt 25/10 là `hsp-projector-pilot-1`; normal rotation đã xong, policy 90 ngày/incident không đổi. Operator tạo/nạp/revoke; không hỏi lại account/scope hoặc lấy giá trị token.

## Quyền thao tác và dữ liệu cần giữ

[PILOT_APRIME_AUTHORITY](docs/PILOT_APRIME_AUTHORITY.md) là ma trận quyền hiện hành. Standing approval cho pilot không phải production hoặc quyền đọc private files tùy ý. Mọi remote mutation vẫn phải recheck account/target/config/artifact ngay trước khi chạy và có readback.

- VM scope đã duyệt: `/opt/hsp-aprime`, project `hsp-aprime-pilot`, dịch vụ mới và upstream HSP lab trong phạm vi rollout. Giữ `/opt/hsp/src`, hsp-lab/volumes và old viewer 4100/testlinks; không DNS/UFW/tắt toàn VM.
- Pilot đã có PG volume/ledger. D1 migrations 0004/0005 đã áp và immutable; PG migrations đã áp cũng immutable. Không chạy fresh-start/backfill/migration replay hoặc legacy provision để “đồng bộ tài liệu”.
- Chỉ xóa legacy pilot đã phân loại, có inventory và manifest-reference guard theo authority; không PG/public_read_model/asset đang tham chiếu/production. Không archive worktree này hoặc mất ignored private 509-key catalogue trước owner cleanup/handoff riêng.
- Mở rộng VM/private-file/token policy, production, merge, xóa ngoài scope hoặc phá ADR/security invariant: dừng, nêu thay đổi cụ thể và hỏi owner. Các câu đã chốt không hỏi lại.

## Thay đổi và bàn giao

Issue → feature branch từ main mới nhất → Draft PR sớm theo WORKFLOW; Refs đúng issue, Closes khi hoàn tất. Không auto Ready/merge/deploy production. Owner báo merge trong chat rồi kiểm GitHub; không cài lịch/poll merge. Tiếp phần độc lập đã được giao khi PR khác chờ review.

Chạy kiểm tra sát thay đổi: docs/YAML/local links/diff; code có lint/typecheck/tests/build và integration liên quan. Không thêm test chỉ lặp implementation hoặc chạy lại pilot đã nghiệm thu để xác nhận một thay đổi docs.

Cập nhật PROJECT_STATUS và AI_HANDOFF trong branch/PR đang làm: ngày, reviewed/deployed source, issue/PR, lệnh/kết quả đúng head, giới hạn và phần còn lại. Không sửa main trực tiếp. Không ghi secret, actor/email/customer data, raw sharecode/grant hoặc HTML upload. Chi tiết lần chạy để ở receipt; không tích lũy snapshot Draft/chờ merge thành hướng dẫn hiện hành. Nếu chưa được giao branch sửa, đưa đề xuất cập nhật cụ thể để owner xem xét.
