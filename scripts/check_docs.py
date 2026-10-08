"""Check required project documents and local Markdown links (stdlib only)."""

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DOCS = [
    ROOT / "README.md",
    ROOT / "PLAN.md",
    ROOT / "AGENTS.md",
    ROOT / "docs/ARCHITECTURE.md",
    ROOT / "docs/WORKFLOW.md",
    ROOT / "docs/adr/0001-public-site-origin-isolation.md",
]
REQUIRED = DOCS + [
    ROOT / ".github/pull_request_template.md",
    ROOT / ".github/ISSUE_TEMPLATE/feature.yml",
    ROOT / ".github/ISSUE_TEMPLATE/bug.yml",
    ROOT / ".github/workflows/docs.yml",
]
LINK_RE = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")
errors = []

for path in REQUIRED:
    if not path.is_file():
        errors.append(f"Missing required file: {path.relative_to(ROOT)}")

for doc in DOCS:
    if not doc.is_file():
        continue
    for line_number, line in enumerate(doc.read_text(encoding="utf-8-sig").splitlines(), 1):
        for target in LINK_RE.findall(line):
            target = target.strip().split("#", 1)[0].split("?", 1)[0]
            if not target or target.startswith(("http://", "https://", "mailto:", "/")):
                continue
            if not (doc.parent / target).is_file():
                errors.append(f"{doc.relative_to(ROOT)}:{line_number}: broken link {target}")

if errors:
    print("\n".join(errors), file=sys.stderr)
    sys.exit(1)
print(f"OK: {len(REQUIRED)} required files, {len(DOCS)} Markdown documents checked")
