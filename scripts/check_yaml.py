"""Parse all tracked GitHub YAML files (syntax and top-level mapping)."""

from pathlib import Path
import sys

import yaml


ROOT = Path(__file__).resolve().parents[1]


def check_yaml_files(paths: list[Path]) -> list[str]:
    errors: list[str] = []
    for path in paths:
        try:
            node = yaml.compose(path.read_text(encoding="utf-8-sig"))
            if not isinstance(node, yaml.MappingNode):
                errors.append(f"{path}: expected top-level YAML mapping")
        except (OSError, UnicodeError, yaml.YAMLError) as error:
            errors.append(f"{path}: {error}")
    return errors


def main() -> int:
    paths = sorted((ROOT / ".github").rglob("*.yml"))
    paths += sorted((ROOT / ".github").rglob("*.yaml"))
    if not paths:
        print("No GitHub YAML files found", file=sys.stderr)
        return 1

    errors = check_yaml_files(paths)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1

    print(f"OK: {len(paths)} GitHub YAML files parsed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
