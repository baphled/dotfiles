---
description: Start a new development session with context-aware options
agent: session-manager
---

# Start Development Session

Initialise a new development session, ensuring the environment is clean, context is loaded, and all safety rules are synchronised before work begins.

## Skills Loaded

- `session-start`: Core logic for environment validation and context loading
- `check-compliance`: Verifying the current state against project standards
- `git-master`: Setting up the branch and commit rules for the session

## When to Use

- When beginning a new task or feature after a period of inactivity
- After switching repositories or performing significant environment changes
- To reset and verify your environment before a critical development phase

## Process / Workflow

1. **Environment Validation**: Run `make check-compliance` to ensure the current workspace is clean and all dependencies are correctly installed.
2. **Context Loading**: Execute the `session-start` skill to load relevant domain knowledge, recent discoveries, and ongoing task state.
3. **Branch Verification**: Confirm you are on a dedicated feature or bug-fix branch. **NEVER** commit directly to `main` or `next`.
4. **Git Status Check**: Verify that `git status` is clean or that existing changes are intentionally preserved and understood.
5. **Commit Rule Enforcement**:
   - All commits **MUST** use the `/commit` command or `make ai-commit`.
   - AI attribution is mandatory. Ensure `AI_AGENT` and `AI_MODEL` are correctly configured.
   - **NEVER** use `git commit` directly for new work.
6. **Task Definition**: Use `TodoWrite` to outline the first few steps of the session based on the current project plan.
7. **Session Logging**: Record the session start in the project notepad to maintain a clear audit trail of progress and decisions.

$ARGUMENTS
