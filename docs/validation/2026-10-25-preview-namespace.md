# Issue54 — isolated A-prime preview namespace

Refs #54 / #38. Owner keeps old view-lab test links and content upstream4100. Prepare new private preview host grammar p-<site-id>--<grant> under the existing content wildcard, routed only to A-prime gateway4110. Label62characters, same128bitgrant/3minuteTTL/version+actor+policy scope and HTTP/iframe sandbox. No DNS/UFW/Worker/D1preview or fallback. Source from mainb8ae10f; separate branch/Draft. Actual nginx/runtime apply requires source integration/exact-headCI and guarded HSP-only config/readback.

Do not port unmerged48public-serving changes here or mark public preview PASS from source tests. Existing old runtime remains untouched; owner merges, no production action.
