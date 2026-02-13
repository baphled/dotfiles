---
name: create-pr
description: Create a pull request following branching and merge strategies
category: Delivery
---

# Skill: create-pr

## What I do

I guide PR creation: branch naming, commit organisation, description writing, and review setup. PRs should be small, focused, and reviewable in one sitting.

## When to use me

- Ready to submit code for review
- Creating a feature branch for new work
- Preparing changes for merge to next/main
- Splitting large changes into reviewable PRs

## Core principles

1. **Small and focused** - One concern per PR (ideally < 400 lines changed)
2. **Self-documenting** - PR description explains why, not just what
3. **Clean history** - Atomic commits that tell a story
4. **Branch from next** - Feature branches off `next`, PRs target `next`
5. **Ready for review** - Tests pass, no WIP commits, no debug code

## PR creation workflow

```
1. BRANCH
   git checkout next && git pull
   git checkout -b feature/short-description

2. DEVELOP
   Write code following TDD
   Make atomic commits (use git-master skill)

3. PREPARE
   Squash/rebase fixup commits
   Run make check-compliance
   Write PR description

4. CREATE
   Push branch
   Create PR via gh CLI
   Request reviewers
```

## Patterns & examples

**Branch naming:**
```
feature/add-timeline-export     # New feature
fix/timeline-nil-pointer        # Bug fix
refactor/extract-event-service  # Refactoring
docs/update-api-reference       # Documentation
chore/upgrade-dependencies      # Maintenance
```

**PR description template:**
```markdown
## Summary
Brief description of what this PR does and why.

## Changes
- Added timeline export functionality
- Updated event service to support CSV format
- Added tests for export edge cases

## Testing
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing done for [scenario]

## Notes
- Depends on #123 (merge that first)
- Feature flag: `ENABLE_EXPORT`
```

**Creating via gh CLI:**
```bash
# Push and create PR
git push -u origin feature/add-timeline-export

gh pr create \
  --title "Add timeline export to CSV" \
  --body "$(cat <<'EOF'
## Summary
Adds CSV export for timeline events, allowing users to
download their career history.

## Changes
- New ExportService with CSV formatter
- Export button on timeline screen
- Tests for all export edge cases

## Testing
- Unit tests: 100% coverage on new code
- E2E: tested full export flow
EOF
)" \
  --base next
```

**Pre-submission checklist:**
```
[ ] Branch up to date with next
[ ] All tests pass (make test)
[ ] Coverage >= 95% on new code
[ ] No WIP/fixup commits remaining
[ ] AI attribution on commits (make ai-commit)
[ ] PR description completed
[ ] Appropriate reviewers assigned
```

## Anti-patterns to avoid

- ❌ Giant PRs (> 500 lines makes review impossible)
- ❌ Mixing concerns (feature + refactor + fix in one PR)
- ❌ WIP commits in final PR (squash before review)
- ❌ No description (reviewers shouldn't have to guess intent)
- ❌ Targeting main directly (go through next first)

## Related skills

- `git-master` - Atomic commit strategy for PR commits
- `ai-commit` - Proper attribution on commits
- `code-reviewer` - What reviewers look for
- `pre-merge` - Final checks before merging
- `pr-monitor` - Monitoring PR status after creation
