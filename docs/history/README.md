# Lịch sử tài liệu trước đợt tổng hợp26/10/2026

Các link dưới đây cố định ở main `3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3` trước Issue60. Toàn bộ nội dung cũ vẫn còn nguyên trong Git, gồm chronology/status/commands/evidence; không cần nhân bản một cây tài liệu cũ vào lối vào hiện hành.

**Chỉ đọc theo ngày/head/môi trường của bản cũ.** Một lệnh fresh-start, migrate/backfill, provision, cleanup, deploy hoặc rollback trong đó không cấp quyền chạy nó trên pilot đã khởi tạo. Không restore MinIO/VMviewer/API/previewWorker/D1primary hoặc sửa appliedSQL từ lịch sử. [Bản đồ hiện hành](../DOCUMENTATION_MAP.md), [Node runbook](../PILOT_APRIME_NODE_ROLLOUT.md), [authority](../PILOT_APRIME_AUTHORITY.md).

## Bản gốc cố định

| Tài liệu trước tổng hợp | Nội dung giữ để tra cứu |
| --- | --- |
| [AGENTS.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/AGENTS.md) | Chuỗi gate/authority/snapshot trước tổng hợp |
| [PLAN.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/PLAN.md) | Roadmap P0–P7 và quyết định theo mốc |
| [README.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/README.md) | P1/localMVP/VMviewer/UI-only commands và status tích lũy |
| [docs/ADR0006_TRANSITION.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/docs/ADR0006_TRANSITION.md) | Proposal và so sánh resource trước cutover |
| [docs/AI_HANDOFF.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/docs/AI_HANDOFF.md) | Toàn bộ handoff theo issue/merge |
| [docs/ARCHITECTURE.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/docs/ARCHITECTURE.md) | Contract/runbook trước tổng hợp, giữ nguyên provenance |
| [docs/D1_PUBLIC_READ_MODEL.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/docs/D1_PUBLIC_READ_MODEL.md) | Contract/runbook trước tổng hợp, giữ nguyên provenance |
| [docs/D1_READ_MODEL_AGENT_GUIDE.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/docs/D1_READ_MODEL_AGENT_GUIDE.md) | Contract/runbook trước tổng hợp, giữ nguyên provenance |
| [docs/LAB_HANDOFF.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/docs/LAB_HANDOFF.md) | Old hsp-lab/runtime/overlays/source pins |
| [docs/MERGE_PLAN.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/docs/MERGE_PLAN.md) | Stack merge13/15/18 lịch sử |
| [docs/NODE_POSTGRES_ADMIN.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/docs/NODE_POSTGRES_ADMIN.md) | Contract/runbook trước tổng hợp, giữ nguyên provenance |
| [docs/PILOT_APRIME_ACCEPTANCE.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/docs/PILOT_APRIME_ACCEPTANCE.md) | Preparation packets/blank ledger trước thực thi |
| [docs/PILOT_APRIME_AUTHORITY.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/docs/PILOT_APRIME_AUTHORITY.md) | Contract/runbook trước tổng hợp, giữ nguyên provenance |
| [docs/PILOT_APRIME_NODE_ROLLOUT.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/docs/PILOT_APRIME_NODE_ROLLOUT.md) | Kế hoạch48/setup một lần, không chạy lại |
| [docs/PILOT_APRIME_SECRET_SETUP.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/docs/PILOT_APRIME_SECRET_SETUP.md) | Initial operator-secret handoff, không ghi đè secretstore |
| [docs/PROJECT_STATUS.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/docs/PROJECT_STATUS.md) | Toàn bộ chronology trạng thái |
| [docs/PUBLIC_PROJECTOR.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/docs/PUBLIC_PROJECTOR.md) | Contract/runbook trước tổng hợp, giữ nguyên provenance |
| [docs/PUBLIC_READ_MODEL_WORKER.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/docs/PUBLIC_READ_MODEL_WORKER.md) | Contract/runbook trước tổng hợp, giữ nguyên provenance |
| [docs/READ_MODEL_RECOVERY.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/docs/READ_MODEL_RECOVERY.md) | Contract/runbook trước tổng hợp, giữ nguyên provenance |
| [docs/SECURITY_LAB.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/docs/SECURITY_LAB.md) | Old lab auth/origin/cert/test setup |
| [docs/SHARE_LINKS.md](https://github.com/cfotel2604/html-share-platform/blob/3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3/docs/SHARE_LINKS.md) | Viewer10base62/migration0003/backfill cũ |

## Bằng chứng vẫn ở vị trí hiện tại

`docs/validation/` và `docs/reviews/` không bị viết lại thành trạng thái mới. Thân các Markdown receipt được giữ nguyên; chỉ thêm nhãn snapshot/không phải runbook. JSON/CSV/số đo không thay đổi. Tên ngày cũ, Draft/pending trong thân và outcome failed/inconclusive vẫn là dữ kiện của lần chạy đó.

ADR là decision record với phạm vi riêng: không đổi Proposed thành Accepted chỉ vì gom docs hoặc đóng pilot. Các note26/10 trỏ về implementation A' và phân biệt old domain/viewer semantics với current public Worker. [Accepted ledger](../PILOT_APRIME_ACCEPTANCE.md) là tổng hợp evidence labels; GitHub/live check vẫn quyết định trạng thái hiện tại.
