---
description: Check PR status with interactive options for next actions
agent: senior-engineer
---

# Check PR Status

Gather a comprehensive overview of all active pull requests to identify blockers, track progress, and determine the next steps for each branch.

## Skills Loaded

- `github-expert`: Querying PR metadata and review states via the GitHub API
- `pr-monitor`: Interpreting status data into actionable insights
- `create-pr`: Understanding the relationship between local branches and remote PRs

## When to Use

- At the start of a session to understand the current state of shared work
- Before starting a new task to see if any existing PRs require immediate attention
- When managing multiple concurrent feature branches

## Process / Workflow

1. **Data Retrieval**: Execute `gh pr list` to fetch a list of all open pull requests associated with the repository.
2. **CI Health Check**: For each PR, run `gh pr checks` to determine the current pass/fail status of all automated test suites.
3. **Review Assessment**:
   - Identify the review state (e.g. APPROVED, CHANGES_REQUESTED, or PENDING).
   - Summarise the number of unresolved comments and their severity.
4. **Conflict Detection**: Verify if each PR remains mergeable or if new changes in the base branch have introduced conflicts.
5. **Context Comparison**: Match remote PRs to local branches to identify outdated local states or branches that have already been merged.
6. **Insight Generation**: Present a structured table or list highlighting which PRs are ready for merge, which require fixes, and which are awaiting review.
7. **Action Recommendation**: Suggest specific commands (e.g. `/respond-review`, `/pr-ready`) based on the status of each pull request.

$ARGUMENTS
