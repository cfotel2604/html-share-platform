# Audit chỉ đọc trước pilot — Issue #10

Ngày **2026-10-22 (Asia/Saigon)**. Refs [Issue #10](https://github.com/cfotel2604/html-share-platform/issues/10), [lab baseline](../LAB_HANDOFF.md), [merge record](../reviews/2026-10-22-stack-merged.md). Đây là đối chiếu acceptance và kế hoạch kiểm chứng tiếp theo, chưa phải security/release approval.

## Phạm vi và nguồn bằng chứng

- **Kiểm trực tiếp phiên này:** Git/GitHub/CI; SSH `lab-b` chỉ đọc; cấu hình nginx, container và renewal được lọc trong memory trước khi in; DNS lookup có mục tiêu; HTTP GET/HEAD số lượng nhỏ, không load test. Chỉ SELECT metadata published site/share trong memory để kiểm canonical viewer; không in ID/code, HTML, cookies, credential hoặc raw config/log.
- **Owner-confirmed từ handoff:** Google Admin/Employee login, ownership/Admin audit/ngoài allowlist/revoke/disable/logout; rotate/revoke/reissue/unpublish và khách ngoài tải iframe sau mở443 đều đạt. Không chạy lại các thao tác có mutation trên lab và không gọi đây là browser matrix của agent.
- **Chưa kiểm:** authoritative DNS/route inventory đầy đủ; browser cookie/mobile/cross-environment; private R2/IAM; Clerk production; forced renewal/failure/rollback; log redaction toàn pipeline và pilot.

Không restart/rebuild/redeploy, migrate/backfill, sửa SQL, đổi DNS/UFW, provision dịch vụ, thay pin/env/operator overlays hoặc ghi log payload. Không thay đổi UI/backend/gateway; giữ presentation → workflow → typed HTTP adapter → backend và gateway process riêng.

## Repository và CI đã xác minh

Primary checkout `main` tại `78cb7ca`, sạch tracked/untracked theo `git status`, chậm `origin/main` **52 commit**, không có commit ahead. Đã fetch `origin --prune`; remote là `cfotel2604/html-share-platform`. Giữ primary và các worktree cũ; audit trên worktree riêng, branch `codex/10-prepilot-audit` từ **`72e048efc7a7e919efb26bfd8e1f613ff88b4307`**.

GitHub lúc bắt đầu: không PR mở; chỉ #10 OPEN; #8/#9/#11/#14/#16 CLOSED. `gh pr view` xác nhận #13/#15/#18 MERGED vào main, tested-head checks SUCCESS. Main72e048e có đủ ba workflow SUCCESS:

| Workflow đúng main SHA | Bằng chứng kiểm lại |
| --- | --- |
| [Foundation checks](https://github.com/cfotel2604/html-share-platform/actions/runs/39783534206) | Lint/typecheck/build PASS; log unit **86 tests, 86 pass, 0 fail** |
| [Security integration](https://github.com/cfotel2604/html-share-platform/actions/runs/39783534316) | Non-root UID1000/21files PASS; **9 upload + 6 auth/origin + 5 share groups PASS** |
| [Documentation checks](https://github.com/cfotel2604/html-share-platform/actions/runs/39783534247) | SUCCESS |

Đây là CI được đọc lại, không phải rerun local trong phiên audit. CI dùng DB/MinIO/fixtures; không chứng minh provider/DNS/browser production. PR audit sẽ có CI của head riêng.

## Runtime, ingress và ảnh hưởng mở443

Source VM vẫn detached `dc7560ea1c34cbe060779fbe69bb2f574e170431`, tracked sạch. Web `html-share-studio:share-dc7560ea1c34`, gateway `html-share-studio:security-417c50d`, DB và MinIO đều healthy. Web3100/gateway4100 chỉ bind127.0.0.1; DB/storage không publish host port. AUTH_MODE=clerk, key được phân loại **test** trong memory; không in giá trị. Merge main không yêu cầu đổi runtime.

`nginx -t` PASS. Effective nginx có **8 server blocks**, trong đó content lab có HTTP80/HTTPS443; **3 HTTPS vhosts khác cùng443**. Không ghi tên/cấu hình ứng dụng khác vào Git. UFW active,443/tcp cho mọi IPv4/IPv6; nginx listen443 ở cả hai families. Vì vậy phạm vi review mở443 bao gồm ba vhost đó; chưa chứng minh auth/routing/regression của từng ứng dụng từ Internet.

HEAD loopback với SNI từng vhost khác: một vhost có chain public hợp lệ trả303; hai vhost curl xác minh TLS trả lỗi60/verify20, certificate issuer được phân loại Cloudflare Origin CA. Đây không phải bằng chứng certificate hỏng/hết hạn hoặc ứng dụng lỗi; direct clients không mặc nhiên tin Origin CA. Cần owner đối chiếu chủ đích chỉ nhận Cloudflare, origin access policy và hành vi direct ingress. Không tắt TLS verification để coi gate đạt; chưa có baseline before/after để kết luận regression.

| Kiểm có mục tiêu | Quan sát |
| --- | --- |
| Studio/viewer lab DNS | Có A/AAAA của Cloudflare |
| Synthetic32hex, www, admin dưới content lab | Resolve tới cùng IPv4 VM; named reserved host vẫn có thể resolve do wildcard |
| Một synthetic32hex dưới content production | Không có DNS answer ở lookup này; không chứng minh toàn namespace production chưa cấu hình |
| Reserved config gateway | `www,mail,api,admin,studio,view`; hostname parser chỉ nhận32hex hoặc32hex--grant26, một label |
| Unknown synthetic32hex content HTTPS | 404/no-store/no Set-Cookie |

Đây là inventory effective nginx và DNS sample, chưa có export authoritative records, wildcard/named records, Workers/tunnel routes, redirects, reserved names và ownership cho toàn zone. DNS resolve không đồng nghĩa gateway chấp nhận host. Inventory riêng tư cần ghi mapping từng vhost/record → ứng dụng/owner/đích hiện tại/rollback, kể cả hostname32hex đang dùng trước wildcard; chỉ đưa kết quả đã ẩn dữ liệu vào PR.

## HTTP, edge, cache và crawler

Canonical viewer hiện published GET200, no-store/no Set-Cookie, iframe `sandbox="allow-scripts"`. Direct content HEAD200, HTTP CSP bắt đầu `sandbox allow-scripts;`, đúng `frame-ancestors https://view-lab.ods.vn`, no-store/no Set-Cookie. Đây là kiểm header/shell; HEAD không chạy JS hoặc chứng minh cookie boundary. Viewer `/api/sites`, alias32hex và mã10base62 synthetic không tồn tại đều404/no-store/no-cookie.

| Lớp | Đã kiểm trực tiếp | Còn thiếu |
| --- | --- | --- |
| Content nginx | `limit_req_zone $binary_remote_addr zone=lsods:10m rate=30r/s`; `limit_req zone=lsods burst=100 nodelay`; body cap1m ở content vhost | Không thấy `limit_conn_zone`/`limit_conn` trong effective nginx; chưa đo concurrency, memory/object buffering hoặc abuse. Body cap content không phải upload cap Studio |
| Viewer | Config600/min; [limiter](../../src/lib/viewer-limit.ts) là budget chung mỗi process, không tin forwarding header | Per-IP/replica/provider edge policy, trusted client-IP chain và fairness chưa được chứng minh |
| Cache/unpublish | Header no-store trên viewer/direct; không thấy `proxy_cache_path` | Chưa kiểm effective Cloudflare cache rules toàn pipeline hoặc chạy update/unpublish/preview expiry trên fixtures qua edge trong phiên này; owner-confirmed lifecycle và CI vẫn là hai nguồn riêng |
| Crawler | Canonical viewer200/no-store với Mozilla, `facebookexternalhit/1.1`, `Zalo/1.0` giả lập | Không phải request từ hạ tầng crawler thật hoặc test Zalo in-app |

Python urllib User-Agent mặc định nhận403 `Server: cloudflare` trên Studio/viewer root; Mozilla nhận Studio200, viewer root404 đúng route chỉ có mã. Các User-Agent giả lập Facebook/Zalo cũng tới viewer root404 và canonical200. Nguyên nhân403 chưa được chứng minh; không suy thành Cloudflare rule cụ thể hoặc tự nới policy.

**Gap metadata đã xác minh:** canonical response không có `og:title`/`og:description` với ba User-Agent trên. [Viewer metadata](../../src/app/view/[id]/page.tsx) hiện chỉ tạo `title` và `description`; chưa cấu hình `openGraph`. Crawler có thể dùng fallback, nhưng preview card thật chưa được nghiệm thu. Bước code nhỏ tiếp theo: metadata trusted, escape tên site, canonical viewer URL, không lấy raw HTML upload; test revoked/unpublished/not-found không lộ metadata và viewer không kéo Clerk/admin cookie. Sau đó test Zalo/crawler thật với fixture không nhạy cảm; không fetch/execute untrusted HTML server-side để dựng card.

## Private R2/IAM và cleanup

Runtime endpoint được phân loại MinIO; gateway và web dùng cùng cặp storage credential, **trùng MinIO root credential** (chỉ so sánh trong memory, không in giá trị). Gateway code chỉ gọi GetObject không chứng minh credential read-only. Lab này chưa đạt R2/IAM gate; không mở rộng ngoại lệ legacyMinIO sang staging/pilot/production.

| Code hiện có | Gate cần chứng minh trên storage thật |
| --- | --- |
| [Gateway](../../scripts/gateway.mjs) đọc object, kiểm manifest/size/hash trước trả bytes | Bucket private; tắt public endpoint/custom serving; anonymous/listing bị từ chối; gateway credential chỉ đọc bucket được giao, write/delete bị từ chối; app credential tách riêng và không vào client |
| [Storage client](../../src/lib/storage.ts) nhận endpoint/region/env, HeadBucket và CreateBucket khi404 | R2 endpoint/region đúng, bucket được provision bởi operator; không dựa vào quyền tạo bucket từ app. Hành vi403/provider outage fail closed; xác minh quyền thực tế thay vì tên token |
| [Upload transaction](../../src/lib/site-ops.ts) cleanup exact attempted keys, retry3; COMMIT unknown giữ object/503 | CRUD/manifest/atomic update với fixture riêng; persistent cleanup failure/process crash có reconciliation dry-run; chỉ xóa orphan sau đối chiếu DB/active references, không xóa tombstones hoặc object có COMMIT outcome chưa rõ |
| Retention trong PLAN còn đề xuất | Chưa có durable sweeper/retention job được chứng minh. Chốt version/soft-delete/staging policy, bảo vệ active version và preview reference trước bất kỳ delete job nào |

Phiên này không gọi R2, không tạo bucket/token, không thử delete hoặc đổi IAM. Production Clerk/Google OAuth cũng chưa có evidence mới: cần instance/credentials riêng, redirect/azp/host-only cookies, verified Google primary email, server allowlist, revoke và provider quota/outage fail-closed trên staging. Không đưa secret hoặc session thật vào case report.

## Preview log redaction và TLS

Content HTTPS access format `lsods` chỉ có `$remote_addr`, `$time_iso8601`, `$request_method`, `$uri`, `$status`, `$body_bytes_sent`, `$request_time`; không Host/query/Referer/User-Agent. HTTP80 access log off. HTTPS content error log vẫn là file riêng, mức `crit`: giảm volume không chứng minh redaction. Global format `main` có request/Referer/User-Agent; chưa chứng minh mọi fallthrough/error route và collector không nhận preview hostname.

Web/gateway/cloudflared dùng Docker `json-file`; thấy rsyslog/journald services. [Gateway error](../../scripts/gateway.mjs) chỉ in `gateway.read_failed`. Chưa đọc raw logs hoặc tạo grant thật; DNS resolver/authoritative log, TLS/SNI, nginx error, Cloudflare/tunnel/analytics và collectors vẫn cần inventory/retention/access policy. Không thể coi hostname bearer hoàn toàn kín chỉ vì access format an toàn; DNS/SNI có thể quan sát ngoài ứng dụng. Cần synthetic marker không phải grant thật để kiểm success/404/error/timeout paths và chỉ báo match counts; failure drill phải được giao riêng, không dừng upstream lab để kích lỗi.

Certificate content lab có SAN `*.lab-space-ods.cfvn.cloud`, hết hạn **2027-01-07 10:55:05 UTC**. Renewal timer active; service lần gần nhất22/10 00:15:24+07 `Result=success`, exit0. Thành công một invocation không chứng minh đã cấp certificate mới hoặc drill renewal/failure/rollback đạt. Production wildcard/renewal riêng chưa kiểm. Drill được giao sau phải chứng minh failure không thay cert tốt, alert, `nginx -t` trước reload, rollback có kiểm HTTPS; không chạy forced renewal/reload trong audit.

## Đối chiếu acceptance #10 và thứ tự tiếp theo

Không tick toàn bộ acceptance từ evidence một phần; #10 giữ OPEN, ADR-0001/0003 giữ **Proposed**. ADR-0002/0004 Accepted vẫn chỉ đúng scope UI/domain-link.

| Acceptance trong #10 | Trạng thái phiên này | Evidence còn cần trước khi đạt |
| --- | --- | --- |
| Trusted Studio/viewer/content thật | HTTP/runtime xác minh một phần; real-session owner-confirmed | Browser redirects/CSRF/frame ancestors trên release config và auth provider thật |
| DNS/route/reserved/regression/rollback | Nginx count/reserved/DNS sample đã kiểm | Authoritative/private inventory; regression từng vhost chung443 + external origin policy, rollback được review |
| Wildcard TLS/renewal/failure/rollback | Lab cert/timer/service kiểm được | Production certificate riêng; renewal/failure/rollback drill có bằng chứng |
| HTTP sandbox/direct/nested/iframe | Direct HEAD và viewer shell PASS; CI fixtures có nested HTML | JS/browser direct + nested + iframe trên real domains, không thêm allow-same-origin |
| Cookie/storage/workers/navigation/sibling | Chưa chạy real-browser matrix mới | Chrome/Firefox, Safari macOS/iOS, Android Chrome, Zalo; lab/production/website sibling, cả direct/iframe/preview, parent cookie và storage markers giữ nguyên |
| Active formats/manifest/private R2/IAM | Code/CI PASS phần allowlist/manifest/invalid Host; lab còn root MinIO | Private R2 với credential tách app/gateway, deny write/delete từ gateway, provider failure, cleanup/reconciliation |
| Preview scope/status/cache/log redaction | CI + owner-confirmed lifecycle; header/config kiểm một phần | Edge warm-cache/unpublish/expiry/revoke cases; redaction success/error/DNS/analytics/collector; concurrency policy |
| Assets/CORS/CDN/mobile/Zalo/crawler | CI/local fixture history; canonical UA probes PASS, OG gap xác minh | Representative fixture browser/device matrix; trusted OG metadata và crawler/card thật; ghi rõ Web API bị sandbox chặn |
| Security review/staging/pilot/rollback | Chưa đạt | Owner/security review ADRs và evidence; pilot ít nhân viên, monitoring/abuse/takedown, rollback thử, release approval riêng |

Thứ tự đề xuất trong scope #10:

1. **Ưu tiên ingress/privacy:** owner hoàn tất inventory riêng tư ba vhost chung443, authoritative DNS/route/reserved và origin access policy; chốt preview hostname/log/collector threat review. Không cần thay runtime để lập inventory; mọi policy patch phải qua review riêng.
2. **Chuẩn bị song song trong repository:** sửa gap OG bằng thay đổi nhỏ có test; chuẩn bị fixtures và form evidence dưới đây, thiết kế R2 credential separation/reconciliation và Clerk staging checklist. Không cần provision hoặc production credentials để viết/review kế hoạch này.
3. **Sau khi được giao môi trường/provider:** operator provision private R2/Clerk production; test IAM/fail-closed/cleanup, edge cache/concurrency và redaction trên staging. Không trỏ production DNS hoặc đổi image lab để chuẩn bị docs.
4. **Nghiệm thu release:** chạy browser/device matrix, renewal/failure/rollback có scope, review ADR0001/0003, pilot rồi owner quyết định release. Không tự đổi ADR sang Accepted từ CI xanh.

Mỗi browser case ghi: ngày + source/image/config revision, OS/browser/version/device, network, fixture synthetic, mode direct/nested/iframe/preview, expected/actual, PASS/FAIL/BLOCKED, limitation và người chạy. Thử cookie read/write `Domain=cfvn.cloud`, local/session storage, service worker/worker, popup/top navigation, root/relative CSS/classic/module/fetch/CDN; kiểm marker sibling và hai môi trường không đổi. Nếu chưa có endpoint cross-environment an toàn thì ghi BLOCKED, không dùng website khách hàng làm fixture. Screenshot/log chỉ được lưu sau khi bỏ codes/grants/session/PII.

Mỗi provider/edge/TLS case ghi thêm quyền được giao, fixture scope, before/after aggregate, expected denial/failure, rollback và kết quả sau rollback. Backup/restore vẫn ngoài MVP theo owner; không biến cleanup/drill thành xóa dữ liệu lab. Báo cáo này hoàn tất audit ban đầu, không đóng các release gates chưa có bằng chứng.

Kiểm tài liệu local: `python -B scripts/check_docs.py`, `python -B scripts/check_yaml.py`, kiểm toàn bộ31Markdown/local links và `git diff --check` PASS. Không rerun application tests local cho thay đổi chỉ tài liệu; CI main exact SHA ở trên đã được kiểm riêng.
