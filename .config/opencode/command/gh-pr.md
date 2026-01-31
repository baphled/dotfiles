---
description: Generate technical debt task file from GitHub PR
agent: general
subtask: false
---

# Generate Technical Debt Task File from PR Review

You are being asked to create a comprehensive technical debt task file from GitHub PR #$1 review comments.

## Instructions

### Step 1: Fetch PR Information
1. Run: `gh pr view $1 --json title,body,state,url,reviews,comments`
2. Parse the JSON output to extract:
   - PR title and body
   - Review comments (look for improvement suggestions)
   - Current PR state (merged/open)
   - PR URL

### Step 2: Identify Improvements
Search for these patterns in review comments:
- Architecture: "Consider extracting", "This pattern could be reused", "Temporary solution", "Creates coupling"
- UX: "Should use modal", "Add confirmation", "Error should be more visible", "Add keyboard shortcut"
- Testing: "Add test for", "Should test", "E2E test", "Missing coverage"
- Documentation: "Document this", "Add example", "Clarify when", "Add state diagram"

For each improvement identified:
- **Priority**: HIGH (user-facing/safety), MEDIUM (maintainability), LOW (documentation)
- **Complexity**: Hours estimate
- **Dependencies**: Prerequisites or blockers
- **Testing**: Test files needed
- **Files**: Files to modify with purpose

### Step 3: Calculate Task Number and File Path
1. Find highest task number: `ls tasks/ | grep -E '^tasks-[0-9]+' | sed 's/tasks-\([0-9]*\).*/\1/' | sort -n | tail -1`
2. Next task number = highest + 1 (or 22 if none found)
3. Generate slug from title: lowercase, hyphenated
4. File path: `docs/tech_debt/pr$1-{slug}.md`

### Step 4: Generate Task File Structure

Use this EXACT structure (following docs/tech_debt/pr72-refactoring.md):

```markdown
# Task {NEXT_NUMBER}: PR #$1 {Title}

## Overview
- **Goal**: [Summarize all improvements in 1-2 sentences]
- **Time Estimate**: [Sum of all phase estimates]
- **Prerequisites**: PR #$1 merged to next branch
- **Related PR**: [Full GitHub PR URL]

## Context

**Current Status**:
- [PR state: merged/open]
- [Key achievements from PR]
- [Test status]
- [CI status]

**Post-Merge Improvements**:
[Why these refactorings are needed]

## Session Contract Acknowledgment
- [ ] Ran `make session-start` and it passed
- [ ] Acknowledge and commit to following all workflow rules
- [ ] Token count: _____ (must be < 50k to start)

## Pre-Task Checklist (MUST COMPLETE BEFORE STARTING)
- [ ] `make check-compliance` passes
- [ ] PR #$1 has been merged to next branch
- [ ] Reviewed existing patterns in:
  [List specific files from PR]
- [ ] Confirmed this is ONE atomic task per subtask (each phase is separate)
- [ ] Identified test files that will be created/modified

## Relevant Files

[Organize files by category:]
### Intent Registration & Routing
### Modal System
### Forms
### Tests
### Documentation
[Add other categories as needed]

## Tasks

### Phase N: [Phase Name] (Priority: HIGH/MEDIUM/LOW)

**Current Issue**: [What's the problem]
**Impact**: [Why it matters]
**Goal**: [What we want to achieve]

#### Subtask N.1: [Subtask Name] (TDD)
- [ ] **RED**: Write failing test for [specific behavior]
- [ ] **GREEN**: Implement [specific feature]
- [ ] **REFACTOR**: [Specific refactoring]
- [ ] [Additional specific steps]

**Files to Modify**:
- `path/to/file.go` - [Purpose of change]
- `path/to/test.go` - [Test changes]

**Acceptance Criteria**:
- [ ] [Specific verifiable outcome]
- [ ] [Specific verifiable outcome]
- [ ] All tests pass
- [ ] Coverage maintained

[Repeat for each subtask]

[Repeat for each phase]

## Pre-Commit Checklist (BEFORE EACH COMMIT)
- [ ] `make review-commit` passes
- [ ] AI attribution included (if AI-generated)
- [ ] Commit message explains **WHY**, not just WHAT
- [ ] Commit is atomic (ONE logical change)

## Post-Task Checklist (MUST COMPLETE BEFORE NEXT TASK)
- [ ] `make check-compliance` passes
- [ ] All checkboxes above completed
- [ ] Task marked complete `[x]` in task file
- [ ] Token count: _____ (< 100k to continue)

## Acceptance Criteria

### Phase 1: [Phase Name]
- [ ] [Specific outcome]
- [ ] [Specific outcome]

[Repeat for each phase]

## Overall Completion Criteria
- [ ] All {N} phases complete
- [ ] Coverage maintained ≥ 87%
- [ ] Zero regressions
- [ ] All tests passing
- [ ] Zero race conditions
- [ ] Documentation updated
- [ ] E2E tests verify all changes

## Rollback Plan

### Phase 1: [Phase Name]
- [How to revert]
- [Safety considerations]

[Repeat for each phase]

## Implementation Notes

### Dependencies Between Phases
[List dependencies]

### Suggested Order
[Recommend execution order based on risk and dependencies]

### Time Estimates
- **Phase 1**: X-Y hours
- **Phase 2**: X-Y hours
[List all phases]

**Total**: X-Y hours (X-Y days)

## Related Documentation
- `docs/TUI_INTENT_DIAGRAM.md` - Intent architecture and patterns
- `docs/MODAL_PATTERNS.md` - Modal usage and styling
- `docs/HUH_FORMS_GUIDE.md` - Huh forms developer guide
- `docs/TUI_STANDARDS.md` - TUI keyboard shortcuts and patterns
- `docs/rules/master-task-prompt.md` - 5-phase development workflow
[Add other relevant docs]

## Success Metrics

### Code Quality
- Zero regressions
- All tests passing
- Coverage ≥ 87%
- Zero staticcheck warnings
- Zero race conditions

### Architecture
[Architecture improvements]

### User Experience
[UX improvements]

## Notes

### Why These Refactorings?
[Explain the value]

### Why Post-Merge?
[Explain the timing]

### Testing Strategy
- TDD approach for all code changes (RED-GREEN-REFACTOR)
- E2E tests for user-facing changes
- Integration tests for routing patterns
- Documentation for patterns and lifecycle

---

**Document Version**: 1.0
**Created**: [YYYY-MM-DD]
**Status**: READY FOR IMPLEMENTATION
**Priority**: [HIGH/MEDIUM/LOW]
**Blocking**: [None or list]
**Process Guide**: docs/rules/master-task-prompt.md
```

