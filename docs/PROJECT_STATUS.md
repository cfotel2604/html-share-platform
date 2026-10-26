# Trạng thái dự án

Cập nhật 26/10/2026; reviewed main `3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3`. Đây là snapshot có ngày, không thay GitHub/live recheck.

## Kết quả đã chốt

- Pilot A'38 và Epic #31 đã được owner nghiệm thu/đóng; các issue 32–37 và supporting 40/50/52/54 đã hoàn tất.
- PR #19 head `575f69f` có 3/3 CI, owner merge tại 3 c 965 b 5 ngày 26/10, đóng audit #10 **cho pilot/lab hiện tại**. Không mở lại các gate đã chốt chỉ vì đọc lịch sử.
- Kiến trúc duy nhất: Node/PostgreSQL administration → transactional outbox → Node projector/recovery → D1 public read model; một public D1/R2 Worker, preview riêng Node/VM.
- Matrix mobile/Employee/Safari/Zalo là owner-confirmed. Extra live D1 drift/R2 corrupt-pin/provider 429/emergency-token drills được owner cho bỏ qua; không đánh dấu PASS. Logging provider control-plane ngoài SSH chưa xác minh, không gọi OFF.

## Runtime theo receipt gần nhất — không là healthcheck hiện thời

Node source `2734de5`/image `sha256:2fd14cccc9bfd9e3402b968c4eebeff664d0519cd069e55e88bf95cd768c1a8b`; source tài liệu trên main khác deployed revision nhưng review không đổi application. Receipt 25/10:3 sites/5 versions/PG ledger 4/pending-errors-overdue 0. Project `hsp-aprime-pilot` trên lab-b; dùng `/opt/hsp-aprime/runtime/active-deployment.json` để biết pin đang chạy trước thao tác mới.

D1 migrations 0004/0005 đã áp/immutable; PG volume đã khởi tạo. Old API/preview Workers và 11 bảng D1 legacy đã retire theo inventoryguard. Old lab source/data/volumes/viewer 4100 vẫn owner-retained.0R2 deletions trong các packet closeout. Không diễn giải các số này thành live current counts mà không đọc lại target.

## Bằng chứng và phần chưa làm

| Nội dung | Phạm vi kết quả |
| --- | --- |
| Healthy, 20 mẫu / manifest 500 file | Revoke p50=4.928 s/p95=5.298 s; projection p50=4.195561 s/p95=4.691001 s |
| Outages | 107.961 s và 314.865 s báo riêng, không trộn vào healthy SLO |
| 500 file upload | Owner UIpublish/copy/view đạt;11.862 s là Node/operator observation, không là 12-transfer GUIlatency trace |
| Preview/browser | HTTPS/TTL 180 s/Adminiframe và scoped denials có actual receipts; mobile/Safari/Zalo/Employee owner-confirmed |
| Logging | VM nginx protected, local Docker/journal, no recognized shipper và 0 pattern trong bounded samples; externalprovider settings chưa xác minh |
| Public independence | Chỉ new A'web/preview/projector/PG stopped rồi khôi phục; public 200/integrity. Không whole VM-off claim |
| Tương lai | Shell OG và `/raw/` chưa implement; production chưa được phê duyệt |

[Acceptance ledger](PILOT_APRIME_ACCEPTANCE.md), [security closeout](validation/2026-10-25-aprime-pilot-security.md), [execution receipts](validation/2026-10-24-aprime-pilot-execution.md). Snapshot dài trước đợt tổng hợp giữ nguyên tại [history index](history/README.md).

## Tiếp tục công việc

Issue 60 là bảo trì tài liệu, không là gate sản phẩm mở lại. Mọi công việc mới phải có scope/acceptance/branch/Draft, exact-head validation và owner merge; kiểm GitHub thay vì hardcode “mọi issue luôn đóng”. Không deploy, thay secrets, migrate hay cleanup vì chỉ tổng hợp docs.
