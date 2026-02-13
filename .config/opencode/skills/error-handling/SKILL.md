---
name: error-handling
description: Language-agnostic error handling patterns and strategies
category: Code Quality
---

# Skill: error-handling

## What I do

I teach robust error handling: errors as values, wrapping with context, sentinel errors, custom error types, and panic/recover boundaries. Primarily Go-focused, with language-agnostic principles.

## When to use me

- Designing error strategies for new packages or services
- Choosing between sentinel errors, error types, and error wrapping
- Adding context to errors without losing the original cause
- Implementing error boundaries (panic/recover at API edges)
- Reviewing error handling for completeness and clarity

## Core principles

1. **Errors are values** — Treat them like any other data; check, wrap, return, or handle
2. **Wrap with context** — Every error returned should gain context: `fmt.Errorf("saving user: %w", err)`
3. **Handle once** — An error should be handled OR returned, never both (no log-and-return)
4. **Sentinel errors for expected cases** — Use `var ErrNotFound = errors.New("not found")` for errors callers check
5. **Panic only for programmer errors** — Nil pointer, out of bounds, impossible states; never for user input

## Patterns & examples

**Error wrapping (preserves chain):**
```go
// ✅ Wraps with context, caller can unwrap
func (s *Service) GetUser(id string) (*User, error) {
    u, err := s.repo.Find(id)
    if err != nil {
        return nil, fmt.Errorf("getting user %s: %w", id, err)
    }
    return u, nil
}

// Caller checks specific error
if errors.Is(err, repository.ErrNotFound) {
    return http.StatusNotFound
}
```

**Sentinel errors vs error types:**
```go
// Sentinel: simple, expected conditions
var ErrNotFound = errors.New("not found")
var ErrConflict = errors.New("conflict")

// Error type: when callers need structured data
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

// Caller extracts details
var ve *ValidationError
if errors.As(err, &ve) {
    log.Printf("invalid field: %s", ve.Field)
}
```

**errors.Is vs errors.As:**

| Function | Use when | Example |
|----------|----------|---------|
| `errors.Is` | Checking against a specific value | `errors.Is(err, ErrNotFound)` |
| `errors.As` | Extracting a specific error type | `errors.As(err, &validErr)` |

**Panic/recover boundary (API edge only):**
```go
func (s *Server) handleRequest(w http.ResponseWriter, r *http.Request) {
    defer func() {
        if r := recover(); r != nil {
            log.Printf("panic recovered: %v\n%s", r, debug.Stack())
            http.Error(w, "internal error", 500)
        }
    }()
    s.router.ServeHTTP(w, r)
}
```

**Handle-once rule:**
```go
// ❌ Log AND return — error handled twice
if err != nil {
    log.Printf("failed: %v", err)
    return err  // caller also logs it
}

// ✅ Return with context — handled once at top level
if err != nil {
    return fmt.Errorf("processing order: %w", err)
}
```

## Anti-patterns to avoid

- ❌ **Ignoring errors** (`_ = f.Close()`) — Hides data loss; at minimum log or wrap
- ❌ **Wrapping without `%w`** — `fmt.Errorf("x: %v", err)` breaks `errors.Is`/`errors.As` chain
- ❌ **Log-and-return** — Duplicates error reporting; handle OR propagate, not both
- ❌ **Panicking for input validation** — Panic kills the process; return a `ValidationError` instead
- ❌ **Stringly-typed errors** (`if err.Error() == "not found"`) — Fragile; use sentinel errors

## Related skills

- `golang` - Go idioms that underpin error patterns
- `clean-code` - Error handling as part of readable code
- `concurrency` - Error propagation in goroutines (errgroup)
