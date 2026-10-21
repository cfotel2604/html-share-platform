# Review PR #15 để bắt đầu build lab — 2026-10-21

## Commit và phạm vi

- Reviewed head: `b1e3c26019443d434b620eec2382c45982396eb3` trong [PR #15](https://github.com/cfotel2604/html-share-platform/pull/15), base `4ac96894b3ac75d0a80c7190d8c70d1c00602a61` (#13).
- Review kỹ thuật diff short-link/schema/backfill/API/viewer/Studio/test wiring, đối chiếu auth-policy và ingest hiện có. Không thay thế security/release review toàn #13/#8/#10, real-domain E2E, R2/mobile/pilot hoặc owner merge approval.
- Kết quả: chưa phát hiện finding chặn việc lấy source/build candidate cho lab trong phạm vi đã review. Tiếp tục bước 8.2.1 của runbook operator bằng đúng SHA trên; không tự đổi sang HEAD mới chỉ vì có commit docs mới.

## Các ranh giới đã đối chiếu

Migration 0003 additive, primary key exact-case/case-sensitive, một active code/site và revoked tombstones; không sửa 0001/0002. CSPRNG uniform/collision retry bounded. Upload tạo mã trong transaction và update giữ mapping; lock actor/policy + site, Employee owner-only/Admin, atomic audit/rotation, rollback và lost COMMIT fail closed/refresh. Backfill khóa site rồi đọc history fresh, không tái bật revoked, không ghi storage hoặc sửa owner/site/version.

Viewer chỉ active code + published/active version, aliases host ID bị tắt; shell không Clerk, dynamic/no-store/no-referrer và iframe sandbox không allow-same-origin. Gateway/preview/auth-policy không đổi trong diff #15. Budget trước DB là mỗi process, chưa per-IP/distributed; giới hạn này vẫn cần edge policy trước pilot. Canonical URL do server sinh, UI không fallback host ID và reset trạng thái copied khi code đổi; typed adapter giữ session/same-origin boundary.

Đối chiếu thêm tests: collision/tombstone/history, concurrent backfill/rotation, denied ownership/fresh policy, audit failure, unknown COMMIT, published/revoked/deleted viewer, metadata/storage preservation, DTO/adapter và browser lifecycle/origin probes. Đây là đọc code/test + xác minh checks; không khẳng định đã chạy lại browser hoặc integration trên VM trong lượt review.

## Bằng chứng kiểm tra

- Local ngày 21/10: 86/86 unit, lint, typecheck và docs check PASS; worktree sạch trước ghi nhận review. Không cần sửa runtime code sau review.
- GitHub tại reviewed head: cả 3 jobs SUCCESS — [application](https://github.com/cfotel2604/html-share-platform/actions/runs/39589448750), [docs](https://github.com/cfotel2604/html-share-platform/actions/runs/39589448706), [security integration](https://github.com/cfotel2604/html-share-platform/actions/runs/39589448710). Integration gồm 9 upload + 6 auth/origin + 5 short-link groups.
- [Browser/candidate proof trước đây](2026-10-09-short-viewer-links.md) và [public origins lab](2026-10-21-lab-public-origins.md) giữ lịch sử riêng; không suy CI/minio/self-signed local thành mọi release gates đã đạt.

Runbook operator ngoài Git đã ghim TARGET_SHA vào mục 8.2.1. Bước này fetch/check source và build image có revision label; chưa migrate/backfill/recreate runtime. Bước 8.2.2 mới dừng web/chạy migration/backfill, 8.2.3 bật web và nghiệm thu. Khi build xong đối chiếu image revision với reviewed SHA; rollout/rollback theo [SHARE_LINKS](../SHARE_LINKS.md), không bật lại aliases bằng binary cũ sau revocation.
