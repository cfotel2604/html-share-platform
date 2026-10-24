# Node/PostgreSQL administration — Issue #35

Refs #35 / Epic #31; [ADR-0006](adr/0006-postgresql-source-of-truth-d1-public-read-model.md), [implementation plan, Issue 4](D1_READ_MODEL_PLAN.md), [preview grants](adr/0003-server-rbac-and-preview-capabilities.md).

## Baseline and delivery scope

Branch `feat/35-node-postgres-admin` starts from freshly fetched `origin/main` `664e6c07af59b56fea421ec00cce639c7b3487d8` (PR #39 merged, Issue #32 closed). The old D1-primary/API Worker implementation is confined to unmerged Draft PRs #21–#24/#27/#29. It is not imported or merged here. PostgreSQL remains the only metadata backend; the work closes the configuration and regression gaps on main.

Implementation in progress:

- Reject `METADATA_BACKEND=cloudflare` and every unsupported backend; no fallback, token mint/refresh bridge or direct D1 administration path.
- One same-origin workspace bootstrap request resolves the Clerk identity once and lists sites through PostgreSQL. No presentation redesign. Readiness checks only PostgreSQL; liveness checks no provider.
- Preserve Node ownership/RBAC/audit and PostgreSQL transactions. Uploads create immutable objects conditionally, stream-read each one back with size/SHA-256/ETag verification and commit the active version only after all assets pass.
- Keep private preview on the VM/Studio gateway with the existing hashed, actor/site/version-scoped three-minute grant. No Cloudflare preview path.
- Keep cleanup limited to confirmed new objects; uncertain writes/commits require reconciliation instead of speculative deletion.

No outbox/projector (#33), D1 writes/schema/migrations, public Worker (#36), runtime deployment or owner configuration changes are included. PostgreSQL migrations already applied remain immutable. Existing lab public-host behavior and sandbox policy remain unchanged.

## Validation plan

Run lint, typecheck, unit tests, build and documentation checks. Exercise production Node services with isolated synthetic fixtures, including RBAC/ownership/audit, preview grants, local-only health/bootstrap and rejection of the removed backend before external calls. Extend the existing isolated PostgreSQL/S3 CI integration with a real 500-entry ZIP, verified immutable objects and the final committed PostgreSQL manifest/pointer.

No local Docker/VM command, private owner file or live Cloudflare resource will be used. Existing repository CI runs independently in GitHub's disposable runner. Local/emulated S3 evidence is not a claim that private production R2/IAM or pilot acceptance #38 has passed. Commands, exact tested heads and remaining gates will be recorded in the Draft PR and validation handoff before completion.
