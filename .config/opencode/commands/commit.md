---
description: Prepare and create a properly attributed commit
agent: senior-engineer
---

# Create AI-Attributed Commit

Prepare and create properly attributed commit.

## ⚠️ CRITICAL COMMIT RULES ⚠️

1. **MANDATORY:** All commits MUST include AI attribution with correct environment variables
2. **NEVER use `git commit` directly** - Always use `make ai-commit`
3. **VERIFY** AI_AGENT and AI_MODEL are set correctly before committing
4. **NO EXCEPTIONS** - This applies to ALL commits, every time

## Skills Loaded

- `ai-commit`
- `code-reviewer`

## Process

1. Review changes: `git status` and `git diff --cached`
2. Pre-commit checks: `make check-compliance`
3. Generate commit message (save to `/tmp/commit.txt`)
4. **VERIFY environment variables are correct:**
   - `AI_AGENT="Opencode"`
   - `AI_MODEL="Claude Opus 4.5"` (or current model)
5. **Create commit with MANDATORY AI attribution:**
   ```bash
   AI_AGENT="Opencode" AI_MODEL="Claude Opus 4.5" \
     make ai-commit FILE=/tmp/commit.txt
   ```
   **NEVER run:** `git commit` (this bypasses attribution)
6. Verify attribution in commit: `git log -1`

## Commit Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code restructuring
- `test:` - Tests
- `chore:` - Maintenance

$ARGUMENTS
