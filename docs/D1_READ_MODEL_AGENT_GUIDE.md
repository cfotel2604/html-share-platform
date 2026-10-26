# Hướng dẫn agent làm việc với A'

Epic #31 và issues #32–38 đã thực hiện/owner-accepted; audit #10/PR #19 đóng cho pilot/lab. Trang này dùng cho thay đổi/bảo trì mới, không là lệnh tiếp tục chuỗi issue đã đóng. [Map](DOCUMENTATION_MAP.md) và [AGENTS](../AGENTS.md) là lối vào.

## Thứ tự đọc

AGENTS → README/map → ADR-0006 → PLAN/ARCHITECTURE/WORKFLOW → contract/runbook của khu vực thay đổi → PROJECT_STATUS/AI_HANDOFF → code/SQL và liveGitHub. [Plan A' gốc](D1_READ_MODEL_PLAN.md) là record requirements đã thực hiện. Không bắt đọc branch/PR21 đãabandoned để port code; servingcontract đã có trên main.

## Invariant

1. PG duy nhất cho quản trị, status/audit/outbox cùng transaction; no dual-write handler.
2. D1 tối thiểu public model, không PII/RBAC/session/audit; chỉ Node projector/recovery ghi qua guardedproject.sql.
3. Projectionversion/tombstones không đảo ngược; FIFOtheosite/revokepriority không cho event cũ sống lại.
4. Public Worker fixed primary SELECT + R2 get/head pinnedmanifest, không admin/preview/callback/secret. Nativebinding capability rộng hơn code-read-only; không claim IAM read-only.
5. HTTP sandbox mọi HTML direct/nested, no allow-same-origin, no-store/nosniff/no-referrer, manifest boundary. Node preview grant 128-bit/3 phút/actor-policy-version; không Worker preview.
6. Codepublic hiện là `/<share-code>/` asset trực tiếp, chưa shell OG/rawroute. Muốn thêm metadata công khai/route phải review source/outbox/D1 contract/serving/tests theo scope mới, không tự sửa docs thành feature đã có.
7. Applied PG/D1 migrations immutable, D1 pilot 0004/0005 không apply lại; không reset source/target history hoặc import legacy.
8. Secrets ở operatorstore/process env, không CLI args/Git/log/chat/response. Runtime/target hiện hành phải đọc lại trước mutation; không dùng pin cũ trong snapshot.

## Workflow và câu cần hỏi

Issue/branch/Draft từ fresh main, tests đúng scope, exact-head CI, handoff có nhãn bằng chứng, owner merge. Không poll/schedulemerge. [Authority](PILOT_APRIME_AUTHORITY.md) đã thay prepare-only gates cũ; không hỏi lại account/token/threshold/matrix hay bắt chạy extra fault đã owneromitted.

Hỏi khi thay target/account/token policy, publicproduction domain, ngưỡng khỏe/cảnh báo, ADR/security boundary, deletion hoặc runtime ngoài authority. Không lấy giá trị secret để “kiểm tra”. Không tự gọi unevidenced case là PASS hoặc owner pilot approval là production approval.

## Mẫu handoff

```text
Ngày/scope/Issue/PR: ...
Reviewed main / tested head / deployed artifact (nếu có): ...
Lệnh và kết quả tại head: ...
Evidence: agent-observed / owner-confirmed / local-CI / omitted / unverified
Runtime/data/token changes: ...
Việc còn lại và owner decision: ...
```

Giữ PROJECT_STATUS/AI_HANDOFF ngắn; receipt dài vào validation có ngày/head. Không thêm một backlog lịch sử vào hướng dẫn hiện hành sau mỗi merge.
