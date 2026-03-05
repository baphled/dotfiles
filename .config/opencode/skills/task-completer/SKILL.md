---
name: task-completer
description: Ensure tasks are fully completed with all requirements met and no loose ends
category: Workflow Orchestration
---

# Skill: task-completer

## What I do

I enforce a rigorous "Definition of Done". I ensure that every task meets all acceptance criteria, follows quality standards, and includes necessary documentation and tests before it is marked as finished.

## When to use me

- Before declaring a task or sub-task as "completed"
- To verify that a bug fix truly addresses the root cause and includes regressions
- When preparing a pull request or final deliverable
- To ensure no "loose ends" (e.g. TODO comments, temporary files) remain

## Core principles

1. **Rigorous verification** — Check every requirement against the original request. "Close enough" is not complete.
2. **Side effect awareness** — Ensure that the change hasn't broken unrelated parts of the system (run the full test suite).
3. **No loose ends** — Remove debug logs, temporary files, and placeholder comments before finishing.
4. **Documentation alignment** — Ensure that READMEs, API docs, and comments reflect the current state of the code.

## Patterns & examples

**Definition of Done Checklist:**
- [ ] Code follows project style guide.
- [ ] All new logic is covered by unit/integration tests.
- [ ] Full test suite passes.
- [ ] Documentation updated (README, ADR, comments).
- [ ] No TODOs or temporary debug code remains.
- [ ] LSP diagnostics are clean.
- [ ] Final verification against acceptance criteria performed.

**Verification Pattern:**
- **Goal:** Add a login timeout.
- **Verification:** Set timeout to 5s, verify it kicks in. Set to 1 hour, verify it doesn't. Check logs for proper error message. Verify session is actually invalidated in the DB.

## Anti-patterns to avoid

- ❌ **Premature victory** — Marking a task as done as soon as the code "seems to work" without verification.
- ❌ **Skipping the docs** — Completing the logic but leaving the documentation stale.
- ❌ **Manual verification only** — Relying on "it worked once on my machine" instead of automated tests.

## KB Reference

`~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/Workflow-Orchestration/Task Completer.md`

## Related skills

- `checklist-discipline` — Foundation for the completion checklist
- `task-tracker` — Managing the lifecycle of the task
- `bdd-workflow` — Ensuring behaviour matches requirements
- `clean-code` — Final polish during the completion phase
