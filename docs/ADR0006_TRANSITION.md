# ADR-0006 transition / PR and Issue disposition — Issue #37

Refs #37 / Epic #31. Base freshly fetched main `85f39e21f2dfda8f50239ecfa172369cc98f5845` after owner reported PR44 merged. PostgreSQL/Node is the sole administration source; D1 is a public read model through outbox/projector/recovery; one public Worker, preview remains Node/VM. Native bindings are application-read-only by code/test/review/deploy gate, not IAM read-only.

## Scope and authority

This is a documentation/metadata task. Prepare an itemized proposal for PR19/21/22/23/24/27/29 and Issues10/20/25/26/28, preserve useful old validation, mark architecture changes visibly, and synchronize current docs. Legacy descriptions remain historical evidence; neutral additive architecture notes do not decide closure. No PR/Issue will be closed, merged, retargeted or rewritten at its source branch without the owner's per-item decision.

The live Issue37 says **proposals for owner decision, no automatic close/merge**. Its narrower scope takes precedence over older plan wording that said to execute closures. No remote provisioning/Worker deployment/retirement, D1 write/reapply0004, VM/local Docker or owner private files/worktrees belong here. Read-only approved Cloudflare CLI metadata may be compared with committed pilot records; no token values or uploaded content are retrieved/printed. Source merge is not runtime cutover.

Owner reports each merge in chat. No scheduled merge monitoring/polling; next only prepares #38 after owner reports this PR merged. SLO60seconds remains a proposal. Token account/storage/90day rotation decisions are already recorded; do not ask for token values or repeat resolved decisions.

Inventory, proposal table, additive note receipts and exact-head validation are in progress. PR stays Draft for owner review.
