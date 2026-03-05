---
description: Initialise a long-running project harness for multi-session agent work
agent: senior-engineer
---

# Initialise Long-Running Project

Set up the scaffolding for a complex project that will span multiple agent sessions.
Run this ONCE at the start: subsequent sessions use `/implement` with the
`long-running-agent` skill loaded.

## When to use

- Starting a project too large for a single context window
- Before beginning any multi-day development effort
- When multiple agent sessions will work on the same codebase sequentially

## Process

1. Load `long-running-agent` skill
2. Analyse requirements from `$ARGUMENTS`
3. Create `feature_list.json` with ALL features marked `"passes": false`
   - Be comprehensive: include functional, UI, edge case, and error features
   - Order by priority (highest first = most critical path)
   - Aim for 30–200 features depending on project scope
4. Create `claude-progress.txt` with session 1 header
5. Create `init.sh`: starts dev server and runs basic smoke test (exits 0 on success)
6. Make initial git commit: `chore: initialise long-running agent harness`
7. Report: feature count, estimated sessions, recommended next command

## Subsequent sessions

Each subsequent session should:
- Load `long-running-agent` skill
- Read `claude-progress.txt` and `git log --oneline -20`
- Pick ONE feature from `feature_list.json`
- Implement, test, commit, update progress

$ARGUMENTS
