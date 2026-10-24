# A' pilot acceptance preparation — Issue #38

Refs #38 / Epic #31 / release gate #10. Base freshly fetched main `76b38faf169477af480690f222123214f4d8c3c5` after owner reported PR45 merged. ADR-0006 is the accepted target; PR39/41/42/43/44/45 source is merged. This document prepares a reviewable pilot plan, not execution authority or a completed acceptance report.

## Authority and present state

Authorized now: repository/source review, local empty tests and documentation, read-only Cloudflare CLI metadata where needed, new task-owned private config preparation. This task does not run pilot projector/rebuild, D1 migration/data cleanup, Worker deploy/retirement, VM/SSH/Docker, token creation/rotation/revoke, or owner-private-file inspection. No state/Draft/base/head changes or closure of legacy PRs/Issues follow from merging PR45. Their owner dispositions remain pending.

One Node/PostgreSQL administration source, transactional outbox, Node projector/recovery as sole D1 writers, one public code-read-only Worker, private R2, Node/VM preview grant. Native bindings retain write capability; code/test/review/deploy gates enforce read-only, not IAM. No applied migration edits or reapply0004. Owner token account/storage/rotation policy is already resolved in PUBLIC_PROJECTOR; never request/disclose its value.60seconds remains proposed until explicit owner confirmation.

Prepare itemized evidence requirements, serial approval checkpoints, failure/rollback handling and a blank validation ledger. Do not mark remote gates PASS from merged source, old pilot evidence, queue depth0 or D1 HTTP200 alone. PR remains Draft; no automatic Ready/merge/deploy or merge-monitor automation.
