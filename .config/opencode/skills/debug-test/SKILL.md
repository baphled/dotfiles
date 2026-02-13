---
name: debug-test
description: Debug failing tests and common test issues in KaRiya
category: General Cross Cutting
---

# Skill: debug-test

## What I do

I diagnose failing tests systematically: isolate the failure, identify root cause, and fix it. Covers race conditions, flaky tests, fixture issues, and assertion debugging in Go/Ginkgo.

## When to use me

- Tests fail unexpectedly after changes
- Tests pass individually but fail together
- Flaky tests that pass sometimes
- Unclear assertion failures or panics
- Test timeouts or hangs

## Core principles

1. **Reproduce first** - Confirm the failure is consistent before diagnosing
2. **Isolate the scope** - Run single test, then package, then all
3. **Read the error** - Assertion messages tell you expected vs actual
4. **Check the setup** - Most failures are in BeforeEach, not the test
5. **One fix at a time** - Change one thing, re-run, verify

## Debugging workflow

```
Failure observed
    |
    v
Run single test (-run "TestName")
    |
    +-- Passes alone? --> Race condition or shared state
    |                     Run with: go test -race ./...
    |
    +-- Fails alone? --> Read assertion output
         |
         +-- Nil pointer? --> Check fixtures and BeforeEach setup
         +-- Wrong value? --> Trace data flow from setup to assertion
         +-- Timeout? --> Check for blocking channels or infinite loops
         +-- Compilation? --> Check interface changes
```

## Patterns & examples

**Isolate and reproduce:**
```bash
# Single test
make individual-test TEST="should display items"

# Specific package
make test-suite SUITE=./internal/cli/intents/myfeature/...

# With race detection
go test -race ./path/to/package/...

# Run N times to catch flakes
for i in {1..10}; do go test ./path/... || break; done
```

**Common Ginkgo failures:**

```go
// Multiple suite files - WRONG
// Found more than one test suite file
// FIX: One *_suite_test.go per package

// Focused test left in - WRONG
FIt("should work", func() { ... })  // Remove the F!

// Shared state between tests - WRONG
var counter int  // Resets needed in BeforeEach

// FIX: Reset in BeforeEach
BeforeEach(func() {
    counter = 0
})
```

**Reading assertion output:**
```
Expected
    <string>: "hello"
to equal
    <string>: "Hello"

--> Case sensitivity issue. Check your fixture or transformation.
```

**Coverage analysis:**
```bash
go test -coverprofile=/tmp/cover.out ./path/...
go tool cover -func=/tmp/cover.out | grep -v "100.0%"
```

## Anti-patterns to avoid

- ❌ Fixing the test to match wrong behaviour (fix the code, not the test)
- ❌ Adding `time.Sleep` to fix race conditions (use channels or sync)
- ❌ Skipping flaky tests permanently (diagnose root cause)
- ❌ Debugging without reading the full error output first
- ❌ Leaving `FIt`/`FDescribe` focused tests in code

## Related skills

- `ginkgo-gomega` - BDD testing framework used in tests
- `bdd-workflow` - Red-Green-Refactor cycle
- `test-fixtures-go` - Fixture patterns for test data
- `gomock` - Mock debugging
- `concurrency` - Race condition diagnosis
