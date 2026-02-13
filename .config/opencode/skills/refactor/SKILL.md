---
name: refactor
description: Systematic refactoring with safety nets and incremental changes
category: Code Quality
---

# Skill: refactor

## What I do

I enforce safe, systematic refactoring: verify tests pass first, make one structural change at a time, validate after each step, and never change behaviour. The goal is improved code structure with zero functional change.

## When to use me

- Code works but is hard to read, test, or extend
- Extracting common logic to reduce duplication
- Applying design patterns to existing code
- Preparing code for a new feature (make the change easy, then make the easy change)
- During the refactor phase of TDD/BDD

## Core principles

1. **Tests first** — Never refactor without passing tests; they're your safety net
2. **One change at a time** — Extract OR rename OR move; never combine
3. **Run tests after every change** — Catch breakage immediately, not after 5 changes
4. **Behaviour preserved** — Refactoring changes structure, never functionality
5. **Make the change easy** — Refactor to simplify the upcoming feature, then add it

## Patterns & examples

**Common refactoring techniques:**

| Technique | When to use | Example |
|-----------|------------|---------|
| Extract function | Long function, repeated code | Pull validation into `validateEmail()` |
| Rename | Name doesn't reveal intent | `d` → `discountRate` |
| Extract interface | Multiple implementations needed | `Notifier` from `EmailNotifier` |
| Move method | Method uses another struct's data more | Move to the struct it queries |
| Inline | Abstraction adds no value | Remove single-use helper |

**Extract function (step by step):**
```go
// BEFORE: Mixed concerns in one function
func (s *Service) CreateUser(ctx context.Context, req CreateReq) error {
    if req.Email == "" || !strings.Contains(req.Email, "@") {
        return ErrInvalidEmail
    }
    if len(req.Password) < 8 {
        return ErrWeakPassword
    }
    // ... create user logic
}

// Step 1: Extract validation (tests still pass?)
func validateCreateRequest(req CreateReq) error {
    if req.Email == "" || !strings.Contains(req.Email, "@") {
        return ErrInvalidEmail
    }
    if len(req.Password) < 8 {
        return ErrWeakPassword
    }
    return nil
}

// Step 2: Use extracted function (tests still pass?)
func (s *Service) CreateUser(ctx context.Context, req CreateReq) error {
    if err := validateCreateRequest(req); err != nil {
        return err
    }
    // ... create user logic
}
```

**Safe refactoring workflow:**
```
1. git stash / commit current work
2. Run tests → all pass ✅
3. Make ONE structural change
4. Run tests → still pass? ✅ Continue. ❌ Revert.
5. Commit the refactoring
6. Repeat from step 3
```

**Strangler fig pattern (large refactors):**
```go
// Don't rewrite — wrap and redirect incrementally
// Week 1: New function handles 1 case, old handles rest
// Week 2: New function handles 3 cases
// Week N: Old function deleted, new function handles all
```

## Anti-patterns to avoid

- ❌ **Refactoring without tests** — No safety net; you will break something silently
- ❌ **Refactoring + feature change** — Mix of concerns; impossible to bisect if something breaks
- ❌ **Big bang rewrite** — Rewriting everything at once; use strangler fig for large changes
- ❌ **Refactoring while fixing a bug** — Fix the bug first (with regression test), then refactor
- ❌ **Renaming + extracting in one step** — Two changes look like one; commit separately

## Related skills

- `clean-code` - Apply naming and structure principles during refactoring
- `design-patterns` - Recognise opportunities to apply patterns
- `tdd-workflow` - Refactor is the third phase of Red-Green-Refactor
- `golang` - Apply Go-specific idioms while refactoring
