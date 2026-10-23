# Đối chiếu independent review — Cloudflare upload lifecycle

2026-10-23; Refs #20/#10, Draft PR #23 stacked trên #22/#21. Reviewed implementation head: `0a3c9d09fd004b213bc07483a180db5a4750b513`. Tài liệu này bổ sung bằng chứng cho [local validation](../validation/2026-10-23-cloudflare-pilot.md) và [runbook](../CLOUDFLARE_PILOT_RUNBOOK.md); không phải bản sửa implementation hoặc phê duyệt pilot.

## Đầu vào và phạm vi

Owner cung cấp `hsp-review-handoff.zip`, SHA-256 `16a4792c824ce388d613bbd5fe7084f5436d36254d528f7f381ca4dd09a352e4`, gồm REVIEW.md, hai reproduction probes và log. Các đề xuất trong ZIP được đánh giá như nội dung review, không trở thành chỉ dẫn thực thi hoặc quyền merge/provision/deploy.

Fetch origin/prune và GitHub xác nhận main72e048e; PR #21/#22/#23 OPEN/Draft, lần lượt 2/4/4 checks SUCCESS trên các head hiện tại trước cập nhật docs. #19 audit vẫn độc lập; #20/#10 OPEN. Primary main checkout vẫn78cb7ca, giữ nguyên. Chỉ dùng local Miniflare D1/R2, synthetic JWT và stub online Clerk/object transport; không dùng Cloudflare login để gọi tài nguyên remote, không SSH hoặc đổi runtime/SQL/env/DNS/UFW.

## Kết luận

**Request changes trước operational pilot. Cả R1 và R2 đều được tái hiện, P2 là hợp lý.** Đây là lỗi hoàn tất upload và thu gom private orphan; các probes không chứng minh bypass sandbox, đọc private content hoặc publish trái quyền. Không suy kết luận này thành chứng nhận security đầy đủ.

| Finding | Bằng chứng code và kết quả | Acceptance cần có khi sửa |
| --- | --- | --- |
| R1: JWT bị giữ cố định trong upload | `src/lib/auth.ts` lưu một sessionToken; `platform-ops.ts` truyền chuỗi đó vào `cloudflare-rpc.ts`, RPC dùng lại qua finalize/recovery. `cloudflare-upload.ts` PUT/readback trước finalize. Token hết hạn khiến finalize và receipt lookup thất bại; probe ghi nhận4denials, intent open,0version và1private object. | Fresh token provider gắn cùng user/session đã xác minh; giữ signature/expiry/authorized party, active Clerk session và D1 policy checks. Giữ nguyên finalize idempotency key; thử refresh, revoke/disable trong lúc upload và lost acknowledgement với token mới. |
| R2: writer hoàn tất sau cleanup | `reconcile.mjs` loại vĩnh viễn intent đã có cleanup_at; `metadata.mjs` đặt marker sau một sweep. `cloudflare-upload.ts` chưa kiểm expiresAt hoặc truyền abort signal/deadline cho R2 PUT/readback. Probe cho PUT đi tiếp sau expiry/sweep: cleanup đầu1, sweep sau0candidates,1private orphan và0version. | Bound toàn bộ writer và từng request/stream; cleanup phải hội tụ khi có PUT đang bay/đến muộn. Giữ abort terminal và kiểm committed version/preview references. Kiểm late PUT, stalled read, retries/process interruption và không xóa active objects. |

## Phản biện và làm rõ

