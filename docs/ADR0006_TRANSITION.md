# Disposition A' — đã thực hiện

Tổng hợp 26/10/2026 sau PR #19 merged tại 3 c 965 b 5. Không là bảng đề xuất đang chờ owner; [proposal gốc](history/README.md) và [receipt nguyên nhân/trạng thái](validation/2026-10-24-legacy-closeout.md) giữ provenance.

| Nhóm | Kết quả / replacement |
| --- | --- |
| PR21/22/23/24/27/29 | CLOSED unmerged/superseded; không deletedrefs hoặc resurrectcode. Node admin 41/outbox 42/recovery 43/public Worker 44 thay D1 primary/API-preview/tokenbridge |
| Issues 20/25/26/28 | CLOSED not_planned/superseded; bằng chứng cũ giữ đúng môi trường/ngày |
| PR 47 | CLOSED superseded bởi docs 59; receipt lịch sử được giữ, không mergeoldbranch |
| 32–38/Epic #31 | Completed/owner accepted; publiccutover/Node preview/provider evidence có ledger riêng |
| 40/50/52/54 | Completed; dependency/boundedupload/previewnamespace giữ trong implementation |
| Audit 19/10 | Owner merge 26/10, completed cho acceptedpilot/lab; không production clearance |

Chọn A' khi tài liệu cũ xung đột: chỉ Node/PGquảntrị, public WorkerD1/R2 reader và Nodegrantpreview. Không giữ dualpath/legacyimport hoặc port VM viewer/OG như tính năng mới. Useful sandbox/manifest/serving requirements đã có trên main; không cần mở branchabandoned để nhập lại.

Old lab/viewer 4100/source/data/volumes được owner giữ; source trackerclosure không cấp quyền xóa/tắt chúng. Remote resource retirement và applied SQL 0004/0005 có [execution receipts](validation/2026-10-24-aprime-pilot-execution.md), không replay. [Authority](PILOT_APRIME_AUTHORITY.md) giữ boundary và [acceptance](PILOT_APRIME_ACCEPTANCE.md) giữ omissions/unverified.
