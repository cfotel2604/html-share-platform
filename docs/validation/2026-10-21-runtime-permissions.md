# Khắc phục EACCES khi migrate lab — 2026-10-21

Refs [Issue #16](https://github.com/cfotel2604/html-share-platform/issues/16), [PR #15](https://github.com/cfotel2604/html-share-platform/pull/15), [runbook share links](../SHARE_LINKS.md).

## Lỗi và trạng thái đã kiểm chứng

Owner chạy migrate ở bước 8.2.2, gặp EACCES đọc `/app/db/migrations/0003_site_share_links.sql`. Candidate `html-share-studio:share-b1e3c2601944`, image `sha256:d51e137cdac7b674602a2c5e7520a0a8368d8e3e4def190f597a5c20e2846c66`, có migration0003/backfill/share-codes root-owned mode0600. Kiểm container ephemeral read-only/no-network: default UID1000 không đọc được, diagnostic UID0 đọc được. Không chạy migration bằng root.

Runbook đặt umask077 trước git switch nên file mới checkout có mode0600; Docker COPY giữ mode và root ownership, nhưng runtime USER node. CI trước đây clone umask thông thường nên không tái hiện. Host migration0003 đã0644 khi kiểm, nhưng image đã build vẫn0600; hai script mới trên host vẫn0600. Sửa quyền host sau build không sửa image cũ.

DB đọc chỉ có migrations0001/0002, chưa site_share_links; 2sites/2versions. Web cũ đã bị stop theo runbook, gateway/DB/storage vẫn healthy. Agent xác minh đúng previous image rồi `docker start hsp-lab-web-1`, khôi phục web `html-share-studio:security-417c50d` healthy. Không recreate web bằng candidate lỗi, không migrate/backfill hoặc sửa DB/storage/DNS/allowlist.

## Sửa và kiểm chứng

Dockerfile chuẩn hóa `a+rX` cho `/app/scripts` và `/app/db` sau COPY, giữ root ownership và USER node; không sửa bytes migration đã áp dụng hoặc quyền data volumes. Script `scripts/check-runtime-image.mjs` kiểm non-root UID và quyền đọc/traverse thực tế trong image read-only/no-network, không mount data hoặc in file contents/env.

CI mô phỏng checkout hạn chế bằng `chmod -R go-rwx scripts db` trước Docker build, rồi chạy checker trước full security integration. Runbook sẽ dùng umask022 cho checkout/build, umask077 chỉ cho artifact private, và yêu cầu preflight image trước khi dừng web.

## Kết quả khắc phục đã kiểm chứng

- Fix commit `dc7560ea1c34cbe060779fbe69bb2f574e170431`; runtime application/share-link logic và migration bytes không đổi. Lint/typecheck/docs/YAML/diff check local PASS.
- CI đúng fix commit: [application](https://github.com/cfotel2604/html-share-platform/actions/runs/39593677232), [docs](https://github.com/cfotel2604/html-share-platform/actions/runs/39593677253), [security](https://github.com/cfotel2604/html-share-platform/actions/runs/39593677187) đều SUCCESS. Security job build từ scripts/db mode hạn chế, non-root image preflight PASS rồi 9 upload + 6 auth/origin + 5 share groups PASS.
- Trên VM, checker tái hiện EACCES với image b1e lỗi. Agent fetch/switch đúng fix SHA (giữ env/overlays), build `html-share-studio:share-dc7560ea1c34`, image ID `sha256:7967815b1c25611fc4237f929bc3cf21c21243f242524073f1509e3a3654232a`; revision khớp fix SHA, Config.User=node. Checker real image read-only/no-network PASS UID1000, 21 readable files.
- Đối chiếu image SQL hashes với schema_migrations hiện tại: 0001/0002 khớp; 0003 byte-for-byte khớp bản b1e trước đó. Không sửa checksum/schema để bỏ qua runner, chưa chạy migration/backfill bằng image mới.
- Đã chỉ đổi candidate_image trong `tmp/share-cutover-images.txt` sang tag mới, giữ previous_sha/previous_web_image. Web cũ đã khôi phục, gateway/DB/storage không recreate; private env/allowlist/data/volumes giữ nguyên.
- Kiểm cuối: cả bốn containers running/healthy, DB vẫn 0001/0002 và chưa site_share_links. Fingerprint sites/versions hiện tại khớp artifact trước lần migrate lỗi; vẫn 2 sites/2 versions. Không dùng lại fingerprint này cho retry: cần lấy baseline mới sau khi stop web theo toàn bộ 8.2.2.
- Runbook operator đã đổi pin sang fix SHA, umask022 cho checkout/build, umask077 cho artifact, thêm image preflight non-root trước khi stop web và đoạn khôi phục EACCES cho cả phiên Bash mới. Không dùng lại image b1e, không chạy migration root.

Owner không cần build lại; export SECURITY_IMAGE sang `html-share-studio:share-dc7560ea1c34`, khôi phục hàm hsp nếu phiên cũ đã thoát, rồi chạy lại toàn bộ 8.2.2 để lấy baseline metadata mới vì web cũ đã bật lại. Chỉ bật 8.2.3 khi migration/backfill/history/fingerprint đạt. `.env` chỉ lưu tag mới sau nghiệm thu theo runbook; không merge/Ready/production tự động.

## Owner hoàn tất 8.2.2 — kiểm chứng sau retry

Owner gửi kết quả SQL: schema_migrations có 0001/0002/0003, sites_without_share_history=0. SSH chỉ đọc xác nhận 2 active share links, 0 revoked; fingerprint files trước/sau giống nhau và fingerprint metadata hiện tại khớp artifact sau, giữ 2 sites/2 versions. Source VM vẫn fix SHA `dc7560ea1c34cbe060779fbe69bb2f574e170431`; candidate record `html-share-studio:share-dc7560ea1c34`, rollback `html-share-studio:security-417c50d`.

Web cũ exited sau stop của 8.2.2, health cũ unhealthy không phải kết quả kiểm candidate; gateway/DB/MinIO vẫn running/healthy. Migration/backfill đã do owner thực hiện; agent chỉ đọc kiểm chứng, chưa recreate/start candidate. 8.2.2 PASS, tiếp ngay 8.2.3: export đúng candidate rồi `hsp up -d --no-deps --no-build --wait web`. Sau healthy cần smoke HTTPS, Google Admin/Employee, canonical link 10 base62, rotate/revoke/reissue/unpublish và private preview theo runbook; chưa coi SQL PASS là nghiệm thu toàn bộ cutover/security gates.
