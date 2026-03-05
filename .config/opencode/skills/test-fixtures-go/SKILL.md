---
name: test-fixtures-go
description: Factory-go and gofakeit for Go test fixtures
category: Testing BDD
---

# Skill: test-fixtures-go

## What I do

I provide expertise in generating realistic test data for Go using `factory-go` patterns and `gofakeit`. I specialise in the functional options pattern for flexible, composable, and type-safe test fixtures.

## When to use me

- Creating realistic mock data for Go unit and integration tests.
- Implementing the functional options pattern for object builders.
- Need random but structured data (UUIDs, emails, names) in tests.
- DRYing up test setup code across multiple Go spec files.

## Core principles

1. **Realistic Data** — Use `gofakeit` to generate data that mimics production values (valid emails, real-looking names).
2. **Functional Options** — Prefer `func(*Type)` options for builders to keep the API clean and extensible.
3. **Type Safety** — Ensure fixtures return the correct types and handle mandatory fields by default.
4. **Minimal Setup** — Fixtures should return a valid object with zero arguments; override only what's needed.

## Patterns & examples

### Functional Options Pattern (Recommended)
```go
type User struct {
    ID        string
    Email     string
    FirstName string
    Role      string
}

func NewUser(opts ...func(*User)) *User {
    user := &User{
        ID:        gofakeit.UUID(),
        Email:     gofakeit.Email(),
        FirstName: gofakeit.FirstName(),
        Role:      "user",
    }
    for _, opt := range opts {
        opt(user)
    }
    return user
}

// Options
func WithEmail(e string) func(*User) { return func(u *User) { u.Email = e } }
func WithRole(r string) func(*User)  { return func(u *User) { u.Role = r } }

// Usage
admin := NewUser(WithRole("admin"))
```

### Integration with Ginkgo
```go
var _ = Describe("UserService", func() {
    var user *User
    
    BeforeEach(func() {
        user = NewUser(WithRole("admin"))
    })
    
    It("grants admin privileges", func() {
        Expect(user.Role).To(Equal("admin"))
    })
})
```

## Anti-patterns to avoid

- ❌ **Hardcoded Constants** — Leads to "mystery guest" problems and fragile tests.
- ❌ **Manual Struct Literals** — Duplicates setup logic and makes adding fields painful.
- ❌ **Over-complex Builders** — If a fixture needs 10+ options, the struct likely needs refactoring.

## KB Reference

`~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/Testing-BDD/Test Fixtures Go.md`

## Related skills

- `test-fixtures` - Universal patterns for test data.
- `ginkgo-gomega` - Go BDD testing framework.
- `golang` - Core Go language idioms.

