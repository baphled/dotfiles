---
description: Create a pull request targeting next branch
agent: senior-engineer
---

# Create Pull Request

Automate the creation of a high-quality pull request following project standards and ensuring all checks pass.

## Skills Loaded

- `create-pr`: Guidance on PR structure and best practices
- `github-expert`: Advanced `gh` CLI usage for PR creation
- `check-compliance`: Ensuring code meets quality standards before submission

## When to Use

- When a feature or bug fix is complete and ready for review
- When you need to share work-in-progress for early feedback (as a draft PR)
- When splitting large changes into smaller, reviewable units

## Process / Workflow

1. **Pre-Submission Check**: Run `make check-compliance` to ensure all tests pass and linting is clean.
2. **Branch Verification**: Confirm your branch follows naming conventions (e.g. `feature/name` or `fix/name`) and is up to date with `next`.
3. **Remote Synchronisation**: Push your local branch to the remote repository using `git push -u origin HEAD`.
4. **PR Initialisation**: Invoke `gh pr create --base next` to start the creation process.
5. **Content Drafting**:
   - Use a conventional title format (e.g. `feat: add user profile editing`).
   - Fill in the body with a clear summary, a list of changes, and testing steps.
   - Link any related issues using "Closes #123".
6. **Metadata Assignment**: Request appropriate reviewers and add relevant labels.
7. **Final Review**: Perform a quick self-review of the diff using `gh pr diff` to catch any remaining debug code or typos.

$ARGUMENTS
