---
description: Verify a task is truly complete with no loose ends
agent: task-completer
---

# Complete Task Verification

Finalise the current task by performing a rigorous validation of all changes. This command ensures that no loose ends remain, quality standards are met, and the work is ready for final delivery or merge.

## Skills Loaded

- `task-completer`
- `check-compliance`
- `proof-reader`
- `clean-code`
- `ai-commit`

## When to Use

- When all implementation and testing steps of a task are finished
- Before marking a todo as completed in the plan
- To perform a final sanity check on the branch state

## Process / Workflow

1. **Final Compliance Check**:
   - Run a full suite of checks using `/check-compliance`.
   - Ensure build, tests, coverage, architecture, and security scans all pass.
2. **Review Modified Files**:
   - Verify that no temporary debug logs or `TODO`/`FIXME` comments are left in the code.
   - Run `lsp_diagnostics` on all changed files to ensure they are clean.
   - Proofread documentation and comments for clarity and British English spelling.
3. **Commit Final Changes**:
   - If minor fixes were made during verification, create a final atomic commit.
   - Follow the `ai-commit` workflow for proper attribution.
4. **Task Status Update**:
   - Mark the relevant task(s) as `completed` in the current todo list.
   - Update any internal tracking or notepad files with final results.
5. **Generate Completion Summary**:
   - Summarise the work performed, including verification evidence.
   - List any follow-up tasks or technical debt identified during the process.
   - Declare the task as officially finished.

$ARGUMENTS
