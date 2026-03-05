---
name: git-worktree
description: Use Git worktrees for parallel development
category: Git
---

# Skill: git-worktree

## What I do

I provide expertise in using Git worktrees to manage multiple branches simultaneously. I focus on improving productivity by allowing developers to work on separate tasks without stashing or switching branches in a single directory.

## When to use me

- When you need to fix a bug in production while a feature branch is in progress
- When you need to run tests or a build in the background while continuing development
- When working on multiple interdependent pull requests

## Core principles

1. **Isolation**: Keep separate tasks in separate directories to avoid context switching.
2. **Shared state**: Use the shared `.git` directory to access all branches across different worktrees.
3. **Efficiency**: Use worktrees instead of multiple clones to save disk space and stay in sync.
4. **Naming**: Use clear naming conventions for worktree directories to identify their purpose.

## Patterns & examples

**Adding a new worktree:**
```bash
git worktree add ../hotfix-branch origin/main
```
This creates a new directory sibling to your current one, checks out `origin/main`, and sets it up as a separate worktree.

**List all active worktrees:**
```bash
git worktree list
```

**Removing a worktree:**
When finished, delete the directory and run:
```bash
git worktree prune
```
Or use the direct command:
```bash
git worktree remove ../hotfix-branch
```

**Common workflow:**
1. Start feature development in the main directory.
2. Receive an urgent bug report.
3. Add a worktree for the fix: `git worktree add ../urgent-fix main`.
4. Fix and commit in `../urgent-fix`.
5. Return to the main directory and continue feature work.

## Anti-patterns to avoid

- ❌ **Multiple clones**: Cloning the same repository multiple times is inefficient and complicates branch management.
- ❌ **Untracked worktrees**: Deleting a worktree directory manually without pruning can leave Git in an inconsistent state.
- ❌ **Shared build artifacts**: Be aware of build tools that use global caches. Ensure different worktrees don't step on each other's build outputs.

## KB Reference

`~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/Git/Git Worktree.md`

## Related skills

- `git-master`: For general branch management and searching
- `git-advanced`: For history management and rebasing across branches
- `automation`: For setting up scripts that manage worktrees for CI/CD tasks
