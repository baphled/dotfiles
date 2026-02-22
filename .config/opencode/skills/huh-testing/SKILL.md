---
name: huh-testing
description: Testing huh form library components
category: Testing-BDD
---

# Skill: huh-testing

## What I do

I provide huh testing expertise: testing form validation logic, verifying field configurations, simulating user input through forms, and integration testing huh forms within Bubble Tea applications.

## When to use me

- Testing huh form field validation functions
- Verifying form configuration (field order, groups, options)
- Simulating user input through huh forms programmatically
- Integration testing forms within larger Bubble Tea apps
- Testing dynamic form behaviour (conditional fields)

## Core principles

1. **Test validators independently** - Validators are plain functions; test them directly
2. **Test form structure** - Verify groups, fields, and options are configured correctly
3. **Simulate input programmatically** - Use `form.RunWithOutput` or set values directly
4. **Separate form logic from handlers** - Test what happens with form results separately
5. **Test edge cases in validation** - Empty strings, max lengths, special characters

## Patterns & examples

**Testing validators directly:**
```go
validate := func(s string) error {
  if !strings.Contains(s, "@") {
    return fmt.Errorf("invalid email")
  }
  return nil
}
g.Expect(validate("alice@example.com")).To(gomega.Succeed())
g.Expect(validate("")).To(gomega.HaveOccurred())
```

**Testing form results:**
```go
config := Config{Name: "Alice", Role: "admin"}
result, err := processConfig(config)
g.Expect(err).NotTo(gomega.HaveOccurred())
g.Expect(result.Permissions).To(gomega.ContainElement("write"))
```

**Integration testing with Bubble Tea:**
```go
m := newAppModel()
tm := teatest.NewModel(t, m, teatest.WithInitialTermSize(80, 24))
tm.Send(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("Alice")})
tm.Send(tea.KeyMsg{Type: tea.KeyEnter})
tm.WaitFinished(t, teatest.WithFinalTimeout(time.Second))
out := tm.FinalOutput(t)
g.Expect(string(out)).To(ContainSubstring("Alice"))
```

**Testing conditional form logic:**
```go
form := buildFormForRole("admin")
g.Expect(form.GroupCount()).To(gomega.Equal(3))
form = buildFormForRole("viewer")
g.Expect(form.GroupCount()).To(gomega.Equal(2))
```

## Absolute Rules (Huh Testing Contract)

MUST NOT:
- Call `SubmitHuhForm()` or TUI helpers — causes deadlock
- Block on TUI event loop
- Test full program startup

CORRECT: Extract business logic to pure functions, test those directly.
```go
result, err := ProcessForm(input)  // ✅ Test domain logic
```

INCORRECT: Calling TUI helpers in tests.
```go
env.SubmitHuhForm()  // ❌ FORBIDDEN — deadlocks
```

## Anti-patterns to avoid

- ❌ Testing huh's internal rendering (test your logic, not the library)
- ❌ Skipping validator tests (validators contain business rules)
- ❌ Only testing happy path (test empty, too-long, special character inputs)
- ❌ Tightly coupling tests to form UI (test values/results, not visual layout)
- ❌ Large integration tests without unit validator coverage

## KB Reference

`~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/Testing-BDD/Huh Testing.md`

## Related skills

- `huh` - The huh form library being tested
- `bubble-tea-testing` - Bubble Tea testing patterns (huh is built on BT)
- `ginkgo-gomega` - BDD framework for structuring form tests
- `test-fixtures-go` - Factory patterns for test data
