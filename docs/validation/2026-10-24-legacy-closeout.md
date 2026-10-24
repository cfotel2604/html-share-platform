# Issue37 — owner-authorized legacy disposition closeout

Refs #37 / Epic31. Base main `9010dc56957a34f74d8cf7f8b4e35792b26bfcf2` after PR46 merged. Owner's consolidated A' instruction supersedes the earlier proposal-only disposition: close PR21/22/23/24/27/29 and Issues20/25/26/28 as superseded/abandoned. Keep Issue10 and its auditPR19; no automatic merge/production release.

Reason: Node/PostgreSQL administration (PR41), transactional outbox/projector (PR42), recovery (PR43) and public-only serving (PR44) already replaced D1-primary/API/preview/token-bridge architecture. No compatibility, legacy data import or old code port is retained. Closing GitHub items does not delete refs, change source branches or itself retire resources; pilot resource cutover is tracked separately in Issue38.

Execution receipt, exact old heads/body hashes and readback will be recorded here. Documentation stays Draft for owner merge; item closure itself is explicitly authorized and does not wait for this documentation merge.
