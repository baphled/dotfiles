---
name: create-bug
description: Create and document bug reports with proper structure for tracking and fixing
category: Workflow Orchestration
---

# Skill: create-bug

## What I do

I structure bug reports that enable fast diagnosis and fixing: clear reproduction steps, expected vs actual behaviour, severity classification, and environment details. Good bugs get fixed fast.

## When to use me

- Reporting a discovered bug
- Documenting a test failure for tracking
- Creating GitHub issues for defects
- Triaging and classifying bug severity
- Capturing regression details

## Core principles

1. **Reproducible** - If it can't be reproduced, it can't be fixed
2. **Minimal** - Smallest steps to trigger the bug
3. **Specific** - Exact error messages, line numbers, versions
4. **Classified** - Severity drives priority
5. **Contextual** - What were you doing when it happened?

## Bug report template

```markdown
## Title: [Component] Short description of wrong behaviour

### Severity
- P0/Critical: System crash, data loss, security vulnerability
- P1/High: Feature broken, no workaround
- P2/Medium: Feature broken, workaround exists
- P3/Low: Cosmetic, minor inconvenience

### Environment
- Version/commit: [sha or version]
- OS: [linux/macOS/windows]
- Go version: [if relevant]

### Steps to reproduce
1. [First action]
2. [Second action]
3. [Action that triggers the bug]

### Expected behaviour
[What should happen]

### Actual behaviour
[What actually happens, include error message verbatim]

### Evidence
- Error output: [paste exact error]
- Screenshot: [if UI bug]
- Failing test: [test name if applicable]
- Stack trace: [if panic/crash]

### Notes
- First observed: [date/commit]
- Regression: [yes/no, worked in which version?]
- Workaround: [if any]
```

## Patterns & examples

**Good bug title:**
```
GOOD: "[Timeline] Crash when opening empty timeline with no events"
BAD:  "Timeline doesn't work"
BAD:  "Bug in the app"
```

**Severity decision tree:**
```
Data loss or security issue?
  YES → P0/Critical

Feature completely broken?
  YES → Workaround exists?
    NO  → P1/High
    YES → P2/Medium

Cosmetic or minor?
  YES → P3/Low
```

**Creating via GitHub CLI:**
```bash
gh issue create \
  --title "[Timeline] Crash on empty timeline" \
  --body "$(cat <<'EOF'
## Severity: P1/High

## Steps to reproduce
1. Delete all timeline events
2. Navigate to Timeline screen
3. App panics with nil pointer

## Expected: Empty state message
## Actual: Panic at timeline_screen.go:45

## Stack trace
goroutine 1 [running]:
  internal/cli/screens/timeline.(*Screen).View(...)
EOF
)" \
  --label "bug,p1"
```

**From failing test to bug report:**
```
1. Test fails → capture test name + output
2. Determine if regression (git bisect)
3. Classify severity
4. Create issue with failing test as evidence
5. Link to commit that introduced it (if regression)
```

## Anti-patterns to avoid

- ❌ Vague descriptions ("it doesn't work")
- ❌ Missing reproduction steps (makes debugging guesswork)
- ❌ No expected vs actual (unclear what's wrong)
- ❌ Bundling multiple bugs in one report
- ❌ Skipping severity (everything can't be P0)

## Related skills

- `debug-test` - Diagnosing the bug before reporting
- `create-task` - Creating fix task from bug report
- `bdd-workflow` - Writing regression test for the fix
- `github-expert` - GitHub issue management
- `investigation` - Systematic root cause analysis
