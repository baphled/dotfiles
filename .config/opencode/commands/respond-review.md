---
description: Evaluate and respond to all change requests - PR reviews, issues, feedback, and requests
agent: Code-Reviewer
---

# Respond to Change Requests

Fetch, evaluate, and address all change requests on a pull request using the `gh` CLI.

## Skills Loaded

- `respond-to-review`
- `evaluate-change-request`
- `github-expert`

## Usage

Pass the PR number as the argument:

```
/respond-review 173
```

## Scope

This command handles all change request types:

- **PR CHANGES_REQUESTED reviews**: Blocking reviewer feedback fetched via `gh api`
- **Inline review comments**: File:line annotations fetched via `gh api .../comments`
- **General PR comments**: Non-inline feedback via `gh pr view --comments`
- **Issue feedback**: Comments on GitHub issues
- **Verbal/chat requests**: Feedback from discussions and messages

## Workflow

1. **Fetch**: Auto-detect repo, fetch `CHANGES_REQUESTED` reviews and inline comments via `gh`
2. **TodoWrite**: Create one todo per comment before touching any code
3. **Classify**: Accept / Challenge / Clarify / Defer each item
4. **Execute**: Implement accepted changes; gather evidence for challenges
5. **Verify**: `make test`, `lsp_diagnostics`, `go build ./...` for every accepted change
6. **Respond**: Post consolidated summary via `gh pr review {PR} --comment`
7. **Check CI**: `gh pr checks {PR}`

## Response Types

- **Accept**: Implement + verify + provide before/after evidence
- **Challenge**: Cite code or tests; mark REJECTED
- **Clarify**: Post targeted question via `gh pr review`
- **Defer**: Create follow-up issue; justify non-blocking

$ARGUMENTS
