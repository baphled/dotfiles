---
description: Generate merge readiness summary for current PR
agent: qa-engineer
---

# PR Merge Readiness Summary

Generate a detailed report on the current state of a pull request to confirm it satisfies all quality gates and is safe to merge into the base branch.

## Skills Loaded

- `pr-monitor`: Tracking the state of PR requirements and blockers
- `respond-to-review`: Verifying that all reviewer feedback has been addressed
- `check-compliance`: Confirming code quality and test coverage standards

## When to Use

- When all requested changes have been implemented and you are ready to merge
- To perform a final validation before requesting a lead's approval
- When a PR has been open for some time and needs a fresh readiness assessment

## Process / Workflow

1. **Information Gathering**: Use `gh pr view` to fetch the current description, review status, and labels for the target pull request.
2. **Review Verification**:
   - Confirm that at least one `APPROVED` review exists from a required reviewer.
   - Ensure all `CHANGES_REQUESTED` reviews have been resolved or dismissed.
   - Check that all inline comments have been addressed and marked as resolved.
3. **CI Validation**: Run `gh pr checks` to ensure all status checks, including unit tests, integration tests, and linting, are passing.
4. **Compliance Audit**: Perform a final `make check-compliance` run to verify that local and remote states are synchronised and meeting project standards.
5. **Conflict Check**: Verify that the branch is up to date with `next` and contains no merge conflicts.
6. **Summary Generation**: Produce a structured report detailing the review status, CI results, and a definitive merge readiness verdict.
7. **Next Steps**: If ready, provide the command to perform the final merge; otherwise, list the specific blockers preventing merge.

$ARGUMENTS
