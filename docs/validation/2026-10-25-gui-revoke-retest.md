# Owner GUI revoke retest and success notice —2026-10-25

Refs #38. Owner reported PR57merged; GitHub verified merge3eff4e12514f5b568306007a4fc23cd318958a49, head9454633/4CI. Current pilot at start is source55b99d1/image c3549538. This is a one-line notice correction and an evidence update, not a serving/authorization change.

## Owner-confirmed functional result

Owner logged into Studio, created a fresh link and published the existing A-prime browser boundary fixture; the link was viewable. Owner then revoked through the GUI, saw the success notice, refreshed the old public link and observed Not found. Record **GUIrevoke owner-confirmed PASS** for this case. No response trace or elapsed time was supplied, so this adds no numericalSLOsample and does not change healthy20samplep95 or previous outage reports. It does not imply owner pilot/release10acceptance or the full Employee/mobile/session matrix.

The same success notice still claimed direct content remained accessible while published. PR57corrected3strings in site-list.tsx but missed the separate success notice in use-studio.ts; this omission is now corrected. New suffix: “Link cũ sẽ bị chặn sau khi đồng bộ public.” It describes asynchronous public propagation and makes no outage-time guarantee. Already loaded tab bytes can remain, as the existing explanation states.

## Scope and validation

Change only that notice string; no new test that mirrors the text, no handler/session/RBAC/outbox/projector/Worker/grant/cache/SQL change. Search all Studio source for the stale direct-access claim. Run local lint/typecheck/existing tests/build/docs/diff and exact-headCI. Use already authorized bounded pilot rollout only after the artifact passesCI, preserve source/data/volumes/oldviewer/secrets and the owner's current published/revoked test state; never repeat source mutations or tokenrotation for this copy fix.

Record any readback as independent evidence; preserve owner-confirmed and measured evidence separately. No migration, Worker deploy, token action, DNS/UFW/tunnel change or R2deletion. Final source/image/head/CI and remaining gates will be appended after validation. Keep Draft for owner review/merge.
