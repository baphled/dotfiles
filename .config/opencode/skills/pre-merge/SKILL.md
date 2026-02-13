---
name: pre-merge
description: Final validation checklist before merging PRs to ensure quality
category: Git
---

# Skill: pre-merge

## What I do

I enforce final validation before merging: run the pre-merge checklist to catch issues that code review and CI might miss. Covers backwards compatibility, documentation, and deployment readiness.

## When to use me

- PR has approvals and CI is green
- Before clicking the merge button
- After addressing all review comments
- When merging to main/next branch
- Before releasing a version

## Core principles

1. **CI green is necessary, not sufficient** - Automated checks catch syntax, not logic
2. **Review comments resolved** - All threads addressed, not just acknowledged
3. **Backwards compatible** - Unless explicitly a breaking change with migration
4. **Clean history** - Commits tell a coherent story
5. **No surprises** - If it's risky, flag it before merging

## Pre-merge checklist

```
AUTOMATED CHECKS
[ ] CI pipeline green (all jobs passed)
[ ] make check-compliance passes locally
[ ] Test coverage >= 95% on changed code
[ ] No new linter warnings

CODE QUALITY
[ ] All review comments addressed (not just resolved)
[ ] No TODO/FIXME without tracking issue
[ ] No debug code left (fmt.Println, console.log)
[ ] No commented-out code blocks
[ ] Commit messages follow project conventions

COMPATIBILITY
[ ] Public API unchanged OR migration documented
[ ] Database schema changes have migration
[ ] Config changes have defaults (no breaking for existing users)
[ ] Feature flags in place for risky changes

DEPLOYMENT READINESS
[ ] Changelog updated (if user-facing change)
[ ] Documentation updated (if behaviour changed)
[ ] Rollback plan exists (for high-risk changes)
[ ] Monitoring/alerting covers new functionality
```

## Patterns & examples

**Running final checks:**
```bash
# Full compliance check
make check-compliance

# Verify test coverage
go test -coverprofile=/tmp/cover.out ./...
go tool cover -func=/tmp/cover.out | tail -1

# Check for debug artifacts
grep -rn "fmt.Println\|console.log\|debugger" --include="*.go" --include="*.ts"

# Check for focused tests
grep -rn "FIt(\|FDescribe(\|fit(\|fdescribe(" --include="*_test.go"
```

**Commit history review:**
```bash
# Review commits being merged
git log main..HEAD --oneline

# Check for fixup commits that should be squashed
git log main..HEAD --oneline | grep -i "fixup\|squash\|wip"

# Verify AI attribution present
git log main..HEAD --format="%b" | grep "AI-Generated-By"
```

**Risk assessment:**
```
LOW RISK: Documentation, tests, internal refactoring
  → Merge after standard checklist

MEDIUM RISK: New feature behind flag, non-breaking API addition
  → Merge after checklist + manual smoke test

HIGH RISK: Database migration, public API change, auth changes
  → Merge after checklist + rollback plan + team notification
```

## Anti-patterns to avoid

- ❌ Merging with "fix later" TODOs and no tracking issue
- ❌ Merging when CI is green but you haven't run locally
- ❌ Resolving review threads without actually addressing them
- ❌ Merging WIP or fixup commits without squashing
- ❌ Skipping the checklist because "it's a small change"

## Related skills

- `code-reviewer` - Review process that precedes pre-merge
- `check-compliance` - Automated compliance validation
- `create-pr` - PR creation that sets up for clean merge
- `ai-commit` - Proper commit attribution
- `release-management` - Post-merge release process
