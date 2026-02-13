---
name: huh-testing
description: Testing huh form library components
category: Testing BDD
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
func TestEmailValidation(t *testing.T) {
  g := gomega.NewWithT(t)

  validate := func(s string) error {
    if !strings.Contains(s, "@") {
      return fmt.Errorf("invalid email")
    }
    return nil
  }

  g.Expect(validate("alice@example.com")).To(gomega.Succeed())
  g.Expect(validate("not-an-email")).To(gomega.HaveOccurred())
  g.Expect(validate("")).To(gomega.HaveOccurred())
}
```

**Testing form result handling:**
```go
func TestProcessFormResults(t *testing.T) {
  g := gomega.NewWithT(t)

  // Test the handler logic with known values
  // (don't test huh's form rendering — test your business logic)
  config := Config{
    Name:  "Alice",
    Role:  "admin",
    Notify: true,
  }

  result, err := processConfig(config)

  g.Expect(err).NotTo(gomega.HaveOccurred())
  g.Expect(result.Permissions).To(gomega.ContainElement("write"))
}
```

**Testing form construction:**
```go
func TestFormHasRequiredFields(t *testing.T) {
  g := gomega.NewWithT(t)

  form := buildUserForm()

  // Verify the form was built with correct structure
  // by setting values and running validation
  var name, email string
  nameField := huh.NewInput().Title("Name").Value(&name)
  emailField := huh.NewInput().Title("Email").Value(&email)

  // Test that validation rejects empty required fields
  name = ""
  g.Expect(nameField.Validate(name)).To(gomega.HaveOccurred())

  name = "Al"
  g.Expect(nameField.Validate(name)).To(gomega.Succeed())
}
```

**Integration testing with Bubble Tea teatest:**
```go
func TestFormInApp(t *testing.T) {
  m := newAppModel()  // your app model containing a huh form
  tm := teatest.NewModel(t, m, teatest.WithInitialTermSize(80, 24))

  // Type into the first field
  tm.Send(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("Alice")})
  tm.Send(tea.KeyMsg{Type: tea.KeyEnter})

  // Select from dropdown
  tm.Send(tea.KeyMsg{Type: tea.KeyEnter})

  tm.Send(tea.KeyMsg{Type: tea.KeyRunes, Runes: []rune("q")})
  tm.WaitFinished(t, teatest.WithFinalTimeout(time.Second))

  out := tm.FinalOutput(t)
  if !strings.Contains(string(out), "Alice") {
    t.Error("expected form result in output")
  }
}
```

**Testing conditional form logic:**
```go
func TestAdminShowsExtraFields(t *testing.T) {
  g := gomega.NewWithT(t)

  // When role is admin, form should include permissions
  form := buildFormForRole("admin")
  g.Expect(form.GroupCount()).To(gomega.Equal(3))  // extra permissions group

  // When role is viewer, no permissions group
  form = buildFormForRole("viewer")
  g.Expect(form.GroupCount()).To(gomega.Equal(2))
}
```

## Anti-patterns to avoid

- ❌ Testing huh's internal rendering (test your logic, not the library)
- ❌ Skipping validator tests (validators contain business rules)
- ❌ Only testing happy path (test empty, too-long, special character inputs)
- ❌ Tightly coupling tests to form UI (test values/results, not visual layout)
- ❌ Large integration tests without unit validator coverage

## Related skills

- `huh` - The huh form library being tested
- `bubble-tea-testing` - Bubble Tea testing patterns (huh is built on BT)
- `ginkgo-gomega` - BDD framework for structuring form tests
- `test-fixtures-go` - Factory patterns for test data