### Step 5: Create the File
1. Create the file at the calculated path
2. Fill in all sections with specific details from PR review
3. Ensure all checkboxes are unchecked (ready for work)
4. Include today's date in YYYY-MM-DD format

### Step 6: Output Summary

After creating the file, output this summary:

```
✅ Created technical debt task file:
   Path: docs/tech_debt/pr$1-{slug}.md
   
📋 Summary:
   - Total Phases: {N}
   - Total Subtasks: {N}
   - Estimated Time: {hours} hours ({days} days)
   - Priority: {HIGH/MEDIUM/LOW}
   
🎯 Next Steps:
   1. Review the generated file
   2. Run `make session-start`
   3. Execute phases in suggested order
   4. Follow TDD protocol for all code changes
   
📚 Related Documentation:
   - Task workflow: docs/rules/master-task-prompt.md
   - TDD protocol: docs/rules/senior-engineer-guidelines.md
   - Atomic commits: docs/rules/atomic-commits.md
```

## Requirements

- ✅ Use EXACT structure from docs/tech_debt/pr72-refactoring.md as template
- ✅ All sections must be present and filled with specific details
- ✅ Phases must have clear priorities (HIGH/MEDIUM/LOW)
- ✅ Each subtask must follow TDD approach (RED-GREEN-REFACTOR)
- ✅ Files to modify must include actual file paths with purpose
- ✅ Acceptance criteria must be specific and testable
- ✅ Time estimates must be realistic
- ✅ Rollback plan for each phase
- ✅ All checkboxes unchecked (ready for work)
- ✅ Today's date in metadata

## Error Handling

**If PR not found**:
```
❌ Error: PR #$1 not found

Please check:
- PR number is correct
- You have access to the repository
- `gh` CLI is authenticated (run: gh auth status)
```

**If no improvements identified**:
```
⚠️  No improvements found in PR #$1 review comments

The PR may not have review comments with improvement suggestions.

Would you like to proceed with a basic template or manually specify improvements?
```

## Example Usage

If the user runs:
```
/gh-pr 72
```

You should:
1. Fetch PR #72 details using `gh` CLI
2. Analyze review comments for improvements
3. Generate `docs/tech_debt/pr72-post-merge-refactoring.md`
4. Output summary with next steps

## Reference

Template file: `docs/tech_debt/pr72-refactoring.md`

This command integrates with the KaRiya development workflow:
- Follows `docs/rules/master-task-prompt.md` (5-phase workflow)
- Uses `docs/rules/atomic-commits.md` (commit standards)
- Applies `docs/rules/senior-engineer-guidelines.md` (TDD protocol)