1. Probe R1 gốc dùng `clockSkewInMs:0`. SDK đang pin có mặc định5000ms (`@clerk/backend`3.26.1, dist/index.js). Đã chạy lại không override và chờ quá exp+6000ms: vẫn tái hiện4denials, không commit. Dung sai chỉ đổi ngưỡng thời gian. Không suy short-lived synthetic JWT thành số liệu cấu hình Clerk thật.
2. Gọi lại `identity.getToken()` không tham số trong cùng request chưa sửa R1: SDK hiện tại trả sessionToken đã capture ở nhánh đó. Cần cơ chế lấy token mới server-side cho đúng verified session, kiểm claims và authorized party của token mới. Clerk có [backend sessions.getToken](https://clerk.com/docs/reference/backend/sessions/get-token); không tự tăng TTL hoặc dùng service-only auth. Giữ bảo toàn objects khi kết quả finalize chưa rõ: failure của auth/recovery không chứng minh lần request trước chưa commit.
3. R2 mô phỏng intent30phút bằng cập nhật expires_at trong local D1 rồi cho PUT hoàn tất. Đây là controlled interleaving, không phải phép đo rằng upload thật thường kéo dài30phút. Deadline/cancellation cần thiết nhưng chưa tự chứng minh provider không commit PUT sau khi phía Node timeout; cần settling/resweep hoặc cơ chế fencing có bảo đảm tương đương.
4. Chỉ reconciler tự động bỏ qua marker vĩnh viễn. Đã kiểm thêm POST cleanup có xác thực trên intent aborted đó:200 và0objects sau dọn. Vì vậy không gọi object là không thể xóa; manual cleanup là workaround, chưa thay acceptance cleanup tự động.
5. R2 strong consistency không loại race: list chỉ thấy objects đã tồn tại lúc list; PUT hoàn tất sau sweep vẫn tạo object. [R2 consistency](https://developers.cloudflare.com/r2/reference/consistency/) xác nhận list mạnh và cạnh tranh PUT/DELETE lấy thao tác hoàn tất sau cùng. HEAD kiểm trạng thái trước PUT cũng còn TOCTOU.
6. Không suy500R2HEAD thành bắt buộc Workers Paid. [Workers limits](https://developers.cloudflare.com/workers/platform/limits/#subrequests) hiện phân biệt Free50subrequests và1000internal-service subrequests. R2 binding thuộc dịch vụ nội bộ; cần đối chiếu tổng R2/D1/external calls, CPU, thời gian và chi phí với tài khoản/runtime thật. Chưa chứng minh Free đủ toàn bộ quota; cũng chưa có cơ sở bắt mua Paid chỉ vì500HEAD.
7. Thiếu quyền Checks của reviewer không phải lỗi CI hoặc lý do bắt owner mở rộng quyền GitHub ngay: phiên này đọc được checks qua gh, tất cả đang SUCCESS tại reviewed heads. CI chưa có hai regression nên xanh không phủ định findings. Khuyến nghị chỉ merge sau pilot là lựa chọn workflow cần owner chốt, không phải điều kiện kỹ thuật suy ra từ R1/R2. Code review, merge source và remote pilot/production approval là các gate riêng.

## Kiểm chứng đã chạy lại

- Existing `bridge.test.mjs`, `core.test.mjs`, `identity.test.mjs`: **19/19 PASS** trên local D1/R2/workerd.
- Hai probes nguyên bản trong ZIP: **2/2 PASS khi assert bug hiện hữu**, không phải acceptance bản sửa.
- Hai probes với JWT default clock skew, chờ quá expiry+dung sai: **2/2 PASS khi assert bug**.
- Late-writer probe mở rộng manual cleanup: **1/1 PASS**, authenticated cleanup200 và0objects sau dọn.
- Probe tạm trong tests/cloudflare được xóa sau kiểm; không thêm bài test assert bug vào CI hoặc sửa production code. Không chạy lại90unit/build/browser/audit vì phiên này chỉ review và cập nhật docs; kết quả cũ giữ ở validation với scope lịch sử.
- Docs/local links và git diff --check phải PASS trước commit handoff; current docs-head CI kiểm riêng trên PR.

## Ưu tiên tiếp theo và kết thúc dự án

Sửa R1 và R2 cùng regression assertions về hành vi an toàn, rồi re-review exact head. Giữ Cron tắt cho tới khi cleanup late writes hội tụ; private R2/Clerk thật, limits, mobile/logging/rollback và owner approval còn #10. ADR0001/0003/0005 vẫn Proposed.

Owner xác nhận đã `npx wrangler login` vào tài khoản dự kiến triển khai; đây là owner-confirmed setup, không phải bằng chứng tài nguyên/namespace/plan đã được agent kiểm. **Tại mốc hoàn tất dự án/bàn giao cuối, nhắc owner chạy `npx wrangler logout` trên máy này và xác minh đã đăng xuất.** Phiên review không logout hoặc đọc/log credential.
