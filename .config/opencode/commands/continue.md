---
description: Alias for /sessions - list and switch between sessions
agent: session-manager
---

# Continue Session

Resume development from a previous state, ensuring all context is restored and the environment is synchronised with the last recorded progress.

## Skills Loaded

- `session-start`: Restoring context and validating environment state
- `check-compliance`: Ensuring the workspace remains compliant after resumption
- `memory-keeper`: Retrieving recent discoveries and decisions from previous sessions

## When to Use

- When returning to a task after a break or context switch
- To switch between multiple ongoing streams of work
- When resuming work that was interrupted by a system restart or environment change

## Process / Workflow

1. **Session Selection**: Execute the internal `/sessions` list to view all available previous states, including their last activity date and associated branch.
2. **Context Restoration**: Load the chosen session state, restoring the task list, pending decisions, and any relevant domain context.
3. **Environment Alignment**:
   - Check `git status` to ensure the current working directory matches the expected state for the session.
   - Run `make check-compliance` to verify that the environment is still in a healthy state for development.
4. **Checkpoint Resumption**: Identify the last recorded activity or decision and determine the immediate next steps.
5. **Memory Retrieval**: Query the `memory-keeper` for any blockers or "gotchas" discovered during the previous session that remain relevant.
6. **Task Update**: Refresh the `TodoWrite` list to reflect the current priorities and ensure a smooth transition back into development.
7. **Activity Recording**: Log the resumption in the session's notepad to maintain a continuous record of progress.

$ARGUMENTS
