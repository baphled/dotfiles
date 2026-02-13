---
name: tdd-workflow
description: Follow the TDD Red-Green-Refactor cycle for KaRiya development with proper phase tracking
category: General Cross Cutting
---

# Skill: tdd-workflow

## What I do

I enforce the Red-Green-Refactor cycle: write a failing test first (red), write the minimum code to pass it (green), then improve the code while tests stay green (refactor). Every feature starts with a test.

## When to use me

- Starting any new feature or function implementation
- Fixing a bug (write a failing test that reproduces it first)
- Designing APIs or interfaces (tests drive the design)
- Refactoring safely (existing tests prove nothing broke)
- When coverage must stay at or above 95%

## Core principles

1. **Red first** — Write a failing test before any implementation; if it passes immediately, the test is wrong
2. **Green quick** — Write the minimum code to pass; no optimisation, no gold-plating
3. **Refactor safely** — Improve code structure while all tests stay green
4. **One test at a time** — Small steps, frequent validation; resist writing multiple tests ahead
5. **Test behaviour, not implementation** — Tests specify what, not how; refactoring shouldn't break tests

## Patterns & examples

**The Red-Green-Refactor cycle:**

```
Phase 1: RED — Write failing test
  └─ Compile? Yes. Run? FAIL. Good.

Phase 2: GREEN — Write minimum code to pass
  └─ Run? PASS. Done. Don't add more.

Phase 3: REFACTOR — Clean up while green
  └─ Extract, rename, simplify. Run? Still PASS.

Repeat from Phase 1.
```

**Complete TDD example in Go:**
```go
// PHASE 1: RED — Write the test first
func TestCalculateDiscount(t *testing.T) {
    tests := []struct {
        name     string
        total    float64
        want     float64
    }{
        {"no discount under 100", 50.0, 50.0},
        {"10% discount over 100", 200.0, 180.0},
        {"10% discount at exactly 100", 100.0, 90.0},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := CalculateDiscount(tt.total)
            if got != tt.want {
                t.Errorf("CalculateDiscount(%v) = %v, want %v",
                    tt.total, got, tt.want)
            }
        })
    }
}
// Run: FAIL ✅ (function doesn't exist)

// PHASE 2: GREEN — Minimum to pass
func CalculateDiscount(total float64) float64 {
    if total >= 100 {
        return total * 0.9
    }
    return total
}
// Run: PASS ✅

// PHASE 3: REFACTOR — Extract magic numbers
const (
    discountThreshold = 100.0
    discountRate      = 0.10
)

func CalculateDiscount(total float64) float64 {
    if total >= discountThreshold {
        return total * (1 - discountRate)
    }
    return total
}
// Run: STILL PASS ✅
```

**Bug fix with TDD:**
```go
// Step 1: Write test that reproduces the bug
func TestCalculateDiscount_ZeroTotal(t *testing.T) {
    got := CalculateDiscount(0)
    if got != 0 {
        t.Errorf("CalculateDiscount(0) = %v, want 0", got)
    }
}
// Step 2: See it fail (confirms the bug)
// Step 3: Fix the code
// Step 4: See it pass (confirms the fix)
// Step 5: The regression test stays forever
```

**Phase tracking (for AI sessions):**

| Phase | Action | Verification |
|-------|--------|-------------|
| RED | Write test | `go test` → FAIL |
| GREEN | Write code | `go test` → PASS |
| REFACTOR | Clean up | `go test` → STILL PASS |

## Anti-patterns to avoid

- ❌ **Writing code before tests** — Defeats the entire purpose; you're just testing after the fact
- ❌ **Making the test pass with hardcoded values** — e.g. `return 180.0`; triangulate with more cases
- ❌ **Skipping the refactor phase** — Code accumulates mess; refactor is where quality lives
- ❌ **Testing implementation details** — Testing private methods or internal state; test public behaviour
- ❌ **Writing too many tests at once** — Lose focus; one red-green-refactor cycle at a time

## Related skills

- `bdd-workflow` - BDD extends TDD with Given/When/Then for acceptance tests
- `ginkgo-gomega` - BDD testing framework that enables TDD in Go
- `clean-code` - Apply during the refactor phase
- `refactor` - Systematic refactoring techniques for the refactor phase
