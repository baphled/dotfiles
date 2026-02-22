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

## Home Repo Hooks

### Post-commit: Vault Sync (`~/.git/hooks/post-commit`)

Automatically keeps the vault JSON cache in sync whenever opencode configuration files change.

**Trigger**: Fires after every commit to the home repo (`~`).

**Behaviour**:
1. Inspects the commit's changed files for paths matching `.config/opencode/(agents|skills|commands)/`.
2. If any match, runs `scripts/sync-opencode-config.sh` from the vault root (`~/vaults/baphled/`).
3. Stages and commits the updated `assets/opencode/*.json` files in the vault repo.

**Non-blocking**: Errors are logged but do not prevent the triggering commit from completing.

**Manual equivalent**: `make vault-sync` from `~/.config/opencode/`.

$ARGUMENTS
