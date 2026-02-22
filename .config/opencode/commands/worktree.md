---
description: Manage Git worktrees for parallel development
agent: senior-engineer
---

# Git Worktree Operations

Manage multiple development branches simultaneously using Git worktrees, allowing for efficient parallel development and review without context switching.

## Skills Loaded

- `git-worktree`: Core expertise in worktree management and isolation
- `git-advanced`: History management and cross-branch operations
- `check-compliance`: Ensuring worktree environments meet project standards

## When to Use

- When an urgent bug fix requires attention while a feature branch is active
- To review a colleague's pull request in a separate environment while preserving your state
- When performing a long-running build or test suite in the background

## Process / Workflow

1. **Worktree Creation**: Use `git worktree add ../<branch-name> <base-branch>` to create a new isolated development environment sibling to the current directory.
2. **Environment Initialisation**:
   - Navigate to the new worktree directory.
   - Run `make check-compliance` to ensure the new environment is correctly configured and synchronised.
3. **Parallel Development**: Perform work in the new worktree (e.g. bug fixing or PR review) without affecting the state of the primary development directory.
4. **Context Management**: Use `git worktree list` to track all active worktrees and their associated branches across the project.
5. **Cross-Worktree Review**: Use separate worktrees to compare implementations or run integration tests across different versions of the codebase.
6. **Worktree Cleanup**:
   - Once the task is complete and changes are pushed or merged, navigate back to the primary directory.
   - Remove the worktree using `git worktree remove ../<branch-name>`.
7. **Pruning**: Periodically run `git worktree prune` to clean up any stale metadata from manually deleted worktree directories.

$ARGUMENTS
