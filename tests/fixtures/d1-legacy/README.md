# Legacy D1 upgrade fixture

These three SQL files are byte-for-byte copies of `cloudflare/migrations/0001_pilot.sql`, `0002_cleanup.sql` and `0003_cleanup_resweeps.sql` at commit `618226222e50a7e25cc1c3da93455a1ce5c7dece` (Draft PR #29; migration history from PR #24). They are test fixtures, outside the read-model migration directory. Do not apply them to a fresh A' read-model database.

The D1 test creates this legacy schema, seeds only synthetic identities and a revoked code, then proves migration 0004 changes none of the existing schema or rows. Keeping these fixtures allows CI on a shallow `main` checkout to reproduce the additive upgrade without fetching or merging the old PR stack. No live data or credentials are included.
