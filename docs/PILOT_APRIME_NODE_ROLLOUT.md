# Vận hành Node/PG A' pilot đã khởi tạo

Đây là runbook **bảo trì hệ thống đang chạy**, không còn là đề xuất tạo mới. Setup một lần đã thực hiện trong 48/49 và pilot đã nghiệm thu. [Kế hoạch/commands ban đầu](history/README.md) là lịch sử; không chạy lại tạo volume/migration/bootstrap theo bản đó.

## Target và source of truth

| Thành phần | Reference |
| --- | --- |
| Host/project/root | lab-b / hsp-aprime-pilot / `/opt/hsp-aprime` |
| Pin/runtime config | `/opt/hsp-aprime/runtime/active-deployment.json`: source, image, pin env và đường dẫn Compose hiện hành; metadata này không chứa token |
| Studio | Owner tunnel → edge alias hsp-aprime-studio:3000; web host loopback 3110 |
| Preview riêng | Exact p-grant hostname → map đóng nginx 4110; preview ngoài network edge |
| PostgreSQL | Existing named volume, không cổng public trên host, ledger đã khởi tạo |
| Projector | process env Node secret store, credential D1 riêng, ngoài network edge; web/preview/migrate không D1 credential |
| Old lab | Source `/opt/hsp/src`/old hsp-lab/old viewer 4100 giữ nguyên, không là fallback |

Receipt gần nhất source `2734de5`/image `2fd14ccc` không thay việc đọc active pointer trước operation. Main/revision tài liệu không nhất thiết là image đã deploy. Không dùng root candidate.env hoặc startup pins cũ làm cấu hình hiện hành.

## Trước khi thay dịch vụ mới

1. Scope phải nằm trong [authority](PILOT_APRIME_AUTHORITY.md). Review fresh main/issue/PR/exact-head CI và artifact thực tế; source dùng để build phải đúng bytes Git, không chứa `.env`, Wrangler state hoặc dữ liệu upload.
2. Read-only kiểm active pointer/image dịch vụ/health, PG ledger checksums/volume/DB + migrate IDs, queue và fixture của owner. Có hoạt động quản trị đồng thời thì chọn cửa sổ phù hợp, không cưỡng ép trạng thái để pass.
3. Recheck account/target/config/artifact/replication ngay trước remote mutation. Thay image Node không là lý do apply D1/PG migration hoặc redeploy Worker.
4. Build/pin image bất biến ở task-owned directory mới, nonroot/read-only/no-network actual projector/recovery import probe; giữ deployment trước receipt. Không ghi đè source/config/image pin của owner.
5. Operator secret store được consume nội bộ. Dùng `config --quiet`, không in Compose đã expand/Config.Env/secret trong log. [Vai trò secret](PILOT_APRIME_SECRET_SETUP.md).

## Cập nhật ứng dụng trong project mới

Operator dựng Compose invocation với đúng project, env từ secret store đã bảo vệ, **reviewed** pin env và hai file `deploy/compose.aprime-pilot.yaml`/`compose.aprime-edge.yaml` từ source đã review. Không copy placeholder vào shell hoặc dùng local Compose cho VM.

```text
<verified compose invocation> config --quiet
<verified compose invocation> up --detach --no-deps --wait --wait-timeout 120 web preview projector
```

`--no-deps` là bắt buộc để không khởi động migrate/db theo dependency. Không `compose start projector` khi nó có thể kéo dependencies; nếu stop/start chỉ một dịch vụ trong drill được giao, dùng container ID đã xác minh với cleanup khi thất bại. Không `down`, `down --volumes` hoặc khởi tạo mới trên project đã khởi tạo.

Sau update: đúng image/revision/role/network alias, db/web/preview healthy/projector running; DB + migrate IDs/PG ledger/data/link/outbox trạng thái được giữ hoặc mọi thay đổi có giải thích. Kiểm fixture public integrity và revoked 404, preview theo scope, old lab/nginx/testlinks không đổi; active pointer chỉ đổi sau guard/readback. Lưu source/image/archive/hash/CI/commands và giới hạn không kèm code/grant/identity/token.

## Ingress, rollback và incident

Nginx HSP dùng map đóng exact p-grant→4110/legacy mặc định→4100, không retry sang legacy sau 404. Các access log HSP off, cả 3 error log được bảo vệ; bất kỳ thay nginx nào phải nằm đúng scope, có backup được bảo vệ/fingerprint/nginx-T/reload có kiểm soát và readback. Không đụng DNS/UFW/tunnel hoặc app khác do đang đổi image Node.

Rollback dùng bản trước đã giữ source/image/pin theo cùng guards; không reset PG volume, xóa outbox pending/tombstones, sửa applied SQL hay khôi phục API/preview Worker/legacy backend. Nếu image mới chưa pass, giữ runtime cũ; đừng tự “sửa nhanh” bằng data changes.

Projector lag/recovery theo [PUBLIC_PROJECTOR](PUBLIC_PROJECTOR.md)/[READ_MODEL_RECOVERY](READ_MODEL_RECOVERY.md). Rotation token do operator theo policy, không nằm trong một rollout app thường. Public có thể giữ state đã chiếu trong outage; ghi thực tế lag/queue/restore/containment riêng, không 60 s trong outage guarantee.
