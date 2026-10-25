# Remaining A-prime projector fault evidence —2026-10-25

Refs #38 / Draft PR56. Owner merged48at main `1fbe19ce70ab52630223f7d30ebb15d5dbb77e23`, head6809656/4CI. Application/config trees match deployed source `2a396ae2d4b8a1e2feb3e14b7dc6d9fb88e78e64`, image `sha256:d927742b4d5aca35e11a0cce742939ea52cc62dc9087b9bd9ca3f850ea135025`. No image redeployment or D1migration was needed. This packet adds evidence and corrects stale runtime handoff text, not an application branch or second D1writer.

## Preconditions and method

Ran `node --test tests/public-outbox.test.mjs` on empty local PG/D1 fixtures:12/12PASS, including429/shared cooldown, lost acknowledgement, denied-token redaction, per-site order and target pin. Prepared PRhead `2e1e57f2abc8a7f62280d4a3402ca4a2f199566d` passed3/3CI before VM work: [application/public-outbox](https://github.com/cfotel2604/html-share-platform/actions/runs/40170713915), [documentation](https://github.com/cfotel2604/html-share-platform/actions/runs/40170713928). Source/config/core checksums matched the already deployed artifact; immutable D1SQL0004/0005/project.sql matched their approved hashes. Fresh Node-secret-store metadataGET confirmed the private target fingerprint/name/ID and disabledreplication. Initial queue0,2sites/4versions/PGledger4; oldhsp-labimages/state and HSPnginx fingerprint matched prior receipts.

Only the original synthetic500filefixture was rotated/published/revoked/unpublished through existing Node functions and fresh PGAdminpolicy locks. The separate owner's HTTP500retest fixture/link was preserved. The controlled runner used the existing `createD1Writer`/project.sql and `projectOnce`, including its PGadvisory lock, per-site ordering, durable request reservation and real retry timestamps. No payload/control/clock edits, arbitrary SQL writer, R2writes/deletions or new token. The public viewer was observed without copying raw codes, token values or content into evidence.

429and503responses and the lost acknowledgement were injected at the Node harness transport. They are **not actual Cloudflare-generated429/503 or a real network incident**. PG/outbox/backoff, projector execution, subsequent D1REST batches, public response and Studio warning were real pilot operations. This distinction is part of the result.

## Results — one revoke event51

| Attempt | Transport / effect | Durable result |
| --- | --- | --- |
|1 | Controlled429, no outgoing D1batch | pending/rate_limited,300000ms shared cooldown despite Retry-After1second |
|2 | Controlled503after the full cooldown | pending/http_503,5000ms retry |
|3 | Real RESTbatch committed revoke; harness discarded the acknowledgement | pending/network,8000ms retry; public already404 |
|4 | Real RESTretry of the same event |0changes/changed_dbfalse, projected, last_errorNULL, public remains404 |

The same normal projector container was started/stopped by exact ID during cooldown. Attempts remained1 and the durable deadline stayed identical across the restart; no clock/metadata change or second429injection. The two real fault-delivery RESTbatches were9085ms apart, above the5000msfloor. Fixture preparation and metadataGETs are separate from that two-batch counter. No attempt was made to exhaust Cloudflare's shared1200requests/5minute budget.

Actual COMMIT→final projected **314865.149ms**. This is a deliberate outage sample, not pooled with the previously published healthy20sample p95=5298ms. At observed enqueueage280162.953ms, public still returned200 while revoke was pending: there is explicitly **no60second blocking guarantee during the fault**. After the real write/acknowledgement loss, public was404even though PG still marked the eventpending. Idempotent retry changed0rows; a further public read after5seconds remained404. Source rows and unrelated fixture fingerprints stayed intact.

## Actual Studio warning

Using the owner's already authenticated Admin browser, refreshed the site list once during the pending interval. The original fixture displayed **“Thu hồi link chưa đồng bộ quá60giây ·1sự kiện ·đang thử lại”**. After projection completed, that warning disappeared through the existing visible15secondrefresh, without a second manual refresh. `document.visibilityState` was visible. Task-local screenshots retain the real UI before/after with no token, grant URL or identity. This is real Studio-channel evidence; it makes no promise for closed/hidden Studio or VM/API outages and installs no external collector.

## Supervisor failure retained and corrected

The first supervisor run is a **FAIL**, not discarded. `docker compose ps -aq projector` also included the ephemeral projector runner, so its container-ID assertion failed even though the cooldown state checks had passed. `compose start projector` also followed dependencies and invoked the existing PostgreSQL migration checker. That checker applied no new SQL: all4ledger names/checksums matched the pre-fault rollout receipt and canonical source afterward. No D1migration was invoked or applied SQL edited. The failed receipt and its original429event are retained.

Stopped the exact scoped ephemeral fault container after the supervisor exited, kept normal recovery available, then paused only the original new projector by verified ID to resume event51. Corrected control uses direct `docker start/stop <verified-ID>`, avoiding Compose dependencies, and supervises a uniquely named ephemeral runner with failure cleanup. Resumed the **same pending event and original cooldown**, without changing timestamps, clearing errors or generating another429/revoke. Successful resume bundle SHA256 `613717dec4b14968491ddf03067017df2ffc7098dbeeeacb53e7cc27a8f27d1f`; first failed bundle `0ce0776ea3b8c4751b1a6dc5bb6e670ac52bdbe08a5f666cb65f015916333469`. These task-private one-shot runners must not be blindly rerun against completed event51.

## Token scope — owner confirmation,2026-10-25

Owner confirmed that `hsp-projector-pilot` was created exactly according to the settled policy: the existing pilot account, D1Edit (read/write) only, no Workers/R2/account-administration permission. Record the scope gate as **owner-confirmed**, not pending. No token value, screenshot, policy export or new credential was requested or collected. Earlier Node-runtime target/secret-separation readbacks remain their own evidence. This confirmation is separate from the still-unrun rotation/revoke drill; do not ask the owner to choose or confirm the same account/scope again.

## Final readback and commands

Original projector container running; db/web/previewhealthy, migrateexited0. Outbox pending/errors/overdue0;2sites/4versions/PGledger4/1publishedsite. All applied PGchecksums equal the pre-fault receipt and canonical source. Oldhsp-labsource/images/state/data/volumes and nginx unchanged.0R2writes/deletions, no new token or rotation, no Worker redeploy, DNS/UFW/tunnel/old-service/wholeVM action. [Structured receipts including the failure](2026-10-25-projector-faults.json).

Commands actually run: repository status/worktree/remotes/fetch; GitHub48merge/head/check queries; application/config diff against2a396ae; empty local projector tests; docs/YAML/diff checks; task-private `python tmp/run_pilot_faults.py`, scoped recovery/ledger checks, `python tmp/final_preview_status.py`; browser read/refresh/DOM/screenshot checks. The ignored runner uses secrets only inside the existing Node runtime, never token arguments/output. Protected receipts remain under `/opt/hsp-aprime/runtime/faults/<bundle-hash>/receipt.json`.

Remaining: real Cloudflare prolonged429/503 (not forced by rate exhaustion), actual token lifecycle, D1drift/R2missing-or-corrupt-pin fault cases beyond existing local/CIcoverage, Employee/mobile/parent-cookie matrix, owner-deferred oldviewerretirement and ownerpilotacceptance/#10. No gate is marked PASS from an unexecuted or simulated scenario. Keep PRDraft for owner review/merge; no production approval or owner acceptance is inferred.
