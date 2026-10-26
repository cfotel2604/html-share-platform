# Quản trị Node/PostgreSQL A'

Code 35/PR #41 cùng 48/51/53 đã merge/được pilotaccepted. Node/PG là **đường quản trị duy nhất**; Worker chỉ publicreader, Node gateway chỉ grantpreview. [Architecture](ARCHITECTURE.md), [authority](PILOT_APRIME_AUTHORITY.md), [evidence](PILOT_APRIME_ACCEPTANCE.md).

## Auth, API và bootstrap

METADATA_BACKEND chỉ absent hoặc exactlypostgres; cloudflare/d 1/empty/unknown bị reject, không fallback. Clerk chỉ trusted Studiohost, session_token/authorizedparties, onlineactivesession, verified Googleprimaryemail và active PG allowlist. Không cấp role từ JWT/clientmetadata; mọi mutation khóa/check actor/policy và siteownership/Admin trước ingest/storage, có audit. Không mint/refreshtoken qua Worker.

`GET /api/workspace` same-origin/no-store trả auth+filteredsites trong một bootstrap identity chain; không permissioncache liênrequest. Livenesslocal không provider; readiness PG không Cloudflare/Clerkhealthcall. Admin DTO có projectionpending/depth/age/sanitizederror/revoke_overdue, Employee không có operationalmetadata. Studio chỉ visible/pending 15 srefresh, warningstalefailure/cancelignore/logoutclear; không idle/hiddenpoll.

## Upload, publication và cleanup

Node kiểm quota/ZIP/traversal/symlink/duplicate/activeformats; reserve immutable version trước objecteffects. Conditional PUT nooverwrite; per assetsize/SHA/ETag readback trước stablemanifest/activeversion/audit/outbox COMMIT. Fixedceiling 12 transfers, first errorstopscheduling, drainmọi startedtransfer trước rollback/confirmed-keycleanup. Unconfirmed PUT/collision/uncertain COMMIT không được xóa speculatively; refresh/reconcilethayblindretry.

Publish/unpublish/rotate/revoke/updatecommit ởPG với orderedoutbox; handler không RESTD1. Currentpublicorigin phải HTTPS khác StudioregistrabledomainincludingprivatePSL; unsafe/missingconfiguration fail beforeobjecteffects/publish. Emergencyunpublish/revoke vẫn available. Updatekeepscode, rotation/revocation có permanenttombstone. [Linkcontract](SHARE_LINKS.md), [projector](PUBLIC_PROJECTOR.md).

## Preview và operator

`createPreview` fresh Nodeauth/policylock, immutable versionscope, cryptographic 128-bit base32token/hash-only PG/TTL 3 phút/audit. `p-<32hex>--<26base32>` label 62; Node gatewaychecks grant/actor/allowlist/ownership/version/expiry từngasset và hashesbodytrướcserve. HTTP sandbox/no-cookie/no-store/Studioancestor; previewiframeallow-scripts only. No public Node/vieweralias, Worker preview hoặc adminsession trong content.

Policyoperator CLI (`scripts/auth-allowlist.mjs`) nhận inputstdin, validates PG actor/policy/audit theo scope; không manualusers SQL hoặc importlegacyidentity. Bootstrapfresh PG đãxong, không chạy lại để cóAdmin. Runtime roles theo [secretroles](PILOT_APRIME_SECRET_SETUP.md).

## Môi trường và giới hạn

R2 private cho pilot; MinIO chỉ isolatedlocal/CI. Existingold lab/volumes/testlinks khácproject, không migrateinto A'. Applied PGSQL/D1 SQL immutable. Actual 500 file/R2/lifecycle/preview evidence không được suy từ unitfixtures;11.862 s là Node/operator, không fresh GUIlatency SLO. No backup/restore/retentionsweeper mới được suy từ documentnày. [Development](DEVELOPMENT.md), [runtime runbook](PILOT_APRIME_NODE_ROLLOUT.md).
