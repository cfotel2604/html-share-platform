# Handoff A' hiện hành

Reviewed 26/10/2026 tại main `3c965b5` sau owner merge #19; dùng cùng [PROJECT_STATUS](PROJECT_STATUS.md), [DOCUMENTATION_MAP](DOCUMENTATION_MAP.md), [AGENTS](../AGENTS.md). Đây không là dòng lệnh triển khai.

## Bắt đầu từ đâu

Fetch origin/prune, kiểm status/worktrees/remotes và GitHub exact head/checks. Primary checkout của owner có thể rất cũ; không reset/clean hoặc cập nhật nó thay owner. Chỉ dùng branch/worktree agent đã được giao. Quy trình chi tiết ở WORKFLOW; code/SQL nguồn ở ADR-0006 và các contract, không ở snapshot cũ.

## Đã hoàn tất

Owner nghiệm thu pilot #38/Epic #31; children 32–37 và supporting 40/50/52/54 đóng. PR #19 merged tại 3 c 965 b 5 đóng 10 cho pilot/lab, không phải production. Không hỏi lại matrix/threshold/token scope hoặc diễn tập lại extra fault đã được cho bỏ qua. Phạm vi/giới hạn bằng chứng giữ đúng [ledger](PILOT_APRIME_ACCEPTANCE.md).

Current source behavior: public Worker trực tiếp `/<share-code>/`/manifestassets với HTTP sandbox; không trustedshell OG, không `/raw`, không public Node/viewer fallback. Preview Node là p-prefixed grant 128-bit/3 phút/actor-site-version. Nếu owner giao shell OG sau này, mở thay đổi contract/code riêng; docs hiện tại không triển khai tính năng đó.

## Những thứ cần giữ

- Runtimepin gần nhất: source `2734de5`/image `2fd14ccc`. Đọc active-deployment.json và recheck trước thao tác; không dùng candidate.env/initial-pin cũ làm source of truth.
- Existing PG volume/ledger, D1 applied 0004/0005, orderedoutbox/tombstones, all versions/assets. Không fresh-start/backfill/reapply hay migration sửa tại chỗ.
- Old `/opt/hsp/src`, hsp-lab services/data/volumes và old viewer 4100/testlinks do owner giữ. Không nhập legacy vào A' hoặc dùng fallback.
- Giữ worktree này và ignored private 509-key asset catalogue đến cleanup/handoff riêng. Không archive worktree/xóa ignoredfiles chỉ vì PR đã merge.
- Secrets chỉ ở operator Node store; active token name theo receipt 25/10 là hsp-projector-pilot-1. Không mở/in/copy `.env`, cookie/session, key/grant hoặc đưa chúng vào Git/chat/log.

## Authority và câu đã chốt

[Authority](PILOT_APRIME_AUTHORITY.md) giữ phạm vi Cloudflarepilot và bounded VM đã duyệt; production/merge/ngoài VM scope/secretpolicy/deletion/ADR exceptions vẫn cần owner. Không cài mergepoll/automation. Chính sách token 90 ngày/incident, healthy revoke≤60 s/pendingwarning>60 s và Studio-onlywarning giữ nguyên; không hứa 60 s lúc outage hoặc deliverykhi Studio/VM down.

Owner-confirmed không phải agenttrace. Bốn extra live faults là omitted, không PASS; provider DNS/Logpush ngoài VMSSH chưa xác minh. Không ép owner cung cấp lại hoặc tự nâng acceptance thành production.

## Bàn giao lần sau

Giữ trang này ngắn: scope mới, reviewed/deployed revision, issue/PR, exact-head checks và việc còn lại. Để số liệu/chi tiết lần chạy trong `docs/validation/` có ngày/head; dùng GitHub để biết PR có merge hay không. Không thêm một lớp “Draft/chờ merge” vào README sau mỗi PR docs và không mở PR mới chỉ để đổi nhãn đó.

[History](history/README.md) giữ toàn bộ handoff trước tổng hợp; các hướng dẫn fresh-start/remote-approval/old viewer trong đó không có quyền ưu tiên với trạng thái/authority hiện hành.
