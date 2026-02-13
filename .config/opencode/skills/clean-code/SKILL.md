---
name: clean-code
description: Write clean, maintainable code following SOLID principles and the Boy Scout Rule
category: Code Quality
---

# Skill: clean-code

## What I do

I enforce readability and maintainability through SOLID principles, clear naming, focused functions, and the Boy Scout Rule: leave code cleaner than you found it. Every change should improve the code around it.

## When to use me

- Writing any new code (pair with language skill)
- Reviewing code before submitting for review
- Refactoring existing code for clarity
- Designing new functions, types, or packages
- Naming variables, functions, types, and packages

## Core principles

1. **Naming reveals intent** — `usersByEmail` not `data`; `isExpired()` not `check()`
2. **Single responsibility** — One function, one job; one struct, one reason to change
3. **DRY** — Extract duplicated logic into named functions; but don't over-abstract
4. **Small focused units** — Functions under 20 lines; if you need a comment, extract a function
5. **Boy Scout Rule** — Leave code cleaner than you found it; fix one small thing every touch

## Patterns & examples

**SOLID in Go:**

| Principle | Go Application |
|-----------|---------------|
| **S**ingle Responsibility | One struct = one concern; `UserService` doesn't send emails |
| **O**pen/Closed | Extend via interfaces, not modification; add new `Notifier` impl |
| **L**iskov Substitution | Any `io.Reader` works where `io.Reader` is expected |
| **I**nterface Segregation | Small interfaces (1-2 methods); `Saver` not `CRUDRepository` |
| **D**ependency Inversion | Accept `Repository` interface, not `*GORMRepo` concrete |

**Naming clarity:**
```go
// ❌ Mechanics-focused
func process(d []byte) []byte { ... }
func handle(r *http.Request) { ... }

// ✅ Intent-focused
func compressImage(raw []byte) []byte { ... }
func createUser(r *http.Request) { ... }
```

**Function size and extraction:**
```go
// ❌ Too much in one function
func (s *Service) ProcessOrder(ctx context.Context, order *Order) error {
    // validate order (10 lines)
    // calculate total (8 lines)
    // apply discount (6 lines)
    // save to database (4 lines)
    // send confirmation (5 lines)
}

// ✅ Each step is a named function
func (s *Service) ProcessOrder(ctx context.Context, order *Order) error {
    if err := s.validateOrder(order); err != nil {
        return fmt.Errorf("validating order: %w", err)
    }
    total := s.calculateTotal(order)
    total = s.applyDiscount(total, order.Customer)
    if err := s.repo.Save(ctx, order); err != nil {
        return fmt.Errorf("saving order: %w", err)
    }
    return s.sendConfirmation(order)
}
```

**Boy Scout Rule in practice:**
```go
// Touching this file for a bug fix? Also:
// - Rename unclear variable (data → users)
// - Extract magic number (30 → maxRetries)
// - Add missing error context
// Don't refactor everything — one small improvement per touch
```

## Anti-patterns to avoid

- ❌ **Cryptic names** (`d`, `tmp`, `val2`) — Future you won't remember what they mean
- ❌ **Functions over 30 lines** — Hard to test, hard to read; extract sub-functions
- ❌ **Comments explaining what** (`// increment counter`) — Code should be self-documenting; comments explain *why*
- ❌ **Premature abstraction** — Don't create an interface for one implementation; wait for the second use
- ❌ **Dead code** — Commented-out code, unused functions; delete it, git remembers

## Related skills

- `golang` - Apply clean code principles idiomatically in Go
- `refactor` - Systematic techniques for improving existing code
- `code-reviewer` - Evaluate code against clean code standards
- `design-patterns` - Patterns that emerge from clean code principles
