---
name: golang
description: Go language expertise including idioms, patterns, performance, concurrency, and best practices
category: Languages
---

# Skill: golang

## What I do

I provide Go-specific expertise: idiomatic patterns, interface design, composition, error handling, concurrency fundamentals, and performance considerations for writing clear, efficient, maintainable Go code.

## When to use me

- Writing any Go code — functions, types, packages
- Designing Go interfaces and public APIs
- Choosing between channels vs mutexes for concurrency
- Reviewing Go code for idiomatic correctness
- Debugging Go-specific issues (nil interfaces, goroutine leaks, race conditions)

## Core principles

1. **Simplicity over cleverness** — Readable code is maintainable code; avoid abstractions that obscure intent
2. **Explicit error handling** — Never ignore errors; wrap with context using `fmt.Errorf("doing X: %w", err)`
3. **Composition over inheritance** — Embed structs, accept interfaces, return concrete types
4. **Small interfaces** — Define interfaces where consumed, not where implemented; 1-2 methods ideal
5. **Zero values are useful** — Design structs so the zero value is ready to use (`sync.Mutex`, `bytes.Buffer`)

## Patterns & examples

**Accept interfaces, return structs:**
```go
// ✅ Interface defined by consumer, not provider
type EventStore interface {
    Save(ctx context.Context, event Event) error
}

func NewService(store EventStore) *Service {
    return &Service{store: store}
}
```

**Functional options for configuration:**
```go
type Option func(*Server)

func WithTimeout(d time.Duration) Option {
    return func(s *Server) { s.timeout = d }
}

func NewServer(opts ...Option) *Server {
    s := &Server{timeout: 30 * time.Second} // sensible default
    for _, opt := range opts {
        opt(s)
    }
    return s
}
```

**Table-driven tests:**
```go
func TestParse(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    int
        wantErr bool
    }{
        {"valid", "42", 42, false},
        {"negative", "-1", -1, false},
        {"invalid", "abc", 0, true},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := Parse(tt.input)
            if (err != nil) != tt.wantErr {
                t.Errorf("Parse() error = %v, wantErr %v", err, tt.wantErr)
            }
            if got != tt.want {
                t.Errorf("Parse() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

**Naming conventions:**

| Convention | Good | Bad |
|-----------|------|-----|
| Package names | `user` | `userService`, `user_svc` |
| Getters | `u.Name()` | `u.GetName()` |
| Acronyms | `userID`, `HTTPClient` | `userId`, `httpClient` |
| Interfaces | `Reader`, `Stringer` | `IReader`, `ReaderInterface` |

**Nil interface gotcha:**
```go
// ❌ Returns non-nil interface containing nil pointer
func bad() error {
    var e *MyError = nil
    return e  // interface{type: *MyError, value: nil} != nil
}

// ✅ Return nil explicitly
func good() error {
    var e *MyError = nil
    if e == nil {
        return nil
    }
    return e
}
```

## Anti-patterns to avoid

- ❌ **Ignoring errors** (`_ = doSomething()`) — hides failures, causes silent data corruption
- ❌ **Large interfaces** (5+ methods) — forces unnecessary implementation, breaks ISP
- ❌ **Goroutine leaks** (no exit path) — memory grows until OOM crash
- ❌ **Package-level mutable state** — makes testing impossible, causes race conditions
- ❌ **Panicking for recoverable errors** — panic is for programmer errors, not user errors

## Related skills

- `concurrency` - Goroutines, channels, sync primitives
- `error-handling` - Go error wrapping, sentinel errors, error types
- `performance` - Profiling, allocation reduction, benchmarks
- `ginkgo-gomega` - BDD testing framework for Go
- `clean-code` - SOLID principles applied to Go

## See also

- Vault: `Knowledge Base/Skills/Languages/Go.md`
