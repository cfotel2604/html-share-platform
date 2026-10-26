> **Snapshot bằng chứng theo ngày/head.** Môi trường, số liệu và các câu “Draft/chưa/chờ” trong thân thuộc thời điểm đã ghi; không là trạng thái hay quyền vận hành hiện tại. Xem [status](../PROJECT_STATUS.md) và [bản đồ tài liệu](../DOCUMENTATION_MAP.md). Không chạy lại lệnh lịch sử trên pilot đang dùng.

# Review PR #15 để bắt đầu build lab — 2026-10-21

> Cập nhật sau sự cố 8.2.2: pin/image b1e dưới đây chỉ là lịch sử. Review và label check ban đầu thiếu kiểm quyền file với user runtime; image build dưới umask077 đã EACCES. Thay bằng fix/candidate `dc7560ea1c34cbe060779fbe69bb2f574e170431`, đã kiểm non-root actual image và CI restrictive-mode regression. [Hồ sơ #16](2026-10-21-runtime-permissions.md) ghi kết quả khắc phục/SQL checksums/rollback record. Không dùng lại image b1e; mapping DB chưa migrate/backfill.

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

## Owner hoàn tất 8.2.1 — đã xác minh SSH chỉ đọc

Owner gửi ảnh output image inspect và rollback record ngày 21/10. Agent xác nhận độc lập:

- Source detached HEAD đúng reviewed SHA `b1e3c26019443d434b620eec2382c45982396eb3`; chỉ compose.lab.yaml/compose.edge.yaml untracked, giữ nguyên.
- Candidate tag `html-share-studio:share-b1e3c2601944`, image ID `sha256:d51e137cdac7b674602a2c5e7520a0a8368d8e3e4def190f597a5c20e2846c66`; revision label khớp reviewed SHA.
- `tmp/share-cutover-images.txt`: previous SHA `417c50dcfdd30c6ec5b387b43b6fb61b5bcc2661`, previous web image `html-share-studio:security-417c50d`, candidate image đúng tag trên.
- Bốn Compose files base/security/lab/edge với SECURITY_IMAGE candidate chọn đúng image cho web/migrate/gateway. AUTH_MODE=clerk, trusted/public origins, HTTPS content domain/frame-src và PUBLIC_SITE_PORT rỗng giữ nguyên; storage không publish ports.
- Các container vẫn healthy; web/gateway còn image cũ `security-417c50d`, chưa recreate. Read-only DB vẫn 0001/0002, chưa site_share_links, 2 sites/2 versions.

Kết luận: 8.2.1 PASS; tiếp 8.2.2 theo đầy đủ runbook, trong cùng phiên Bash giữ SECURITY_IMAGE/hàm hsp. Bước này mới dừng web, ghi fingerprint metadata trước, explicit migrate/backfill, đối chiếu fingerprint và kiểm history thiếu=0; chỉ sang 8.2.3 khi các kiểm tra metadata/history PASS. Gateway tiếp tục phục vụ direct published content khi web dừng. Lượt xác minh này không chạy migrate/backfill/stop/restart, không xác nhận schema 0003 hay short links đã hoạt động.
