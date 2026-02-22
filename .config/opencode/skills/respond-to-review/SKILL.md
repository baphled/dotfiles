---
name: respond-to-review
description: Manage and execute code review feedback through evaluation, classification, implementation, and evidence reporting.
category: General Cross Cutting
---

# Skill: respond-to-review

## What I do

I provide a methodology for handling code review feedback. I guide the transition from receiving a request to delivering a verified solution. I ensure every piece of feedback is addressed, implemented, and verified—or professionally challenged with evidence.

## When to use me

- Processing feedback from pull request reviews or peer comments.
- Addressing change requests from orchestrators or stakeholders.
- Justifying why a suggested change is incorrect, out of scope, or unnecessary.
- Reporting implementation progress on complex, multi-step feedback.

## Response workflow

Before starting, use `evaluate-change-request` to understand the impact. Never implement blindly.

1. **Identify & Track**: Create a `TodoWrite` list with ALL requests from the review.
2. **Classify**: Assign each request a type: Accept, Challenge, Clarify, or Defer.
3. **Execute**: Implement the fix (Accept) or gather evidence (Challenge).
4. **Verify**: Use `lsp_diagnostics` and run specific tests to ensure correctness.
5. **Document**: Record before/after states and specific verification commands.
6. **Report**: Summarize work using the `AGENTS.md` Change Request Summary format.

## The 4 Response Types

### 1. Accept (Implement + Verify + Evidence)
- **When**: Valid bug fix, optimization, or style violation.
- **Action**: Implement, verify with tests, and mark as `ADDRESSED`.
- **Note**: Ensure no regressions by running integration tests.

### 2. Challenge (Defend + Evidence)
- **When**: Request is based on a false premise or violates project rules.
- **Action**: Cite code or test results to prove current state is correct.
- **Note**: Mark as `REJECTED` in the summary with a clear "Why".

### 3. Clarify (Query + Context)
- **When**: Feedback is ambiguous, contradictory, or lacks detail.
- **Action**: Ask specific questions with context (e.g., "Refactor loop or extract function?").

### 4. Defer (Justify + Issue)
- **When**: Valid but out of scope for the current task.
- **Action**: Create a follow-up issue and justify why it shouldn't block the merge.

## Evidence Documentation Pattern

Reviewers require proof of work. Use this pattern for every item:
- **Location**: `file_path:line_number`
- **Before**: `[original snippet]`
- **After**: `[modified snippet]`
- **Verification**: "Ran `pytest` - all 15 tests passed."

## Tone and Professionalism

- **Objective**: Focus on logic and project requirements, not personal preference.
- **Constructive**: Challenge the idea, not the person. Use "This might lead to X".
- **Accountable**: Acknowledge valid catches. Admitting mistakes builds trust.
- **Complete**: Never ignore a comment. Every nitpick deserves a status.

## Edge Cases

- **Ambiguous Feedback**: Never guess. Clarification saves rework.
- **Conflicting Reviewers**: Surface the conflict early. Request a decision before proceeding.
- **Stale Comments**: If code changed in a previous commit, mark as `FALSE POSITIVE`.
- **Violating Rules**: If asked to bypass tests, reject by citing `AGENTS.md` mandates.

## Completeness Tracking

Task completion is defined by the checklist, not just finishing code.
- Before: Create `TodoWrite` with all requests.
- During: Mark items as `in_progress`.
- After: Verify every item in `TodoWrite` is `completed`.
- Final: Generate the `Change Request Summary` report.

## KB Reference

`~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/Code-Quality/Respond To Review.md`

## Related skills

- `evaluate-change-request` – Assessment of feedback validity.
- `critical-thinking` – Evaluating logic and finding counter-evidence.
- `prove-correctness` – Generating test results needed for evidence.
- `code-reviewer` – Understanding reviewer perspectives and severity.
- `checklist-discipline` – Maintaining tracking for 100% coverage.
