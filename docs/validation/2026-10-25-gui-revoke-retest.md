# Owner GUI revoke retest and success notice —2026-10-25

Refs #38. Owner reported PR57merged; GitHub verified merge3eff4e12514f5b568306007a4fc23cd318958a49, head9454633/4CI. Current pilot at start is source55b99d1/image c3549538. This is a one-line notice correction and an evidence update, not a serving/authorization change.

## Owner-confirmed functional result

Owner logged into Studio, created a fresh link and published the existing A-prime browser boundary fixture; the link was viewable. Owner then revoked through the GUI, saw the success notice, refreshed the old public link and observed Not found. Record **GUIrevoke owner-confirmed PASS** for this case. No response trace or elapsed time was supplied, so this adds no numericalSLOsample and does not change healthy20samplep95 or previous outage reports. It does not imply owner pilot/release10acceptance or the full Employee/mobile/session matrix.

The same success notice still claimed direct content remained accessible while published. PR57corrected3strings in site-list.tsx but missed the separate success notice in use-studio.ts; this omission is now corrected. New suffix: “Link cũ sẽ bị chặn sau khi đồng bộ public.” It describes asynchronous public propagation and makes no outage-time guarantee. Already loaded tab bytes can remain, as the existing explanation states.

## Scope and validation

Change only that notice string; no new test that mirrors the text, no handler/session/RBAC/outbox/projector/Worker/grant/cache/SQL change. Search all Studio source for the stale direct-access claim. Run local lint/typecheck/existing tests/build/docs/diff and exact-headCI. Use already authorized bounded pilot rollout only after the artifact passesCI, preserve source/data/volumes/oldviewer/secrets and the owner's current published/revoked test state; never repeat source mutations or tokenrotation for this copy fix.

Record any readback as independent evidence; preserve owner-confirmed and measured evidence separately. No migration, Worker deploy, token action, DNS/UFW/tunnel change or R2deletion. Final source/image/head/CI and remaining gates will be appended after validation. Keep Draft for owner review/merge.

## Completed artifact and independent readback

Draft [PR #58](https://github.com/cfotel2604/html-share-platform/pull/58). Artifact source `2734de5f6b345050f95b0db75bab9ac71b908de7` passed all four CI checks (`validate-docs`, `application`, `public-outbox`, `auth-upload-origin`) before rollout. Local lint, typecheck, all176unit tests, build, docs and diff checks passed. Studio source scan found no remaining old direct-access claim. Final documentation-only head/checks are recorded in the PR, separately from the deployed source.

Canonical Git-LF archive:226files, SHA-256 `1cad449a576c03b476dbc0bce5ee21df79758b908fde4ca261e25c6b030bc2a4`; every archived file compared with its Git blob. Active Node image `sha256:2fd14cccc9bfd9e3402b968c4eebeff664d0519cd069e55e88bf95cd768c1a8b`. The actual nonroot image probe passed uid1000/30readable files/projection-library imports. Immediately before update, the running projector credential confirmed approved account/database, name hsp-pilot-desktop and replication disabled. No credential value was retrieved/exported.

Only new-project web/preview/projector were updated with `compose up --detach --no-deps --wait --wait-timeout 120 web preview projector`. PostgreSQL and migrate container IDs were retained; migration service was not started. All three healthchecked services remain healthy and projector running. Old hsp-lab source/images/service states, nginx hash, old viewer route, PGvolume and secrets were preserved. No applied SQL/Worker/tunnel/DNS/UFW/token change or R2deletion.

Read-only PG/public probes before and after confirmed3sites/5versions/4ledger entries/pending0/errors0. The browser fixture is **published with zero active codes**; its latest event64 is projected/revoked, attempt1, no error, and its latest revoked URL returns404. This directly supports the owner's report without changing that state. Two sites currently have status published; the old one-published snapshot is superseded. A fingerprint over site status/version, link timestamps/revocation and outbox progress is identical before/after (`fd5d8e7f0a09cd163599201d3cbc08f1c847c2b38270e70fcd5e610f6932381c`). The separate owner's500manifest fixture remains published: HTML/CSS/JS each200, matching manifest size/SHA and no-store.

Deployed bundle inspection, with Unicode escapes normalized, found the new success suffix and no old success suffix. This is artifact inspection, not a claim of a new authenticated GUI render. Owner can refresh Studio to load it; **no repeat revoke test is requested**. No new source transaction, SLOmeasurement or token rotation was performed for this correction.

Validation-helper failures are retained: the first read-only probe assumed an ID column that share-link rows do not have and failed to release its connection; only that single diagnostic Node process was terminated. The helper was corrected to the actual schema and guaranteed release. A missing stdin flag/escaped-text inspection was also corrected before the final successful receipt. No product service/data mutation or failed functional revoke was caused; these are not acceptance samples.

## Commands and remaining work

Commands used at source2734de5: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `python scripts/check_docs.py`, `git diff --check`, Studio stale-text `rg` scan, and `gh pr view 58 --json headRefOid,mergeable,statusCheckRollup`. Task-owned helpers invoked `python tmp/revoke_notice_readback.py before 55b99d153818b5db0bf30c55c2ec997ae90e5871`, `python tmp/rollout_notice_candidate.py`, then `python tmp/revoke_notice_readback.py after 2734de5f6b345050f95b0db75bab9ac71b908de7`. They consume protected runtime configuration internally and print only safe metadata/booleans/counts; helper hashes and sanitized readbacks are in the adjacent JSON. No secret, cookie, raw share code or uploaded content is in this receipt.

Remaining: owner review/merge58; wider Employee/session/mobile/Safari/Zalo and uncovered live fault cases remain as listed in the acceptance ledger. This owner-confirmed GUI case replaces only the earlier inconclusive GUI-revoke snapshot. Old viewer retirement is owner-deferred; whole-pilot acceptance and release#10 remain separate. Rollback, if needed, uses the previous immutable source55b99d1/image c3549538 and retained deployment receipt via the bounded rollout runbook; never reset PG or reapply SQL.
