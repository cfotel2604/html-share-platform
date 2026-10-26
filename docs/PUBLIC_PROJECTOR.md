# Transactional outbox và Node projector — hiện hành

PostgreSQL là nguồn quản trị duy nhất. Code 33/PR #42 đã merge và được pilotaccepted; đây là contract/runbook đang dùng, không phải branch đang chờ. [Authority](PILOT_APRIME_AUTHORITY.md), [D1 contract](D1_PUBLIC_READ_MODEL.md), [receipts](PILOT_APRIME_ACCEPTANCE.md).

## Transaction và ordering

Applied PGmigration 0004 public_projection_outbox độc lập với appliedD1 migration 0004. Không apply lại hoặc sửa SQL. Triggers capture status/activeversion/sharelinks trong cùng PG transaction; site lock trước revisionallocation, deferredsnapshot gồm verified manifest cuối transaction. Snapshot/audit/state lỗi thì rollback cùng nhau. Handler không dispatch REST.

Outbox có payload/order/pending-projected/attempts/nextattempt/sanitizederror/projectedtime; id là projection_version. Oneevent/site/source transaction coalesceschangedcodes. Per-siteFIFO và prioritycho revokechain, không bypasspublicationfailedhead để làm sống lạicode. Rotate oldtombstone+newpublication trong một batch. Existing immutabletombstones không xóa/reuse.

Version thiếu verifiedETag không được republish/rotate bằng fabricatedmetadata; newverified Nodeupload hoặc reviewedrecoveryplan. Denial/unpublish/revoke vẫn có đường thực hiện. Queue 0 không chứng minh D1 khớp lịch sử; dùng reconcile.

## Job và quota

`npm run project:public` là Node job riêng, không webhandler. Nó cần cả PROJECTOR_ENABLED=1 và PROJECTOR_REMOTE_APPROVED=1, PG source bền vững, target pin và token Node secret store. Defaultsdisabled; chỉ enable trong scope được giao. Không credentialdiscovery từWrangler hoặc substitution bằng ephemeral PG.

| Setting | Contract |
| --- | --- |
| D1_PROJECTOR_ACCOUNT_ID/DATABASE_ID | Approvedtarget, fingerprint PG persist; khác target thì refuse, không resetpin |
| D1_PROJECTOR_API_TOKEN | Chỉ process env từ operator secret store; không args/Git/log/response |
| PROJECTOR_INTERVAL_MS | Default/minimum 5000, maximum 300000 ms |
| PROJECTOR_REVOKE_ALERT_MS | Default 60000; configurable 1000–86400000, pilotgiữ 60000 theo ownerpolicy |

PG sessionadvisorylock + durableslot serialize mọi instance/recovery cùngsource. Oneguarded REST batch/event/attempt qua đúngproject.sql, không per-filecalls. Duplicate/oldpayload không overwritehigherrevision/tombstone; lost ACK đểpending cho replay.

Minimum 5 sspacing giới hạn khoảng 60 scheduledcalls/5 min/sourceDB; accountbudget 1200 requests/5 min là **shared**, không quota được reserved. Otherclients/metadatacalls/sourceDB vẫn tiêu budget. Retry exponential capped 5 min;429/401/403 alert+shared cooldown ít nhất 5 min, longer Retry-After được tôn trọng. Endpoint HTTPS fixed, no redirects,15 stimeout; chỉ allowlistederrorcodes, không provider body/SQL/token/payloadlogs.

## Quan sát và Studio

Events projected/metrics/rate_limited/auth_failed/retry và DB/tickerrors có sanitizedfields; metricsmỗi 60 s trong lúc jobchạy. lagbasis commit khi PGtrack_commit_timestamp đã bật/retained, nếu không là enqueue_upper_bound. Job không tự sửa PG settings. Existingproposal event/benchmarklabels là lịch sử, không đổi thresholdownerđãchốt.

Admin `/api/sites`/`/api/workspace` có projectionpending/depth/age/error/revoke_overdue; Employee không thấy metadata vận hành. Studio visible/pending 15 srefresh, stale-refresh warning và auto-clear sau drain; không idle/hiddenpoll, không cachequyền liênrequest. Owner chọn **Studio-only**, không mandatoryexternalcollector/watchdog, không promise khi job/VM/API/tabkhông hoạt động.

Healthy COMMIT-revoke→public 404 p95≤60 s, pending>60 swarn; incidentlag/depth/recovery/containment báo riêng. Một publication cũ bị lỗi có thể trì hoãnrevoke đến khi RESThồi phục; không 60 s trong outage blocking guarantee.

## Token policy và restart

Existingpilotaccount; dedicatedD1 R/W only, không Workers/R2/accountadmin, không dùng chung Wrangler/dashboard. Operatorsecret store/startupenv only. Receipt 25/10 active name hsp-projector-pilot-1, originaltokenrevoked; normal rotation hoàn tất, nextregular 2027-01-23.90 ngày hoặc suspectedleak/adminchange/VM compromise thì rotate.

Trình tự thường: operator creates replacementcùngscope → updateprotectedstore → restartchỉprojector theo [Noderunbook](PILOT_APRIME_NODE_ROLLOUT.md) → verifydrain/revoke/readback → operatorrevokeold → recorddate/nameonly. Không lấy hash/value token hoặc tự tạo credentialclassmới.

Emergency: operatorrevokengay; Nodefailclosed/outboxgiữpending/Adminwarn. PublicD1/R2 không dùng tokennày nên stateđãchiếu vẫn đọcđược. Khôi phục token/projector theo policy và reconcile; containmentpublic khi cần phải là ownercontrolledaction, không suy tokenrevoke làm public 404.

## Recovery/rollback

Giữ source/schema/outbox/tombstones/audit, fix/replay/reconcile. Không resetsequence, editpayload, reversewriteD1→PG, restorelegacy backend hoặc dropmodel. [Recoveryrunbook](READ_MODEL_RECOVERY.md) là writerpath duy nhất còn lại. [Appliedschema](D1_PUBLIC_READ_MODEL.md) và [lastreceipts](PILOT_APRIME_ACCEPTANCE.md) không là quyền migration/deploy mới.
