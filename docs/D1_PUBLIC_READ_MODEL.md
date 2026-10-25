# D1 public read model — contract and migration

2026-10-24; Issue #32 / Epic #31, [ADR-0006](adr/0006-postgresql-source-of-truth-d1-public-read-model.md). PostgreSQL remains the source of truth. This change defines SQL and local migration tooling only. Projector #33, rebuild #34, Node administration #35 and public Worker #36 consume this contract in separate PRs.

## Allowed data

`public_read_model` has exactly these columns. `share_code` is the binary, case-sensitive primary key and its index supplies the public lookup; no scan or separate site lookup is required.

| Field | Contract |
| --- | --- |
| `share_code` | Exactly 10 ASCII base62 characters, case-sensitive; permanent identity |
| `site_id` | Existing 128-bit site identifier, 32 lowercase hex characters; never ownership/user identity |
| `status` | `published`, `unpublished` or terminal `revoked` |
| `active_version` | Immutable version ID for published rows; `NULL` for denied rows |
| `manifest` | JSON array; each asset has exactly `path`, `r2_key`, `size` (bytes), `etag` (unquoted R2 ETag) |
| `projection_version` | Positive monotonic PostgreSQL event revision; integer ≤ 9007199254740991 for lossless JavaScript/D1 REST transport |
| `updated_at` | UTC event timestamp in canonical `YYYY-MM-DDTHH:MM:SS.sssZ` form, from PostgreSQL |

Published manifests contain exactly one `index.html`, unique paths, at most 500 entries and at most 100 MiB total declared size. Nonpublished rows contain `active_version = NULL` and `manifest = '[]'`. The SQL rejects malformed JSON, unknown asset keys and invalid field types. File path/type safety, create-only R2 writes and size/ETag integrity still require the Node upload pipeline and serving checks; schema validation does not replace those checks. The Worker derives Content-Type from the reviewed extension allowlist in #36; do not copy arbitrary R2 headers or add management fields to the manifest.

Forbidden: email, user/actor/owner IDs, external identity, roles, allowlist, audit, sessions/cookies/tokens, preview grants, upload intents/receipts, display names, uploaded HTML/asset bytes and arbitrary JSON metadata. Only the closed column/asset allowlist above may be projected. The legacy pilot has management tables from its old architecture; the additive upgrade deliberately retains those tables. Their presence is **not** evidence that a converted pilot meets the ADR-0006 data-minimization gate. Migration/cutover and old-data retirement need the #35/#37/#38 decisions; do not copy those tables into a fresh read model.

## Projection and lookup SQL

Use [project.sql](../cloudflare/read-model/queries/project.sql) only from the #33 projector or #34 rebuild, with bound parameters in column order. One UPSERT contains the entire public snapshot; projector events must commit with the source state in one PostgreSQL transaction. `projection_version` is the source event sequence, not wall time or the D1 migration number. Allocate/serialize it consistently with the final source state in #33. Never truncate a PostgreSQL bigint to fit the safe range: exceeding the range must stop projection until the transport contract is revised.

The SQL applies only strictly newer events for the same site. Equal/older deliveries are no-ops. `unpublished` may become `published` with a newer version; `revoked` is a permanent tombstone, including when an erroneously newer publish arrives. Rotating issues a new code and tombstones the old code in one D1 batch in #33. A new code may receive its revoke before its first publish: retain that deny row. Triggers also block direct stale UPDATE, identity reassignment, resurrection and DELETE. Use the supplied UPSERT; `INSERT OR REPLACE`, hand editing, DROP/recreate and tombstone deletion are outside the supported write contract.

Use [resolve.sql](../cloudflare/read-model/queries/resolve.sql) for the single primary lookup in #36. Missing, wrong-case, revoked and unpublished codes return no row. The Worker still checks the requested path against the returned manifest and pins R2 reads to size/ETag on every request. This PR adds no Worker, API route, REST writer or preview path.

## Migration 0004

[0004_public_read_model.sql](../cloudflare/read-model/migrations/0004_public_read_model.sql) is a self-contained additive successor to the pilot D1 migrations 0001–0003. Those migrations were inspected at PR #24 head `bb0327d` and PR #29 head `6182262`; the live pilot inventory on 24 October confirmed the same three filenames. Their unchanged copies exist only as [upgrade test fixtures](../tests/fixtures/d1-legacy/README.md). PostgreSQL migrations 0001–0003 and the old D1 files are untouched.

