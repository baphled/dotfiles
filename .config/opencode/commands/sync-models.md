---
agent: general
description: Synchronise OpenCode models with Obsidian vault documentation
---

# Synchronise Model Documentation

Synchronise the `opencode models` CLI output with your Obsidian vault, detecting new models, removals, and keeping documentation current.

## What this does

1. Fetches current model list from `opencode models` command
2. Compares against cached/documented state
3. Generates machine-readable diff
4. Optionally updates Obsidian documentation with changes

## Process

### Step 1: Check for Changes (Default)

Run without arguments to see if models have changed:

```bash
opencode-sync-models
```

Shows:
- Number of additions/removals
- List of new models
- List of removed models

Exits with code 2 if changes detected, 0 if in sync.

### Step 2: Review Changes

If changes detected, review what would be updated:

```bash
# Show as JSON for programmatic parsing
opencode-sync-models --json

# Show human-readable summary
opencode-sync-models --diff-only
```

Output includes:
- Summary: added_models[], removed_models[], counts
- Timestamps for when sync was run
- Details: current count vs previous count

### Step 3: Apply Updates

Apply changes to your Obsidian vault:

```bash
# Apply with confirmation prompt
opencode-sync-models --apply

# Apply without confirmation (for scripts/CI)
opencode-sync-models --force

# Apply with desktop notification
opencode-sync-models --apply --notify
```

Updates:
- `~/vaults/baphled/3. Resources/Tech/AI-Models/OpenCode-Models.md` - Auto-generated reference
- `~/.cache/opencode/models.json` - Cached model state for future comparisons
- `~/.cache/opencode/models-diff.json` - Machine-readable diff for agents

## Options Reference

| Option | Effect | Use Case |
|--------|--------|----------|
| (none) | Show diff, exit 2 if changes | Check current status |
| `--diff-only` | Explicit diff-only mode | Verbose status check |
| `--apply` | Apply with confirmation | Manual sync with review |
| `--force` | Apply without confirmation | Automated sync (CI/scheduled) |
| `--json` | JSON output format | Programmatic consumption |
| `--notify` | Send desktop notification | Unattended operation |

## Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | Success, no changes | Models are current |
| 1 | Error occurred | Check error message, retry |
| 2 | Changes detected | Review with `--json`, apply with `--apply` |
| 3 | Changes applied | Documentation updated successfully |

## Common Workflows

### Check Status

```bash
opencode-sync-models
# Output: Shows if models changed since last sync
```

### Review New Models Before Applying

```bash
opencode-sync-models --json | jq '.summary.added_models'
# Shows new models added to opencode
```

### Automated Sync (Scheduled/CI)

```bash
opencode-sync-models --force --notify
# Applies changes without prompting, sends notification when done
```

### Integration in Scripts

```bash
if opencode-sync-models --json > /tmp/model-diff.json; then
  # No changes, models are current
  exit 0
else
  # Changes detected, available in /tmp/model-diff.json
  exit 1
fi
```

## Implementation Details

### Script Location

`~/.local/bin/opencode-sync-models` – Bash script with security validations

### Cache Structure

```
~/.cache/opencode/
├── models.json          # Current model state
├── models-diff.json     # Latest diff (for agents)
└── sync.log            # Sync history (optional)
```

### Obsidian Documentation

- **Location:** `~/vaults/baphled/3. Resources/Tech/AI-Models/`
- **Files:**
  - `OpenCode-Models.md` – Auto-generated reference (updated each sync)
  - `OpenCode-Models-Changelog.md` – Change history (optional)

### Vault Queries

Agents can query model information:

```bash
# Get raw diff as JSON
cat ~/.cache/opencode/models-diff.json | jq '.summary'

# Get all current models
cat ~/.cache/opencode/models.json | jq '.providers[].models[]'

# Get models by provider
cat ~/.cache/opencode/models.json | jq '.providers[] | select(.provider=="anthropic")'
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|-----------|
| "opencode CLI not found" | `opencode` not in PATH | Install opencode, verify PATH |
| "Failed to fetch models" | CLI error or network issue | Check opencode authentication |
| "empty output" | CLI returned no models | Check opencode version |
| "Permission denied" | Can't write to vault | Check vault path, permissions |

## Related Commands

- `/dev` – Development session with model selection
- `/test` – Test with specific model choice
- `/models` – (future) Interactive model explorer

## Related Documentation

- [[Model Selection Guide]] – How to choose between models
- [[OpenCode-Models]] – Current model reference
- [[Commands Reference]] – All available commands
