---
description: Install and configure git hooks for AI attribution and validation
agent: sysop
---

# Setup Git Hooks

Install and configure git hooks for compliance.

## Sets Up

- Pre-commit hook (formatting, tests, secrets)
- Commit-msg hook (conventional commits)
- Configures `core.hooksPath`

## Hooks Validate

- Code formatting (gofmt)
- Tests pass
- No debug statements
- Secrets detection
- Commit message format

$ARGUMENTS