The [migration-only Wrangler template](../cloudflare/read-model/wrangler.jsonc) discovers only this read-model directory and records `0004_public_read_model.sql` in the existing `d1_migrations` ledger. An empty database starts at 0004 and creates only public read-model objects plus D1's internal migration bookkeeping. An existing pilot adds 0004 without replaying 0001–0003 or deleting any old tables/data. The new table starts empty: there is no import from legacy D1, since PostgreSQL is the source of truth. #33/#34 populate it after cutover planning.

Local checks (Node 22+ and npm; Wrangler 4.152.0 was used for the CLI check):

```sh
npm ci
node --test tests/d1-read-model.test.mjs
npx wrangler@4.152.0 d1 migrations apply hsp-read-model-local --local --config cloudflare/read-model/wrangler.jsonc --persist-to tmp/d1-read-model-local
```

The Miniflare tests execute the actual migration and SQL against both empty D1 and the legacy schema with synthetic data. They compare all legacy rows/schema before/after. Wrangler's migration ledger skips an already-applied file; SQL intentionally omits `IF NOT EXISTS` so applying it directly a second time reveals operator mistakes instead of concealing drift.

Remote application is a separate owner decision. Before approval, inventory the intended database ID/name/account and `d1_migrations` using the private ownership record, review this exact SQL and preserve the private receipt. Use a private migration-only Wrangler config with the verified account/database IDs and an absolute path to **this** migration directory. Keep `migrations_table: "d1_migrations"`. List pending migrations, verify that only 0004 is pending, then apply to the verified database by name with `--remote` only after authorization. Do not reuse a `--provision` script or the old API/preview Worker deployment commands. No resource IDs/tokens belong in Git or command output. **Pilot 0004 completed with explicit owner approval on 2026-10-24 at14:19 Asia/Saigon**; this is now a recorded procedure, not an instruction to reapply it.

Rollback before consumers are cut over: leave the additive table/ledger in place and retain the existing serving configuration. Once projection starts, pause projector/mutations as required by the incident runbook and preserve tombstones; do not DROP tables, restore old D1-primary writers or enable a legacy serving bypass. Rebuild/reconciliation belong to #34. Do not close #32's remote-migration acceptance until the approved application and readback have actually passed.

## Primary-read policy and evidence

The target database must have `read_replication.mode = "disabled"`. Read this setting from `GET /accounts/{account_id}/d1/database/{database_id}` using existing operator credentials in memory; a missing setting is unknown, not disabled. If it is `auto`, stop the serving cutover until the owner approves disabling replication or an explicit primary-read implementation. The public query must use the base D1 binding's `prepare()` directly, without `withSession()` or bookmarks. If Sessions are introduced later, a fresh `first-primary` session per request is required, with the single lookup as its first query; do not reuse a session across requests.

Cloudflare documents that [queries without the Sessions API run on primary](https://developers.cloudflare.com/d1/best-practices/read-replication/), and that [`first-primary` constrains only the first query](https://developers.cloudflare.com/d1/worker-api/d1-database/). The [database-details API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/get/) exposes `read_replication.mode`; a Wrangler file alone does not prove that server-side setting. Check it again before #36/#38 cutover and after configuration changes.

Read-only live check on **2026-10-24 13:41:50 Asia/Saigon** (`06:41:50.802Z`): ownership/account/database matched private pilot receipts, D1 `hsp-pilot-desktop` returned `read_replication: {"mode":"disabled"}`, the migration query metadata returned `served_by_primary: true`, and both metadata SELECTs returned `changed_db: false`. Only migration names and table names were read; no identities, codes, assets or upload bytes were retrieved. Migration 0004 was absent and no provider configuration or data was changed at that time. The [validation record](validation/2026-10-24-d1-read-model.md) distinguishes this historical read-only check, local emulation and the later authorized migration below.

**Subsequent authorized remote application:** at **14:19:04 Asia/Saigon** (`07:19:04.966Z`) 0004 was applied once after all owner-specified identity/replication/hash/pending-list guards passed. Readback confirmed the new table empty, ledger0004 present with prior entries unchanged, all11legacy tables/schema fingerprints unchanged, replication still disabled and no migrations pending. See the [remote evidence](validation/2026-10-24-d1-read-model.md). No serving cutover or other runtime/deployment action accompanied the migration; source review/merge remains a separate decision.
