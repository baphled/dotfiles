---
name: parallel-execution
description: Maximise efficiency by running independent tasks in parallel - reduce token overhead
category: Session Knowledge
---

# Skill: parallel-execution

## What I do

I maximise efficiency by identifying and executing independent tasks in parallel. This reduces token overhead by avoiding sequential context rebuilding and provides efficiency metrics to token-cost-estimation.

## When to use me

- When multiple independent operations are needed
- During investigation phases (read multiple files)
- During verification phases (run multiple checks)
- When token-cost-estimation identifies parallelisation opportunities
- When reducing total session duration

## Core principles

1. **Identify independence** - No output dependencies, no shared state
2. **Batch aggressively** - Single message, multiple tool calls
3. **Never serialise independent work** - Sequential = waste
4. **Measure savings** - Track parallel vs sequential cost
5. **Know dependencies** - Dependent tasks MUST sequence

## Parallelisation Patterns

### Fan-Out Investigation
```
ONE question → MANY parallel reads → COMBINE results
Example: "Where is X used?" → Read files A, B, C, D in parallel
Savings: ~40-60% vs sequential
```

### Parallel Verification
```
ONE change → MANY parallel checks → GATHER results
Example: After edit → lint + test + arch-check in parallel
Savings: ~50-70% vs sequential
```

### Scatter-Gather Research
```
ONE bug → MANY parallel investigations → IDENTIFY root cause
Example: Bug report → check logs + read code + search issues in parallel
Savings: ~30-50% vs sequential
```

## Token Savings Analysis

| Operation | Sequential | Parallel | Savings |
|-----------|------------|----------|---------|
| Read 4 files | 4 calls | 1 call (4 reads) | 75% overhead |
| 3 verification checks | 3 calls | 1 call (3 checks) | 66% overhead |
| Search 3 patterns | 3 calls | 1 call (3 searches) | 66% overhead |

**Overhead saved**: Each separate call adds ~50-100 tokens of overhead.

## Execution Rules

### MUST Parallel (Independent)
- Reading multiple files
- Running multiple tests/checks
- Searching multiple patterns
- Fetching multiple URLs
- Creating multiple entities

### MUST Sequence (Dependent)
- Write → Read (verify)
- Branch → Commit
- Build → Test
- Investigate → Fix → Verify
- Query → Process results

## Integration with token-cost-estimation

### Pre-Session
1. Review task breakdown
2. Identify parallelisation opportunities
3. Estimate savings

### During Session
- Execute parallel where identified
- Track actual savings

### Post-Session
- Compare parallel vs would-be-sequential
- Record savings in memory-keeper

## Anti-patterns to avoid

- ❌ Sequential calls for independent operations
- ❌ Parallelising dependent operations
- ❌ Not batching tool calls
- ❌ Ignoring parallelisation opportunities
- ❌ Not tracking efficiency gains

## Related skills

- `token-cost-estimation` - Benefits from parallel efficiency
- `token-efficiency` - Complementary efficiency techniques
- `task-tracker` - Track parallel vs sequential execution
- `time-management` - Parallelism reduces duration
