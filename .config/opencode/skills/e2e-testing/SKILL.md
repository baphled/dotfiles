---
name: e2e-testing
description: End-to-end testing patterns using test harnesses
category: Testing BDD
---

# Skill: e2e-testing

## What I do

I guide end-to-end testing: test complete user workflows from entry point through all layers to verify the system works as a whole. Covers test harness design, fixture management, and environment isolation.

## When to use me

- Testing complete user workflows (not unit-level)
- Verifying integration between layers (intent → service → repository)
- Building test harnesses for TUI applications
- Setting up test fixtures and environment
- Validating that refactoring didn't break flows

## Core principles

1. **Test user outcomes** - Assert what the user sees, not internals
2. **Isolate environments** - Each test gets clean state (fresh DB, fixtures)
3. **Minimal assertions** - Verify the outcome, not every intermediate step
4. **Deterministic data** - Use fixtures, never random data in E2E
5. **Fast feedback** - Keep E2E suite under 60 seconds total

## E2E test workflow

```
SETUP PHASE
    Create test database/state
    Load fixtures (known data)
    Initialise application components
        |
EXECUTION PHASE
    Simulate user action (intent/screen interaction)
    Let the full stack process it
        |
ASSERTION PHASE
    Verify final state (screen output, DB state)
    Check side effects (events emitted, files created)
        |
TEARDOWN PHASE
    Clean up test state
    Reset environment
```

## Patterns & examples

**Test harness pattern (Go/Ginkgo):**
```go
var _ = Describe("Timeline workflow", func() {
    var (
        app     *TestApp
        db      *TestDB
        screen  tea.Model
    )

    BeforeEach(func() {
        db = NewTestDB()
        db.LoadFixtures("timeline_events")
        app = NewTestApp(db)
        screen = app.StartIntent("browsetimeline")
    })

    AfterEach(func() {
        db.Cleanup()
    })

    It("displays timeline events from database", func() {
        view := screen.View()
        Expect(view).To(ContainSubstring("Senior Developer"))
        Expect(view).To(ContainSubstring("2024"))
    })

    It("navigates to event detail on select", func() {
        screen, _ = screen.Update(tea.KeyMsg{Type: tea.KeyEnter})
        view := screen.View()
        Expect(view).To(ContainSubstring("Event Details"))
    })
})
```

**Fixture management:**
```go
// Use factory pattern for test data
func LoadTimelineFixtures(db *TestDB) {
    events := []career.Event{
        fixtures.NewEvent().
            WithTitle("Senior Developer").
            WithDate(2024, 1, 1).
            Build(),
    }
    db.InsertAll(events)
}
```

**Environment isolation:**
```go
// Each test gets its own database
func NewTestDB() *TestDB {
    db, _ := gorm.Open(sqlite.Open(":memory:"))
    db.AutoMigrate(&career.Event{})
    return &TestDB{db: db}
}
```

## Anti-patterns to avoid

- ❌ Testing implementation details in E2E (test outcomes, not internals)
- ❌ Sharing state between E2E tests (each test must be independent)
- ❌ Using production data in tests (use deterministic fixtures)
- ❌ Too many E2E tests (prefer unit tests, E2E for critical paths only)
- ❌ Ignoring cleanup (leaked state causes flaky tests)

## Related skills

- `test-fixtures-go` - Factory patterns for test data
- `ginkgo-gomega` - BDD framework for writing E2E specs
- `debug-test` - Diagnosing E2E test failures
- `bdd-workflow` - Red-Green-Refactor cycle
- `bubble-tea-testing` - TUI-specific testing patterns
