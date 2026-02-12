---
name: golang
description: Go language expertise including idioms, patterns, performance, concurrency, and best practices
---

# Skill: golang

## What I do

I provide Go-specific expertise: idiomatic patterns, concurrency fundamentals, performance considerations, and best practices for writing clear, efficient, maintainable Go code.

## When to use me

- Writing Go code (any context)
- Designing Go APIs or interfaces
- Optimising Go performance or memory usage
- Working with goroutines, channels, or concurrency
- Reviewing Go code for idiomatic correctness

## Core principles

1. **Simplicity > cleverness** - Readable code is maintainable code
2. **Explicit error handling** - Never ignore errors, handle them early
3. **Composition over inheritance** - Use interfaces, not complex hierarchies
4. **Goroutines are cheap** - Use them liberally but understand the costs
5. **Channels for coordination** - Prefer channels over shared memory for communication

## Patterns & examples

**Error handling idiom:**
```go
// ✅ Correct: explicit error check
if err != nil {
  return fmt.Errorf("operation failed: %w", err)
}

// ❌ Wrong: ignoring errors
_ = risky()
result, _ := mayFail()
```

**Interface design:**
```go
// ✅ Correct: small, focused interface
type Reader interface {
  Read(p []byte) (n int, err error)
}

// ❌ Wrong: large interface with many methods
type Reader interface {
  Read(...) error
  ReadAll(...) error
  ReadLine(...) error
  Close() error
}
```

**Concurrency pattern (sync.WaitGroup):**
```go
var wg sync.WaitGroup
for i := 0; i < 10; i++ {
  wg.Add(1)
  go func(id int) {
    defer wg.Done()
    // work
  }(i)
}
wg.Wait()
```

**Channel coordination:**
```go
// For signalling: use struct{} channel
done := make(chan struct{})
defer close(done)

go func() {
  // work
  done <- struct{}{}
}()
<-done // wait for completion
```

## Anti-patterns to avoid

- ❌ Goroutine leaks (not closing channels when goroutines are still reading)
- ❌ Shared mutable state without synchronisation (race conditions)
- ❌ Ignoring or wrapping errors without context (`fmt.Sprint(err)` loses information)
- ❌ Returning nil for both value and error (use typed nil for interfaces)
- ❌ Over-generalising with large interfaces (Go interfaces should be small)

## Related skills

- `clean-code` - Apply SOLID principles in Go
- `bdd-workflow` - Test-driven development workflow
- `ginkgo-gomega` - BDD testing framework for Go
- `performance` - Profiling and optimising Go code
- `error-handling` - Go's error handling patterns
