# Runbook rebuild/reconciliation A'

PG source of truth; D1 publicmodel chỉ được chiếu qua Node projector/recovery. Công cụ 34/PR #43 đã merge, localindependent-reader và actualpopulatedpilot có receipts. Quyền namedpilot theo [authority](PILOT_APRIME_AUTHORITY.md), không prepare-onlygate cũ; rechecktarget/source/artifact/fingerprint/policy vẫn bắt buộc. Không dùng runbook như quyền mở rộng target/production.

## Local rehearsal không provider secret

```sh
npm ci
node --test tests/read-model-recovery.test.mjs
```

Fresh PG lite/Miniflare/syntheticstorage, không `.env`, Docker/VM hay networkD1. Bao gồm emptyrebuild/driftrepair/source-policyrace/429/conflict/101 tombstone/pageguard. [Independent-reader receipt](validation/2026-10-24-read-model-recovery.md) là kết quả riêng; không cần gọi agent mới để lặp acceptance đã hoàn tất.

## Trước operator command

Đúng durable PG source/approvedD1/account/schema/ledger/replication disabled, reviewedsource/image và Admin active PG allowlist. Không token trongargs/chat/Git; loadprotected Nodeenv. READ_MODEL_RECOVERY_ENABLED=1, PROJECTOR_REMOTE_APPROVED=1 và READ_MODEL_OPERATOR_ID hợp lệ phải do operatorcấuhình. Không chạy bằng môi trường web thiếuD1 token hoặc PG fixture vào realtarget.

Các bước sau chỉ trong scope được giao; nếu target/pin/identity/ADR conflict thì stop, không “ngoại lệ” bằng SQL. Source mutation/projector có thể invalidateplan, chọn quietwindow được giao thay vì editclock/payload.

## Dry-run, review, apply, readback

```sh
npm run recover:public -- reconcile --dry-run
npm run recover:public -- rebuild --dry-run
```

Planredacted chỉ count/code_ref đã hash/fieldnames/fingerprint, không raw code/identity/assets. Dry-run không sửa source/outbox/audit/D1; **có thể ghi PG throttle metadata** để reserve REST slot dùng chung, nên không phải tuyệt đốiread-only trên PG.

Reconcileexit 0=no differences,2=repairabledifferences,3=invariantconflicts; transport/config/source changeexit 1. Rebuild gồm mọi historical PG codes/tombstones, không importlegacy D1 management. MissingverifiedETag blocksnapshot; không fabricateETag hoặc readR2 từmigration.

Sau review đúngfingerprint/scope, chọn **một** thao tác apply cần thiết:

```text
npm run recover:public -- rebuild --apply --plan <reviewed-64hex-fingerprint>
npm run recover:public -- reconcile --repair --apply --plan <reviewed-64hex-fingerprint>
```

Toolrecomputesplan, prevalidate toàn bộ source, locksactor/policy/site từngchunk và commitsfreshoutbox+recoveryaudit cùngtransaction. Chỉ existingprojectorcore ghi D1, one batch/event/chunk tối đa 100 codes. Có thể drain các pending event cũ events để giữFIFO. Không atomic toàn bộ qua mọi site/chunk: fail sau một chunk thì giữ validcommits/audit, replan/replay; không xóa chúng hoặc reuse stale fingerprint.

Successfulapply phải reconcile cuối 0 diff; không gọi HTTP 200/projectedmarker/queue 0 là match. Unknowncode, identityconflict, target ahead hoặc revoked/liveconflict chặn toàn plannedrepair trướcenqueue; cần ownerrestore/newtarget/containmentplan, không overwriteguard hay lấy sequence từD1.

## Budget và bounds

Read/write chia advisorylock 330006 và durableminimum 5 sslot; fixedcase-sensitivekeyset SELECT 20 rows/page.429/auth shared cooldown ít nhất 5 min/longer Retry-After; stopdiscretionaryscans, không loopđểné throttle. Source/target bounded 10000 codes/16MiBpublic JSON; vượtbound stop, không truncate“success”. PG snapshot repeatable-read + fullsourcecomparison sau D1 pages; no distributedsnapshot, source change có thể inconclusive.

## Incident và containment

- Ordinarypending: inspectsanitizeddepth/age/error/process, restoreexistingprojector nếu sourceổn; drain rồireconcile, không fullrebuild mặc định.
- REST 429/5 xx/auth: giữ queue/audit, honordeadline, giảm scans. Token theo 90 day/incidentpolicy; no valueexport. Khi healthy lại thì reconcile/rebuildnếu thiếu/lệchdata.
- Emergencycontentdenial: Node Adminrevoke/unpublish trước để PG/outbox/audit ghi actor thật. Nếu RESTđược nhưng loopbroken, dùng reviewedfingerprint/auditedprojector của recovery, kiểm Worker 404. REST/tokenkhông dùngđược thì statepubliccũ có thể còn; ownerphải quyết định servingcontainment theo authority, giữ blocked đếnkhi projection+readback khớp. Không ad-hocD1 write hoặc coi tokenrevoke là publicblock.
- Rollback: giữ schema/source/tombstones/events/audit, fix/replan/replay. Không restoreD1 primary/admin Worker, rawR2 publicbypass hoặc resetvolume.

Healthy revoke≤60 s và warningpending>60 s không áp dụng như publicblockingguarantee lúc outage. Ownerchọn cảnh báo Studio, không yêu cầu externalcollector; khi jobdừng metricsdừng, không có externaldeliverypromise. [Acceptedledger/limits](PILOT_APRIME_ACCEPTANCE.md).
