---
name: code-reviewer
description: Comprehensive code review covering clean code, architecture, security
category: Code Quality
---

# Skill: code-reviewer

## What I do

I guide thorough code reviews across three dimensions: correctness (does it work?), quality (is it clean?), and safety (is it secure?). Provides checklists and focuses attention on high-impact areas.

## When to use me

- Reviewing PRs before merge
- Self-reviewing before submitting code
- Evaluating code quality during refactoring
- Checking for security or architectural issues
- Mentoring through review feedback

## Core principles

1. **Correctness first** - Does the code do what it claims?
2. **Intent over style** - Focus on logic and design, not formatting
3. **Security awareness** - Check inputs, auth, data exposure
4. **Architecture respect** - Do changes follow layer boundaries?
5. **Constructive feedback** - Suggest improvements, don't just criticise

## Review checklist

```
PASS 1: Understand (2 min)
[ ] Read PR description - what problem does this solve?
[ ] Check file list - which layers are touched?
[ ] Read tests first - what behaviour is specified?

PASS 2: Correctness (5 min)
[ ] Happy path works as described
[ ] Error cases handled (not swallowed)
[ ] Edge cases covered (nil, empty, boundary)
[ ] No off-by-one or type conversion issues
[ ] Tests actually assert the right thing

PASS 3: Quality (3 min)
[ ] Functions focused (single responsibility)
[ ] Names reveal intent
[ ] No unnecessary duplication
[ ] Dependencies flow in correct direction
[ ] No dead code or commented-out blocks

PASS 4: Safety (2 min)
[ ] No secrets or credentials in code
[ ] User input validated/sanitised
[ ] SQL injection prevented (parameterised queries)
[ ] No unrestricted file paths
[ ] Auth checks in place for protected operations
```

## Patterns & examples

**Review comment format:**
```markdown
## Severity levels
- MUST: Blocking - must fix before merge
- SHOULD: Important - fix unless justified reason
- CONSIDER: Suggestion - take or leave
- PRAISE: Good work - reinforce positive patterns

## Example comments
MUST: This SQL query concatenates user input directly.
Use parameterised queries to prevent injection.

SHOULD: Extract this 40-line function into smaller units.
The validation, transformation, and persistence are separate concerns.

CONSIDER: `processData` could be more descriptive.
Maybe `transformEventsToTimeline`?
```

**Architecture red flags:**
```
- Screen importing from repository directly (skip service layer)
- Domain types with database tags (leaking infrastructure)
- Circular dependencies between packages
- Business logic in HTTP handlers or UI components
```

**Security red flags:**
```
- fmt.Sprintf with SQL (use parameterised queries)
- os.Open with user-supplied path (path traversal)
- Logging sensitive data (passwords, tokens)
- Missing auth middleware on protected routes
- Hardcoded secrets or API keys
```

## Anti-patterns to avoid

- ❌ Nitpicking style while ignoring logic bugs
- ❌ Rubber-stamping without reading tests
- ❌ Rewriting the PR in comments (suggest direction, not dictation)
- ❌ Blocking on preferences disguised as standards
- ❌ Reviewing without understanding the problem being solved

## Related skills

- `clean-code` - Standards to review against
- `architecture` - Layer boundary validation
- `security` - Security-specific review depth
- `pre-merge` - Final validation before merging
- `respond-to-review` - Handling review feedback received
