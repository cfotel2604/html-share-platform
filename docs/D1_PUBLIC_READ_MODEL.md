# D1 public read-model contract

Contract hiện hành của A'; PostgreSQL là nguồn sự thật, projector/recovery Node là writerduy nhất. [ADR-0006](adr/0006-postgresql-source-of-truth-d1-public-read-model.md), [schema/SQL](../cloudflare/read-model/queries/project.sql), [primarylookup](../cloudflare/read-model/queries/resolve.sql).

## Alloweddata và projection

Publicrows chỉ `share_code, site_id, status, active_version, manifest, projection_version, updated_at`; statuspublished/unpublished/revoked. Không identity/email/allowlist/role/audit/session/receipt hoặc title-description cho platform OG shell. Sharecode 10base62, site 32 hex, immutable versionUUID; manifestasset exactlypath/r 2_key/size/etag, keypin theo sourceversion. D1 không là managementbackend.

Projection dùng đúngproject.sql với monotonicallyguardedrevision; duplicate/oldkhông overwritehigher/tombstone. Rotation/revoke retainhistoricalcodes; không DELETE/REPLACE/sequence reset. Handlerchỉ PG transaction+outbox; recoverycũng enqueuefreshsourceevents/audit và reuseprojectorcore, không alternatewriter. Fullmanifest/path/quota/runtimewhitelist có code/statictests.

Resolve dùng fixedparameterized SELECT theo code COLLATEBINARY/statuspublished, không trả rowcho revoked/unpublished/missing. Worker chỉ tối đa mộtquery/request; kiểm manifestpin và R2 get/head theo contract. No admin/previewroute/Nodecallback.

## Schema và giới hạn tại serving boundary

| Trường | Ràng buộc |
| --- | --- |
| `share_code` |10 ký tự ASCII base62, `COLLATE BINARY`, primary key |
| `site_id` |32 ký tự hex lowercase, identity không đổi |
| `status` |`published`, `unpublished`, `revoked` |
| `active_version` |SQL yêu cầu nonempty khi published; Worker kiểm đúng UUID. Denial state phải NULL |
| `manifest` |JSON array tối đa500 asset, đúng một `index.html`, path không trùng, tổng size≤100MiB. Denial state phải chính xác `[]` |
| `projection_version` |Số nguyên dương≤9007199254740991 |
| `updated_at` |UTC ISO timestamp có milliseconds, dạng canonical `...SS.mmmZ` |

SQL triggers giữ identity, permanent revoked tombstone và no-delete, bỏ qua stale update kể cả caller thiếu UPSERT guard. Mỗi asset chỉ có `path/r2_key/size/etag`. Worker siết thêm manifest JSON≤1MiB, safe/allowlisted path, UUID/version prefix chính xác và ETag theo grammar tối đa128ký tự. Không dùng check SQL lỏng hơn để bỏ serving validation.

## Primary read policy

Pilotrequires actual `read_replication.mode=disabled`; metadata thiếu làunknown. Query dùng basebindingprepare trực tiếp, không Sessions/bookmarkreused. Target/account/schema/config phải matchprivateapprovedreceipt và metadata trước mutation. Nếu thayreplication/introduce Sessions/target, cần reviewedprimaryreadplan; không suy templatelocal làserverstate.

## Appliedschema và localrehearsal

D1 pilot 0004 public_read_model và 0005 retire_pilot_legacy đã áp/immutable.0004 tạo modelrỗng, không importlegacy;0005 retire 11 legacytables với guardedactualreceipt. Không listpending rồi apply 0004/0005 lại, không dùng provisioninglegacy hoặc currentmigrationdirectory như freshpilotsetup.

```sh
npm ci
node --test tests/d1-read-model.test.mjs tests/pilot-legacy-retirement.test.mjs
```

Các test tạo localdisposableD1, comparepopulatedlegacypreservation/retirementguards. Không đụng remoteresource. Newschemachange luôn migrationadditive mới, reviewedcontract/outbox/Workercompatibility và scope mutation rõ ràng; không sửa file đãáp.

Proof theo ngày/head ở [schema 0004](validation/2026-10-24-d1-read-model.md), [execution 0005/cutover](validation/2026-10-24-aprime-pilot-execution.md), [acceptedledger](PILOT_APRIME_ACCEPTANCE.md). Historical pre-apply “absent/pending” trong đó không là tình trạng pilot hiện tại.
