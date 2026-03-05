---
name: github-expert
description: GitHub Actions, workflows, CLI, API, and repository management best practices
category: Git
---

# Skill: github-expert

## What I do

I provide `gh` CLI expertise for PR review workflows — fetching reviews, identifying change requests, posting responses, checking CI status, and querying PR metadata via the GitHub API. I cover the full cycle from reading reviewer feedback to confirming CI passes before merge.

## When to use me

- Fetching PR review comments and change requests
- Identifying which reviews are `CHANGES_REQUESTED` vs `COMMENTED`
- Posting review responses or dismissing stale reviews
- Checking CI status before or after changes
- Automating PR metadata queries via `gh api`

## Core `gh` commands for PR review workflows

```bash
# Fetch all reviews on a PR (shows state: APPROVED, CHANGES_REQUESTED, COMMENTED)
gh api repos/{owner}/{repo}/pulls/{PR}/reviews

# Fetch only CHANGES_REQUESTED reviews
gh api repos/{owner}/{repo}/pulls/{PR}/reviews | \
  jq '[.[] | select(.state == "CHANGES_REQUESTED")]'

# Fetch inline review comments (file:line annotations)
gh api repos/{owner}/{repo}/pulls/{PR}/comments

# Fetch general PR comments (not inline)
gh pr view {PR} --comments

# Get repo owner and name automatically
gh repo view --json owner,name -q '"\(.owner.login)/\(.name)"'

# Post a review comment response
gh pr review {PR} --comment -b "Addressed in commit abc123: ..."

# Approve a PR
gh pr review {PR} --approve -b "LGTM"

# Request changes on a PR
gh pr review {PR} --request-changes -b "Please fix X before merging"

# Check CI status
gh pr checks {PR}

# Check CI status and wait for completion
gh pr checks {PR} --watch

# View PR diff
gh pr diff {PR}

# List all open PRs
gh pr list

# View PR details including review state
gh pr view {PR} --json state,reviews,reviewRequests,statusCheckRollup
```

## Parsing review output

```bash
# Get all CHANGES_REQUESTED reviews with reviewer and body
gh api repos/{owner}/{repo}/pulls/{PR}/reviews | \
  jq '.[] | select(.state == "CHANGES_REQUESTED") | {reviewer: .user.login, body: .body}'

# Get all inline comments with file, line, and body
gh api repos/{owner}/{repo}/pulls/{PR}/comments | \
  jq '.[] | {file: .path, line: .line, reviewer: .user.login, body: .body}'

# Check if any review is CHANGES_REQUESTED
gh api repos/{owner}/{repo}/pulls/{PR}/reviews | \
  jq 'any(.[]; .state == "CHANGES_REQUESTED")'
```

## Review states

| State | Meaning | Action needed |
|-------|---------|---------------|
| `CHANGES_REQUESTED` | Reviewer requires changes before merge | Must address all comments |
| `APPROVED` | Reviewer approves | Can merge if CI passes |
| `COMMENTED` | Reviewer left comments without blocking | Address or acknowledge |
| `DISMISSED` | Review was dismissed | No action needed |
| `PENDING` | Review not yet submitted | Wait |

## Workflow: responding to CHANGES_REQUESTED

```
1. Fetch reviews:
   gh api repos/{owner}/{repo}/pulls/{PR}/reviews | jq '[.[] | select(.state == "CHANGES_REQUESTED")]'

2. Fetch inline comments:
   gh api repos/{owner}/{repo}/pulls/{PR}/comments | jq '.[] | {file: .path, line: .line, body: .body}'

3. Address each comment (implement changes)

4. Post a response summarising what was done:
   gh pr review {PR} --comment -b "All CHANGES_REQUESTED addressed: ..."

5. Verify CI passes:
   gh pr checks {PR}
```

## Anti-patterns to avoid

```
❌ Fetching only gh pr view --comments — misses inline review comments (use gh api .../comments too)
❌ Ignoring COMMENTED reviews — they may contain important context even without blocking
❌ Posting a response before implementing the change — always implement first, then respond
❌ Using gh pr merge before CI passes — always check gh pr checks first
```

## KB Reference

`~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/Git/GitHub Expert.md`

## Related skills

- `respond-to-review` — workflow for classifying and addressing feedback
- `evaluate-change-request` — validity assessment before implementing
- `git-master` — atomic commits and fixups after addressing review
