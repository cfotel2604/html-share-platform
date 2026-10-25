# A-prime browser boundary and read-only R2 packet —2026-10-25

Refs #38. Owner reported56merged; GitHub confirms merge `e50cbebe220f48d1860b2c511b8dd2954991c6dc`, headac646f7/3CI. Main application/config still matches deployed2a396ae/image d927742b. Token scope is owner-confirmed; no repeated account/scope question.

## Bounded work

Use the checked-in synthetic [HTML probe](../../tests/fixtures/pilot-origin-probe.html), first on a credential-free loopback server with the existing gateway sandbox headers, then upload one new, separately named pilot fixture through the owner's authenticated Studio. Do not overwrite the existing500file fixtures or oldviewer. Test actual public direct navigation and Node private preview iframe/direct navigation. Read only rendered diagnostic results, never cookie/storage values, tokens or raw capability URLs. The probe has short-lived synthetic markers, no external data transmission and no auth/API access; unexpected boundary allowance stops the test rather than weakening headers.

Report cookie getter/host/parent-domain setter, local/session storage, popup, worker and iframe parent-DOM outcomes. Popups/workers may be denied by additional browser policies; do not attribute every denial solely to sandbox. HTTPS/HTTPheader/iframeflag evidence is separate. One desktop engine does not close Safari/mobile/Zalo or release10.

Use the existing Node preview R2reader for a missing-key GET and deliberately incorrect If-Match GET on the new fixture, plus correct readback. No object deletion/overwrite, manifest corruption, token lifecycle or Worker change. Provider404/412proves those R2responses, not a full live Worker corruption drill. Existing Worker contract/local negative tests remain separate.

## Local-first results

The HTML probe passed direct navigation and same-origin trusted-shell iframe under the actual gateway HTTPsandbox on an empty loopback server: cookies/storage denied with SecurityError; popup/worker blocked; iframe parent-DOM access denied. No PG/R2/Clerk/Cloudflare or .env used. Structured local and pilot results will be added after actual readbacks.

## Remaining operator token drill — prepared, not executed

The settled policy remains90day/incident rotation. A one-off early rotation for acceptance needs a timing approval; this is not another scope/account decision. Operator creates a replacement token with the same approved name/scope/account and updates only D1_PROJECTOR_API_TOKEN directly in `/opt/hsp-aprime/secrets/node.env` (root0600, parent0700); no value/export in chat/log/Git. Do not read/print the file, Docker environment or expanded Compose config.

After operator reports completion, agent rechecks active deployment/source/image, target/disabledreplication, queue, nonsecret role booleans and quiet config. Recreate only the new projector with the existing pinned source/image and `up --detach --no-deps projector` so it receives the new startup environment; do not use Compose start with dependencies, rerun migrations or change web/preview/PG. Run a bounded synthetic publish/revoke via the existing Node operations and observe ordinary outbox drain/public404. Only then operator revokes the old token on Dashboard and records date/token name/result without value. Existing public Worker does not consume this token.

If validation fails, retain outbox/source/tombstones and stop only projector if necessary. Operator may restore the previous secret while old token is still valid; do not revoke it before successful drain. If already revoked, fail closed and follow the agreed replacement process. No production/wholeVM/DNS/UFW/oldviewer action or ownerpilot/#10acceptance follows.

## Status

Prepared; no pilotbrowser/R2PASS claimed yet. Keep Draft for review. Token rotation/revoke remains unrun until the specific early-drill approval and operator secret handoff.
