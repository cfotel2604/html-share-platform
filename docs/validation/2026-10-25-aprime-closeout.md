# A-prime issue cleanup and pilot decision record — 2026-10-25

Refs #37 / #38. Base main `71c57b9dcd5710b87a9d49526aa251787cf81390`, after owner merged PR58. Documentation-only closeout; no application, applied SQL, deployment, credential, data or runtime change.

## Direct owner decisions in this chat

Owner confirms the mobile / Employee / Safari / Zalo matrix is OK. Record this as owner-confirmed PASS, not agent-observed device traces or an exhaustive version/session inventory. Existing independent desktop, Node authorization and origin evidence retains its own scope.

Owner permits omitting the remaining elaborate live fault drills after collecting convenient available evidence. We will retain measured/injected/local distinctions and list unrun live D1 drift, Worker corrupt-pin, provider-generated prolonged429 and emergency active-token fault as owner-waived for this pilot, not tested PASS. No deliberate pilot corruption, quota exhaustion or token revocation is needed. This narrows pilot evidence scope without changing code, ADR-0006 invariants, healthy revoke p95≤60s or the >60s pending warning. No outage-time60s guarantee is added.

Owner asks to clear obsolete/completed Issues50/40/33/34/36/37 before #38 acceptance; #10 remains separate. This does not yet sign off #38 or approve production. Oldviewer4100 is retained until the owner's later cleanup.

## Review in progress

Exact source/CI, current local evidence, issue dispositions and final head will be recorded below and in the Draft PR. PR47's historical closure receipt is preserved unchanged from its Git object in the adjacent legacy-closeout record. This closeout will replace that obsolete Draft without merging its old branch.
