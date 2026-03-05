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

- `git-master` (oh-my-opencode) - Atomic commit planning, style detection, dependency ordering
- `ai-commit` - Execution with AI attribution
- `code-reviewer` - Pre-commit review

## Hybrid Workflow

**git_master (oh-my-opencode) handles PLANNING, make ai-commit handles EXECUTION.**

### Phase 1: Planning (git_master)
1. Review changes: `git status` and `git diff --cached`
2. git_master analyses:
   - Detects commit style from last 30 commits (semantic, plain, short)
   - Detects language (British English, Korean, etc.)
   - Splits into atomic commits (3+ files → 2+ commits min)
   - Orders by dependency (utilities → models → services → endpoints)
   - Pairs tests with implementation

### Phase 2: Pre-Commit Checks
3. Run compliance: `make check-compliance`
4. Verify test coverage ≥ 95% for modified packages

### Phase 3: Execution
5. For each planned commit:
   - **NEW COMMIT**: Write message to `/tmp/commit.txt` → `make ai-commit FILE=/tmp/commit.txt`
   - **FIXUP COMMIT**: Use `git commit --fixup=<hash>` directly

6. Verify attribution in commits: `git log --oneline`

**CRITICAL**: NEVER use `git commit -m` for new commits - always use make ai-commit

## Commit Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code restructuring
- `test:` - Tests
- `chore:` - Maintenance

$ARGUMENTS
