---
name: prove-correctness
description: Write tests and provide evidence to prove or disprove claims about code
category: Code Quality
---

# Skill: prove-correctness

## What I do

I guide evidence-based validation of code claims: design tests that prove or disprove specific properties, use property-based testing for invariants, and structure arguments with executable evidence.

## When to use me

- Verifying a claim about code behaviour ("this function never returns nil")
- Validating refactoring preserved behaviour
- Proving a bug fix actually addresses the root cause
- Testing invariants that must always hold
- Settling disagreements about how code behaves

## Core principles

1. **Claims need evidence** - "It works" means nothing without a test proving it
2. **Disprove first** - Try to break the claim before confirming it
3. **Test properties, not examples** - Properties hold for all inputs, not just samples
4. **Boundary focus** - Edge cases break claims more than happy paths
5. **Executable proof** - A test that runs is worth more than an argument

## Proof strategy

```
CLAIM: "Function X always does Y"
    |
    v
Step 1: Write test for happy path (does it work at all?)
Step 2: Write test for boundaries (zero, nil, max, empty)
Step 3: Write test for adversarial input (malformed, huge, unicode)
Step 4: Write property test (for ALL inputs, Y holds)
    |
    +-- All pass? --> Claim supported (not proven, but strong evidence)
    +-- Any fail? --> Claim disproved with concrete counterexample
```

## Patterns & examples

**Proving a claim with boundary tests:**
```go
Describe("Claim: Slugify never returns empty string", func() {
    // Happy path
    It("converts normal text", func() {
        Expect(Slugify("Hello World")).To(Equal("hello-world"))
    })

    // Boundaries that might break the claim
    It("handles empty string", func() {
        Expect(Slugify("")).NotTo(BeEmpty()) // MIGHT FAIL
    })

    It("handles only special characters", func() {
        Expect(Slugify("!!!")).NotTo(BeEmpty()) // MIGHT FAIL
    })

    It("handles unicode", func() {
        Expect(Slugify("cafe\u0301")).NotTo(BeEmpty())
    })
})
```

**Property-based testing (Go rapid):**
```go
func TestSortIsIdempotent(t *testing.T) {
    rapid.Check(t, func(t *rapid.T) {
        input := rapid.SliceOf(rapid.Int()).Draw(t, "input")
        once := SortSlice(input)
        twice := SortSlice(once)
        // Property: sorting twice = sorting once
        if !reflect.DeepEqual(once, twice) {
            t.Fatalf("sort not idempotent: %v vs %v", once, twice)
        }
    })
}
```

**Disproving with counterexample:**
```go
// Claim: "ParseConfig handles all valid TOML"
// Disproof: find input that parses in standard TOML but fails here
It("handles nested tables", func() {
    input := "[server]\nhost = 'localhost'\n[server.tls]\nenabled = true"
    _, err := ParseConfig(input)
    Expect(err).NotTo(HaveOccurred()) // Counterexample if this fails
})
```

**Mutation testing concept:**
```
1. Take passing test suite
2. Mutate production code (change > to >=, flip bool, remove line)
3. Run tests against mutant
4. Test suite SHOULD catch the mutation (fail)
5. If tests still pass → test suite has a blind spot
```

## Anti-patterns to avoid

- ❌ Testing only happy paths (doesn't prove much)
- ❌ Claiming "it works" without executable evidence
- ❌ Confusing "no test failures" with "proven correct"
- ❌ Ignoring counterexamples that disprove the claim
- ❌ Over-relying on example tests when properties would be stronger

## Related skills

- `fuzz-testing` - Discover counterexamples automatically
- `bdd-workflow` - Structure proofs as BDD specs
- `ginkgo-gomega` - Expressive assertions for proof tests
- `critical-thinking` - Rigorous analysis of claims
- `debug-test` - When proof tests reveal unexpected behaviour
