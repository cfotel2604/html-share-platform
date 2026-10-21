# Khắc phục EACCES khi migrate lab — 2026-10-21

Refs [Issue #16](https://github.com/cfotel2604/html-share-platform/issues/16), [PR #15](https://github.com/cfotel2604/html-share-platform/pull/15), [runbook share links](../SHARE_LINKS.md).

## Lỗi và trạng thái đã kiểm chứng

Owner chạy migrate ở bước 8.2.2, gặp EACCES đọc `/app/db/migrations/0003_site_share_links.sql`. Candidate `html-share-studio:share-b1e3c2601944`, image `sha256:d51e137cdac7b674602a2c5e7520a0a8368d8e3e4def190f597a5c20e2846c66`, có migration0003/backfill/share-codes root-owned mode0600. Kiểm container ephemeral read-only/no-network: default UID1000 không đọc được, diagnostic UID0 đọc được. Không chạy migration bằng root.

Runbook đặt umask077 trước git switch nên file mới checkout có mode0600; Docker COPY giữ mode và root ownership, nhưng runtime USER node. CI trước đây clone umask thông thường nên không tái hiện. Host migration0003 đã0644 khi kiểm, nhưng image đã build vẫn0600; hai script mới trên host vẫn0600. Sửa quyền host sau build không sửa image cũ.

DB đọc chỉ có migrations0001/0002, chưa site_share_links; 2sites/2versions. Web cũ đã bị stop theo runbook, gateway/DB/storage vẫn healthy. Agent xác minh đúng previous image rồi `docker start hsp-lab-web-1`, khôi phục web `html-share-studio:security-417c50d` healthy. Không recreate web bằng candidate lỗi, không migrate/backfill hoặc sửa DB/storage/DNS/allowlist.

## Sửa và kiểm chứng

Dockerfile chuẩn hóa `a+rX` cho `/app/scripts` và `/app/db` sau COPY, giữ root ownership và USER node; không sửa bytes migration đã áp dụng hoặc quyền data volumes. Script `scripts/check-runtime-image.mjs` kiểm non-root UID và quyền đọc/traverse thực tế trong image read-only/no-network, không mount data hoặc in file contents/env.

CI mô phỏng checkout hạn chế bằng `chmod -R go-rwx scripts db` trước Docker build, rồi chạy checker trước full security integration. Runbook sẽ dùng umask022 cho checkout/build, umask077 chỉ cho artifact private, và yêu cầu preflight image trước khi dừng web.

Lint/typecheck/docs/YAML/diff check đã pass khi chuẩn bị patch. Candidate thay thế, CI regression và preflight VM đang kiểm; không cho phép tiếp tục bằng image b1e3c26 lỗi. Kết quả cuối sẽ bổ sung tại đây trước khi owner retry 8.2.2.
