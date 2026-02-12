---
name: estimation
description: Estimate work effectively - break down tasks, account for uncertainty, evaluate complexity
---

# Skill: estimation

## What I do

I provide expertise in breaking down work into estimable units, accounting for uncertainty, and evaluating task complexity. I feed data to token-cost-estimation for accurate resource planning.

## When to use me

- Before starting any task requiring estimation
- When planning sprints or work sessions
- When evaluating complexity for token-cost-estimation
- When uncertainty is high and needs quantification

## Core principles

1. **Break down first** - Decompose until units are estimable
2. **Account for uncertainty** - Use ranges, not single numbers
3. **Include unknowns** - Add buffer for investigation and unexpected issues
4. **Compare to similar work** - Historical reference improves accuracy
5. **Re-estimate as you learn** - Update estimates with new information

## Complexity Evaluation

### Factors to assess

| Factor | Low (1) | Medium (2) | High (3) |
|--------|---------|------------|----------|
| **Code familiarity** | Know it well | Some exposure | Never seen |
| **Scope clarity** | Well-defined | Mostly clear | Ambiguous |
| **Dependencies** | None/few | Some | Many/unknown |
| **Testing complexity** | Simple | Moderate | Complex |
| **Risk of regression** | Low | Medium | High |

**Complexity Score** = Sum of factors
- 5-7: Simple task
- 8-11: Moderate task
- 12-15: Complex task

### Uncertainty Ranges

Use multipliers based on confidence:
- **High confidence**: Estimate × 1.0-1.2
- **Medium confidence**: Estimate × 1.2-1.5
- **Low confidence**: Estimate × 1.5-2.5

## Patterns & examples

**Three-point estimation:**
```
Optimistic: X (best case)
Most likely: Y (realistic)
Pessimistic: Z (worst case)
Expected: (X + 4Y + Z) / 6
```

**Estimation checklist:**
1. What must be done? (scope)
2. What might go wrong? (risk)
3. What do I not know? (uncertainty)
4. What similar work have I done? (reference)
5. What's the complexity score? (calculation)

## Anti-patterns to avoid

- ❌ Single-point estimates without ranges
- ❌ Ignoring uncertainty and unknowns
- ❌ Estimating large tasks without breakdown
- ❌ Never updating estimates as you learn
- ❌ Ignoring historical accuracy data

## Related skills

- `token-cost-estimation` - Uses complexity data for token estimates
- `time-management` - Duration estimation
- `scope-management` - Scope affects estimates
- `task-tracker` - Track estimated vs actual
