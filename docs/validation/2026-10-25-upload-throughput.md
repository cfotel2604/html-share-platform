# Issue52 — bounded upload throughput

Refs #52 / #38. Main baseb8ae10f includes owner-merged51. Owner confirmed actual500fileUIcreate/publiclink success but reported slow upload. PGtransaction25312.779ms; Nodeoperator22536.593ms. Read-only R2sweeps verified all500SHA256each:6concurrent7407ms/92.4MiBRSS,12concurrent3489ms/104.8MiBRSS. These single sweeps are not a fullPUT/HTTPperformance guarantee.

Prepare fixed12transfer bound while preserving authorization/quota/conditionalPUT/readback/atomicmanifest/audit/outbox, first-error scheduling stop and complete in-flight drain before cleanup. Tests and exact-headCI will be recorded. No runtime/secret/Cloudflare operation in this branch; ownermerges, then48must integrate/revalidate/newimage before live claims.
