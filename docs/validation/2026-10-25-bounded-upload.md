# Issue50 — bounded verified Node uploads

Refs #50 / #38. Base main5d6045afde6194239317f0dad77303c15a69bf3a. During actual pilot38the authenticated500file ZIP committed exactly one PGsite/version/outbox event and500R2objects, but its146815.991ms transaction outlasted the UI response. Refresh recovered the committed state; no upload retry/duplicate was made. HTTP524was not captured, so the exact edge error is unconfirmed.

Prepare bounded per-file conditional PUT+readback in Node, with all in-flight work settled before rollback/cleanup. Preserve ownership/authorization and version reservation before any object write, each immutable asset size/SHA256/ETag validation before pointer/manifest/audit/outbox COMMIT, no unconfirmed-key deletion, and ambiguous COMMIT preservation. No Worker/D1 handler call, migration/UI/proxy/DNS change. Separate branch/Draft; owner merges, no runtime change in this issue. Validation/results and exact-head CI will be recorded before review.
