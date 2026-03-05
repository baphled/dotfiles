---
description: Continuously monitor PR and handle tasks until cancelled
agent: pr-monitor
---

# Poll PR for Updates

Continuously monitor a pull request for new activity, CI status changes, and review feedback to ensure rapid response and smooth merging.

## Skills Loaded

- `pr-monitor`: Core monitoring logic and coordination
- `github-expert`: API integration for fetching real-time PR data
- `respond-to-review`: Handling incoming feedback as it appears

## When to Use

- While waiting for CI checks to complete on a fresh submission
- During an active review cycle to respond to comments instantly
- When coordinating a complex merge that requires all checks to pass

## Process / Workflow

1. **Monitor Initialisation**: Start the polling loop with a specified interval (defaulting to 60 seconds).
2. **Review Detection**:
   - Check for new comments via `gh api repos/{owner}/{repo}/pulls/{PR}/comments`.
   - Check for general PR reviews and their states (APPROVED, CHANGES_REQUESTED).
3. **CI Status Tracking**: Monitor check suites using `gh pr checks {PR} --watch` or periodic polling to detect failures early.
4. **Conflict Monitoring**: Watch for new commits to the base branch that might cause merge conflicts with your PR.
5. **Notification**: Alert the user to any significant changes requiring action (e.g. a failed test or a new change request).
6. **Interaction**: Provide options to jump directly to addressing new feedback using the `/respond-review` command.
7. **Completion**: Loop until the PR is merged, closed, or the command is manually cancelled by the user.

$ARGUMENTS
