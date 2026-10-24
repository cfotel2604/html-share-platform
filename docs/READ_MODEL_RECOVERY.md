# Read-model rebuild and reconciliation — Issue #34

Refs #34 / Epic #31. Base freshly fetched main `a98a1d62e9a2a51b841e548792979e712190774d` after PR42 merged. PostgreSQL is the sole source of truth under ADR-0006; the guarded D1 contract and applied migrations remain unchanged.

## Implementation scope

- An operator-only Node command compares PostgreSQL public snapshots with D1, paginates reads, prints a redacted dry-run diff and requires that reviewed plan for apply.
- Rebuild queues fresh snapshots for all PostgreSQL codes, including permanent tombstones; reconcile queues only repairable differences. Recovery reuses the transactional outbox and existing projector write contract/throttle. No direct handler/Worker write or alternate UPSERT.
- Source snapshots/audit commit together under site locks. D1 revision ahead of source, identity mismatch, unknown codes or a D1 tombstone conflicting with a live source code stop repair rather than weaken permanent-identity/revocation guards. Legacy missing verified ETags also stop publication snapshots.
- Local/empty and isolated CI PostgreSQL tests first. No real D1 projection/rebuild, VM/local Docker, deployment, applied-migration edits or owner private-file/worktree access. Any remote write still needs separate explicit approval.

## Owner workflow update — 2026-10-24

The owner reports each merge in chat; only then continue the next issue (#34 → #36 → #37, prepare #38), one branch/Draft PR per issue. The earlier heartbeat automation was deleted at the owner's request. Do not recreate monitoring or poll for future merges. PR42 is verified MERGED; #33 remains OPEN for unrun pilot gates. Token policy and the unconfirmed60second proposal remain as recorded in PUBLIC_PROJECTOR.md.

Implementation and runbook validation are in progress. No acceptance is claimed for the real pilot or an independent runbook reader yet.
