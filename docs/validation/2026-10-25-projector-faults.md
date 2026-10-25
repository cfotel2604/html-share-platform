# Remaining A-prime projector fault evidence —2026-10-25

Refs #38. Owner merged48; verified main1fbe19c and4/4CI at6809656. Application/config trees equal the already deployed2a396ae/image d927742b, so no image deployment or migration is needed.

## Bounded packet

Run the existing empty local projector tests first. Then recheck the active VM image/source, immutable SQL, private target fingerprint/name/replication, current queue and unrelated published fixture. Use only the original synthetic500filefixture, actual Node operations/fresh PGAdminpolicy, existing createD1Writer/project.sql and projectOnce with its advisory lock/durable request reservation. Never write D1 from a handler, edit event payloads/timestamps/control metadata, exhaust the shared rate budget or alter an applied migration.

Stop only the new projector while the supervised Node projector harness runs; restore the original service in finally. Inject429and503responses in the harness transport, then use the real REST transport for a lost-acknowledgement attempt and normal idempotent retry. These are controlled Node transport failures, not evidence that Cloudflare itself returned429/503. Honor the full300secondshared429cooldown and actual retry timestamps; no accelerated clock. Keep any outage/stale-public interval separate from healthy latency samples. Observe overdue Admin state on the already authorized Studio session. Preserve the owner's separate published HTTPfixture/currentlink and oldviewer4100.

No token creation/revoke/rotation, R2writes/deletion, DNS/UFW/tunnel/oldservice/wholeVM changes. Actual Cloudflare prolonged429, token lifecycle, full IAMpolicy, R2corruption and mobile/Employee/#10remain open unless separately evidenced. Log only safe codes/counts/timing/hashes, never token/capability/body/identity values.

## Status

Prepared; local and remote results will be recorded here. No PASS inferred from merged source. PR remains Draft for owner review/merge; no owner pilot acceptance or production decision follows.
