# Tổng hợp tài liệu A' — 26/10/2026

Snapshot bảo trì tài liệu cho Issue60 / DraftPR61, reviewed main `3c965b53f6d8dbed5715dbdccb8e6463b96b2ce3`. Source of truth của implementation vẫn là code/SQL đã nghiệm thu; không thay architecture, publiccontract, authority hoặc các quyết định owner.

## Đã sửa

- Lối vào README/AGENTS/PLAN/ARCHITECTURE/PROJECT_STATUS/AI_HANDOFF được viết lại theo A' thực tế. Bỏ chronology/pendinggate trái trạng thái khỏi hướng dẫn hiện hành.
- Bản đồ tài liệu phân biệt currentguidance, operatingrunbook, completeddesign, evidence snapshot và history. Localdevelopment/CI không bị mô tả là rolloutpilot.
- Runbook đã khởi tạo dùng active-deployment pointer, verifiedartifact/no-deps, DB+migrateID/ledger preservation; không lặp bootstrap/freshvolume/migration/backfill. LegacyLAB/SECURITY/MERGE entrypaths còn tồn tại nhưng chỉ dẫn về history/currentrunbook.
- Contract link/Node/Worker/projector/recovery mô tả code đã có: directWorker/<code>/, Nodegrantpreview; chưa shellOG hoặc /raw. Nativebindingcode-read-only không IAM; status/revoke sau projection, không chỉ viewer.
- Owneraccepted38/31/10 và actual/owner-confirmed/local/omitted/unverified labels giữ nguyên. Production riêng, providerlogging ngoàiSSH chưa xác minh; không gọi omitted/unverified là PASS.

## Bảo toàn lịch sử

[Historyindex](../history/README.md) trỏ bảnGit cố định của các trang trước rewrite; originalbody/hash được ghi trong [provenanceJSON](2026-10-26-documentation-consolidation.json). Không mất chronology hoặc các commands cũ, nhưng chúng không còn là lối vận hành hiện tại.

39receipt/review/ADR/plan Markdown chỉ thêm nhãn phạm vi. Kiểm tra thân đã normalizeUTF8/newlines vẫn là nguyên văn suffix của Gitblobbase; số liệu/outcome/môi trường không đổi. ExistingJSON/CSV không sửa; appliedSQL/app/config/package/tests không đổi. ADRstatuses không được tự nâng Accepted.

## Kiểm tra và giới hạn

Chạy `python scripts/check_docs.py`, `python scripts/check_yaml.py`, kiểm mọi localMarkdownlink tracked/new, so thân39record với base và `git diff --check`. Final exact-head counts/CI trong PR61. Không viết test product mới cho sửa docs, không chạy lại Docker/VM/Cloudflare/livefault.0runtime/secret/data/deletionoperations; preserve worktrees/ignoredprivatecatalogue/.env/volumes.

Đây là docsconsolidation, không là một featureOG/raw hoặc productionreadinessreview mới. Tình trạngGitHub luôn cần kiểm lại cho task sau; không hardcode nhãn Draft của PR này vào README. Rollback: revert docs của PR nếu owner yêu cầu, không reset data hoặc phục hồi legacyarchitecture.
