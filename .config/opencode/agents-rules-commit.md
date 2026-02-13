# OpenCode Agent System - Commit Rules

## Commit Rules (MANDATORY - NO EXCEPTIONS)

**CRITICAL:** All commits MUST follow the hybrid git_master workflow:

### Hybrid Workflow: git_master Planning + make ai-commit Execution

1. **Use git_master skill for PLANNING:**
   - Atomic commit splitting (3+ files → 2+ commits minimum)
   - Style detection from git log history
   - Dependency ordering (utilities → models → services → endpoints)
   - Test pairing (implementation + test in same commit)

2. **For NEW COMMITS:**
   - Write commit message to `/tmp/commit.txt`
   - Run: `make ai-commit FILE=/tmp/commit.txt`
   - This adds `AI-Generated-By: Opencode (Model)` and `Reviewed-By: <name>` trailers
   - NEVER use raw `git commit -m` for new commits

3. **For FIXUP COMMITS:**
   - Use `git commit --fixup=<hash>` directly
   - Fixups get squashed via `git rebase -i --autosquash`, no attribution needed

4. **BEFORE first commit in session:**
   - Run `make check-compliance`
   - Ensure tests pass and coverage ≥ 95%

**Why this is MANDATORY:**
- Ensures proper attribution of AI-generated code (via make ai-commit)
- Maintains audit trail of which AI assisted
- Required for legal and transparency compliance
- Leverages git_master's superior atomic splitting and style detection

**If you use raw `git commit -m` for new commits, you have violated a critical rule.**
