---
name: refactor
description: Systematic refactoring with safety nets and incremental changes
---

# Skill: refactor

## What I do

I enforce safe refactoring: make incremental changes with tests confirming nothing breaks, then improve code structure without changing behaviour.

## When to use me

- When code works but is hard to read or modify
- When refactoring to apply design patterns
- After tests are in place (tests are your safety net)
- When extracting common logic or reducing duplication

## Core principles

1. Tests first—ensure tests pass before refactoring starts
2. Small changes—one semantic change at a time
3. Frequent validation—run tests after each change
4. Behaviour preserved—refactoring never changes functionality
5. One reason per refactoring—extract OR rename, not both

## Pair with other skills

- With `clean-code`: apply naming and structure principles during refactoring
- With `design-patterns`: recognise opportunities to apply patterns
- With `bdd-workflow`: use Red-Green-Refactor cycle
- With language skill: apply language-specific idioms while refactoring
