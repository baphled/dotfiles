---
description: Start a new development session with context-aware options
agent: session-manager
---

# Start Development Session

Start a new development session with validation and context loading.

## Process

1. Load `session-start` skill
2. Run `make session-start`
3. Verify critical rules:
   - Feature branches only (never commit to next/main)
   - TDD workflow (test first)
   - **COMMIT RULES (NO EXCEPTIONS):**
     - Use `/commit` command with MANDATORY AI attribution
     - ALWAYS set AI_AGENT and AI_MODEL environment variables
     - NEVER use `git commit` directly
     - Format: `AI_AGENT="Opencode" AI_MODEL="Claude Opus 4.5" make ai-commit FILE=/tmp/commit.txt`
   - Run `make check-compliance` before and after

$ARGUMENTS
