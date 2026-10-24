# Issue38 — consolidated-authority pilot execution

Refs #38 / Epic31 / #10. Base main `9010dc56957a34f74d8cf7f8b4e35792b26bfcf2`. The owner's consolidated A' instruction supersedes the previous per-packet remote-approval/preparation-only gates: named pilot D1 projector/rebuild, public Worker deployment, old pilot Worker retirement and narrowly scoped legacy D1/R2 cleanup are authorized. Recheck account/target/config/artifact immediately before each mutation and retain inventory fingerprints/counts/schema plus readback. Never delete PostgreSQL, public read model, manifest-referenced R2 objects or production resources.

VM/Docker, owner private files outside allowed CLI, token actions outside the approved policy, architecture/security exceptions and production remain owner gates. Token values never enter logs/response/Git/PR/chat. No legacy import/compatibility/second writer; PostgreSQL remains the sole durable administration source. Keep source PR Draft; owner merges.

Packet A, exact-head local/CI and remote receipts, deletions and outstanding prerequisites will be recorded as executed. No gate is PASS from source merge alone. Independent Cloudflare preparation continues while docs/disposition PR47 awaits owner merge; no merge scheduler is installed.
