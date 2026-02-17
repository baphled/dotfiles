---
name: scripter
description: Bash, Python, and scripting languages for automation and tooling
category: DevOps Operations
---

# Skill: scripter

## What I do

I provide expertise in writing robust, maintainable, and idempotent scripts using Bash, Python, and other scripting languages for automation, tooling, and operational tasks.

## When to use me

- Automating deployment procedures or infrastructure provisioning
- Building custom development tools and CLI utilities
- Creating CI/CD pipeline scripts and git hooks
- Data migration, transformation, or log processing tasks
- Quick prototyping of workflows or environment configuration

## Core principles

1. **Fail Fast and Loud** – Detect errors immediately and report them clearly. Use `set -euo pipefail` in Bash.
2. **Idempotency** – Ensure running a script multiple times produces the same result without unintended side effects.
3. **Explicit Over Implicit** – Use explicit variable references, validate inputs, and handle errors explicitly.
4. **Portable and Environment-Agnostic** – Minimise dependencies on specific local environments; use relative paths or configuration files.
5. **Fail Safely with Cleanup** – Use traps (Bash) or context managers (Python) to clean up temporary resources even on failure.

## Patterns & examples

### Robust Bash Template
```bash
#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $*"; }

cleanup() {
    local exit_code=$?
    # Cleanup logic here
    exit "$exit_code"
}
trap cleanup EXIT
```

### Python CLI with Argparse
```python
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description='Tool description')
    parser.add_argument('--path', type=Path, required=True, help='Path to process')
    args = parser.parse_args()
    
    if not args.path.exists():
        raise SystemExit(f"Error: {args.path} not found")
```

### Idempotent Operations (Bash)
```bash
# Create directory safely
mkdir -p "$DATA_DIR"

# Safely remove temporary file
rm -f "$TEMP_FILE"

# Only create if doesn't exist
if ! grep -q "setting=value" config.txt; then
    echo "setting=value" >> config.txt
fi
```

## Anti-patterns to avoid

❌ **Ignoring exit codes** – Not checking if a critical command succeeded before proceeding.
❌ **Unquoted variables** – Bash variables without quotes (e.g., `rm -rf $DIR`) will fail catastrophically if the variable contains spaces or is empty.
❌ **Hardcoded absolute paths** – Makes scripts non-portable across different machines or environments.
❌ **Silent failures** – Scripts that exit with 0 even when they failed to perform their intended task.
❌ **Using `ls` for file iteration** – Use `find` or globbing to handle filenames with spaces or newlines safely.

## Related skills

- `automation` – Build automated workflows with scripts
- `devops` – Integrate scripts into CI/CD pipelines
- `monitoring` – Write scripts for log analysis and metrics
- `configuration-management` – Scripts for environment configuration
