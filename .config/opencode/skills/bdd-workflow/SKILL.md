---
name: bdd-workflow
description: Behaviour-Driven Development, Red-Green-Refactor cycle for test-driven development
---

# Skill: bdd-workflow

## What I do

I teach the Red-Green-Refactor cycle: write a failing test (red), write minimum code to pass it (green), then clean up (refactor). This ensures your code is testable and works correctly before you move on.

## When to use me

- Starting any feature or function implementation
- Debugging suspected issues (write failing test first)
- Refactoring code safely (tests prove nothing broke)
- Designing APIs or interfaces (tests drive the design)

## Core principles

1. **Red first** - Write failing test before any implementation
2. **Green quick** - Write minimum code to pass (no optimisation yet)
3. **Refactor safely** - Improve code while tests keep you honest
4. **One test at a time** - Small steps, frequent validation
5. **Test intent, not implementation** - Tests specify behaviour, not how

## Patterns & examples

**The Red-Green-Refactor cycle:**

```
1. RED: Write failing test
   test := UserService.FindByEmail("test@example.com")
   assert.Nil(test)  // fails because service doesn't exist yet

2. GREEN: Write minimum code to pass
   func (s *UserService) FindByEmail(email string) *User {
     return nil  // passes the test (minimum!)
   }

3. REFACTOR: Improve implementation
   func (s *UserService) FindByEmail(email string) *User {
     for _, u := range s.users {
       if u.Email == email {
         return u
       }
     }
     return nil
   }
   
   // Still passes all tests, but now it works correctly
```

**Pattern: Write test first, then code**

```go
// WRONG: Write code first
func ValidateEmail(email string) bool {
  return strings.Contains(email, "@")
}

// RIGHT: Test first, then code
func TestValidateEmail(t *testing.T) {
  tests := []struct {
    email string
    want  bool
  }{
    {"valid@example.com", true},
    {"invalid", false},
    {"@", false},
  }
  for _, tt := range tests {
    if got := ValidateEmail(tt.email); got != tt.want {
      t.Errorf("ValidateEmail(%q) = %v, want %v", tt.email, got, tt.want)
    }
  }
}
```

## Anti-patterns to avoid

- ❌ Writing all code first, then tests (defeats purpose)
- ❌ Writing tests that are too broad (test one behaviour at a time)
- ❌ Skipping the refactor phase (code stays messy)
- ❌ Ignoring failing tests (red → green → refactor ALWAYS)

## Related skills

- `ginkgo-gomega` - BDD testing in Go
- `jest` - BDD testing in JavaScript
- `rspec-testing` - BDD testing in Ruby
- `cucumber` - Gherkin specifications
- `clean-code` - Apply during refactor phase
