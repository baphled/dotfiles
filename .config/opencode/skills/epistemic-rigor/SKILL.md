---
name: epistemic-rigor
description: Know what you know, what you don't know, and the difference between belief and knowledge
---

# Skill: epistemic-rigor

## What I do

I teach you to maintain intellectual honesty about your knowledge. Every claim you make has a basis—fact, test, assumption, or belief. I help you distinguish between these and act accordingly, preventing false confidence from leading you astray.

## When to use me

- Before making decisions based on uncertain information
- When you catch yourself saying "I think..." or "probably..."
- Before deploying changes that could impact production
- During code reviews when you're questioning something
- When diagnosing bugs and multiple explanations exist

## Core principles

1. **Name your epistemic state** - Is this fact, test, assumption, or belief?
2. **Test before trusting** - Verify claims before acting on them
3. **Know your sources** - Did you observe this, or did someone tell you?
4. **Admit uncertainty** - It's stronger to say "I don't know but suspect" than pretend
5. **Update when wrong** - Revise beliefs when evidence contradicts them

## Patterns & examples

**Four epistemic states (in order of confidence):**

1. **Fact** - Tested, verified, reproducible (high confidence)
   - "Go's `defer` runs in LIFO order" → write one test, it passes always
   
2. **Test** - Observed empirically but not fully verified (medium-high confidence)
   - "Pagination breaks on large datasets" → reproduced locally, haven't tested at scale
   
3. **Assumption** - Logical inference, not yet tested (medium confidence)
   - "User IDs are always positive integers" → sounds reasonable but unverified
   
4. **Belief** - Plausible but untested, may be wrong (low confidence)
   - "Database queries are probably the bottleneck" → intuition, no profiling yet

**Pattern: Decision checklist**

Before deciding, check your epistemic state:

```
Decision: Migrate to Firestore
Claim 1: "Firestore is cheaper than PostgreSQL" 
  → Belief (assumption based on marketing, not tested with our data size)
  → Action: Research pricing calculator with real numbers

Claim 2: "Migration will take 2 weeks"
  → Assumption (based on scope estimation, unverified)
  → Action: Build small spike to test one data type migration

Claim 3: "We need to migrate this year"
  → Fact? Assumption? → Check business requirements (might be belief based on false urgency)

Conclusion: Not ready to decide yet. Need (1) pricing analysis, (2) spike proof, (3) requirements clarification
```

**Pattern: Debugging with rigour**

```
Bug: Orders fail to save (belief: database issue)
Testing:
  1. Can we connect to DB? → Yes (test passes) → fact
  2. Can we insert a row manually? → Yes → fact  
  3. Can we insert via app? → No → narrows to app layer
  4. Does insert statement have correct syntax? → Build test case → fact
  5. Is transaction rolling back silently? → Add logging → fact

Result: Discovered silent rollback on constraint violation (fact) 
NOT database issue (was belief)
```

## Anti-patterns to avoid

- ❌ Treating beliefs as facts (dangerous in decision-making)
- ❌ Skipping verification because something "feels right"
- ❌ Assuming you've tested something when you haven't
- ❌ Forgetting to update beliefs when evidence contradicts them
- ❌ Acting with 100% confidence when you have 40% certainty

## Related skills

- `critical-thinking` - Rigorously analyse information before trusting it
- `pre-action` - Clarify what you know/don't know before deciding
- `prove-correctness` - Write tests to convert beliefs → facts
