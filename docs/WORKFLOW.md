# Workflow GitHub và kiểm chứng

Repository: private `cfotel2604/html-share-platform`. Main là nguồn merge; checkout main của owner có thể cũ. Không sửa trực tiếp hoặc reset/clean worktree của owner.

## Issue → branch → Draft → owner merge

1. Fetchorigin/prune, kiểm status/worktrees/remotes và liveGitHub; đọc [map](DOCUMENTATION_MAP.md)/AGENTS/ADR của scope.
2. Issue ghi vấn đề/acceptance; branch từ fresh main: feat/<issue>-scope, fix/<issue>-scope hoặc docs/<issue>-scope. Labels chọn phù hợp, không buộc feature mới vào roadmap P0cũ.
3. Draft PR sớm, Refs issue; Closes khi scope hoàn tất. Tiếp independentwork đã được giao khi PR khác chờ, không gộp implementationissues không liên quan.
4. Code/test/docs đủ review; PR title/body phản ánh thay đổi cuối, exact head/checks/commands/evidence/limits/rollback, không lịch sử chat dài hoặc secret.
5. Owner review/Ready/merge. Không agent auto Ready/merge/productiondeploy; owner báo merge trong chat rồi kiểm source mới khi task phụ thuộc. Không merge polling/automation.

## Kiểm tra theo thay đổi

- Docs: `python scripts/check_docs.py`, `python scripts/check_yaml.py` nếu liên quan YAML, mọi local Markdownlink và `git diff --check`. Không chạy runtime/drill để test chữ.
- Code: lint/typecheck/tests/build và integration đúng lớp. Không thêm test lặp implementation cho sửa lowimpact.
- Remote: authority/target/config/artifact guards ngay trước mutation và actualreadback; CI không thay pilot/provider proof. Không sửa applied SQL hoặc chạy lại initialization vì source/docs mới merge.

## Trạng thái, evidence và quyết định

PROJECT_STATUS/AI_HANDOFF ngắn, current; chi tiết từng run vào validation có ngày/head. Tách owner-confirmed, agentobserved, local/CI, omitted và unverified. Không gọi ownerpilotacceptance là production approval; [authority](PILOT_APRIME_AUTHORITY.md) giữ scope.

Không hardcode nhãn Draft/pending của PR docs vào README như gate sản phẩm; không mở PR nối tiếp chỉ để đổi nhãn sau merge. Historical source/commands ở [history](history/README.md), không dùng chúng làm currentworkflow.
