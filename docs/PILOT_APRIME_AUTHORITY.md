# Quyền hiện hành cho A' pilot/lab

Tổng hợp 26/10/2026, giữ nguyên các quyền/phạm vi owner đã chốt. Đây là ma trận authority, không tự cấp quyền mới. Chuỗi Fast-track/prepare-only/per-packet cũ đã được prompt hợp nhất A' thay thế; các prerequisite 49/48 đã hoàn tất, không là gate chờ hiện tại.

## Được làm trong phạm vi đã duyệt

| Phạm vi | Điều kiện bắt buộc |
| --- | --- |
| Cloudflarepilot CLI inventory/projector/rebuild, publichsp-pilot deploy/retireoldpilot Workers | Standing owner approval; đúng account/D1 hsp-pilot-desktop/R2 pilot/artifact/config, recheck ngay trước mutation và readback. Không dùng tài liệu như credential hoặc đổi target pin tự động |
| Bounded VM lab-b | `/opt/hsp-aprime`, project hsp-aprime-pilot, dịch vụ mới và upstream HSP lab theo rollout đã duyệt. Operator nạp secrets; không import old PG/D1 metadata |
| Read-only SSH logging audit | Owner đã giao kiểm VM nginx/Docker/tunnel/collector/resolver; chỉ booleans/counts, không raw logs/secret/grant. Cloudflareaccount/DNS analytics ngoài SSH không được suy tắt từ kết quả VM |
| LegacyD1 retirement | Đã hoàn tất 0005 theoinventory;0004/0005 immutable, không chạy lại |
| PilotR2 legacycleanup | Chỉ key đã phân loại legacy, có inventory, không được currentpublicmanifest tham chiếu; recheck references trước delete. Unknown/A'keys giữ nguyên, không bucketdelete |
| Code/docs task mới | Issue/featurebranch/Draft/exact headvalidation, owner review/merge. Không auto Ready/merge, không mergewatcher |

## Phải giữ / hỏi owner nếu vượt phạm vi

- Giữ `/opt/hsp/src`, old hsp-lab services/data/volumes, `view-lab.ods.vn`/old 4100/testlinks. Owner sẽ dọn riêng; không redirect sang A' hoặc làm fallback.
- PG/public_read_model/activeR2 manifest/production không được xóa. Không sửa appliedmigration, sequence/payload/tombstone hay nhập dữ liệu legacy để làm test “đạt”.
- Không DNS/UFW/tắt toàn VM, không runtime/privatefiles ngoài phạm vi đã giao. Không đọc/in/copy `.env` owner, session/cookie hoặc token; approved CLI/process env chỉ dùng nội bộ theo policy.
- Production, source merge, target/account replacement, token class/policy mới, deletion ngoài scope hoặc ADR/security exception cần owner decision. Authorization của một scope không lan sang scope khác.

## Quyết định đã chốt

Pilot #38/Epic #31 và audit #10/19 đã đóng; **pilot/lab acceptance không phải production approval**. Matrixmobile/Employee/Safari/Zalo owner-confirmed, extra liveD1 drift/R2 corrupt-pin/provider 429/emergencytokenfault omitted chứ không PASS. Không yêu cầu lại chỉ vì đọc snapshot cũ.

Healthy revoke p95≤60 s, pending>60 s cảnh báo/Admin chưa đồng bộ; outage có thể lâu hơn và phải báo riêng. Owner chọn Studio-onlypending/overdue/stale warning; không bắt cài externalcollector/watchdog và không có notificationpromise khi tab/VM/APIkhông hoạt động.

Projector token ở existingpilotaccount, D1 R/W only, riêng với Wrangler/dashboard/R2. Active name theo receipt 25/10 là hsp-projector-pilot-1, originalhsp-projector-pilot đã revoke;90 ngày hoặc incident rotation. R2 writer/read-onlyreader tách biệt/pilot bucket-only đã được owner xác nhận. Không hỏi lại policy hoặc gửi token qua chat.

Read-only native Worker được bảo đảm ở code/test/review/gate, không IAM read-only. Worker không mang secretquảntrị. Logging VM đã kiểm với giới hạn mẫu; providercontrol-plane vẫn unverified. [Ledger](PILOT_APRIME_ACCEPTANCE.md), [runbook](PILOT_APRIME_NODE_ROLLOUT.md), [history](history/README.md).
