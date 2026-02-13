---
name: evaluate-change-request
description: Systematically evaluate change requests for validity before accepting — challenge weak evidence, verify claims, prevent blind acceptance
category: Code Quality
---

# Skill: evaluate-change-request

## What I do

I provide a rigorous evaluation engine for change requests, review comments, and feedback. I ensure that every request is scrutinized for validity, evidence, and architectural alignment before being accepted into the codebase. I categorize outcomes into ADDRESSED, FALSE POSITIVE, or REJECTED with clear justification.

## When to use me

- Processing review comments on a Pull Request
- Evaluating change requests from an orchestrator or external system
- Handling contradictory feedback from multiple sources
- Validating whether a reported "bug" or "missing feature" is actually valid
- Before starting implementation on any requested change

## Core principles

1. **Scrutinize every claim** — Do not assume a request is correct because it was made; demand evidence.
2. **Evidence-based validation** — Use `prove-correctness` to verify if a requested change is actually necessary or if the current code already handles it.
3. **Intent over literalism** — Understand *why* a change is requested. Is it a real issue, a misunderstanding, or a stylistic preference?
4. **Zero-skip tracking** — Use `todowrite` to track every single item. Never lose a request in the noise.
5. **Architectural integrity** — Reject requests that violate core architectural patterns or `AGENTS.md` constraints.

## Evaluation decision tree

```
REQUEST RECEIVED
    |
    v
Step 1: Understand Intent (What is being asked? Why?)
    |
    +-- Ambiguous? --> ACTION: Clarify (Demand specific details)
    |
    v
Step 2: Gather Evidence (Read code, run tests, check history)
    |
    +-- Claim holds? (Issue is real) --> ACTION: Accept (Mark as ADDRESSED)
    |
    +-- Claim false? (File/Code missing) --> ACTION: Challenge (Mark as FALSE POSITIVE)
    |
    +-- Claim invalid? (Works as intended) --> ACTION: Reject (Mark as REJECTED)
    |
    v
Step 3: Resolve Conflicts (Contradictory requests?)
    |
    +-- Apply priority/logic --> ACTION: Select best path
    |
    v
Step 4: Document & Report (File:Line, Before/After, Verification)
```

## Implementation pattern

**TodoWrite tracking for requests:**
```typescript
// ALWAYS start by capturing the full set of requests
todowrite([
  { id: "req-1", content: "Fix nil pointer in user_service.go:45", status: "pending", priority: "high" },
  { id: "req-2", content: "Add logging to auth flow", status: "pending", priority: "medium" }
])
```

**Verification methodology:**
1. **Identify**: Locate the exact line referenced.
2. **Critical Thinking**: Challenge the "why". Does `user_service.go:45` actually have a nil pointer risk?
3. **Prove Correctness**: Write a test case that triggers the reported issue.
   - If test fails: Issue is real -> **ADDRESSED**
   - If test passes: Issue is non-existent -> **REJECTED**
   - If file doesn't exist: **FALSE POSITIVE**

## Classification guidance

| Status | When to use | Required Evidence |
|--------|-------------|-------------------|
| **ADDRESSED** | Request is valid and change was made | File:Line, Before/After state, Verification proof |
| **FALSE POSITIVE** | Request references non-existent code/files | Proof of absence (e.g., `ls` or `grep` output) |
| **REJECTED** | Request is invalid or code works as intended | Proof of correct behavior (e.g., passing test output) |

## Handling edge cases

- **Ambiguous requests**: "Make this better" or "Refactor this".
  - *Action*: Mark as REJECTED or CHALLENGE. Demand concrete criteria. "Better" is not actionable.
- **Contradictory requests**: Reviewer A says "Use X", Reviewer B says "Use Y".
  - *Action*: Evaluate against `AGENTS.md` and project patterns. Choose the most compliant path and document the decision.
- **Violating constraints**: Request asks to use `git commit -m` directly.
  - *Action*: REJECT. State violation of `AGENTS.md` Mandatory Commit Rules.

## Reporting format (per AGENTS.md)

```markdown
### [Request Title]
- File: `src/auth.go:12`
- Change: Added bounds check to array access
- Evidence: `TestAuthBounds` passes; Read tool confirms check at line 12
- Status: ADDRESSED
```

## Related skills

- `critical-thinking` — Rigorous analysis of claims
- `prove-correctness` — Executable evidence for validation
- `respond-to-review` — Drafting the final response
- `code-reviewer` — Perspective for evaluating quality
- `checklist-discipline` — Systematic tracking via TodoWrite
