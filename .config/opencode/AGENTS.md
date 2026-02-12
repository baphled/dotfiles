# OpenCode Agent System - Mandatory Requirements

**Non-negotiable requirements for correctness, speed, consistency.**

---

## Always-Active Skills (MANDATORY)

Load with EVERY session:
1. **`pre-action`** - Stop, clarify, evaluate options, choose consciously
2. **`memory-keeper`** - Read before write, capture discoveries
3. **`token-cost-estimation`** - Estimate costs before starting work

**NON-NEGOTIABLE.**

---

## Pre-Action (MANDATORY)

Before significant actions:
1. Stop and think
2. Clarify intent (goal, constraints, success)
3. Evaluate ≥2 approaches
4. Choose consciously
5. Verify understanding

Applies to: Major code changes, deployments, irreversible actions, architecture, unclear requirements.

---

## Memory-Keeper (MANDATORY)

### Principles
1. Capture context + why (not just what)
2. Make searchable
3. Verify accuracy
4. Link discoveries
5. **Search memory BEFORE investigating**

### Triggers

**Discovery:**
```
DISCOVERED: [what]
CONTEXT: [where/how]
IMPLICATION: [why matters]
→ Store as memory entity
```

**Change:**
```
CHANGED: [what]
FROM → TO: [behavior]
REASON: [why]
IMPACT: [affects]
→ Store + update related entities
```

---

## Token Cost Estimation (MANDATORY)

### Triggers
Invoke at session start:
```
SESSION START:
  Goal: [objective]
  Complexity: [tier]
  Duration: [estimate]
  → Generate cost breakdown
```

### Breakdown Format
```
| Phase | Tokens | Notes |
|-------|--------|-------|
| Investigation | X | |
| Implementation | Y | |
| Verification | Z | |
| Total | X+Y+Z | |
```

### Optimisation Workflow
1. Estimate upfront (token-cost-estimation)
2. Apply efficiency techniques (token-efficiency)
3. Parallelise where possible (parallel-execution)
4. Manage scope to budget (scope-management)
5. Track and compare (memory-keeper)

### Integration Skills
- `estimation` - Complexity evaluation
- `time-management` - Duration factors
- `task-tracker` - Progress + complexity
- `scope-management` - Resource identification
- `token-efficiency` - Reduction techniques
- `parallel-execution` - Efficiency metrics

---

## Orchestration (MANDATORY)

### Execution
1. User → /command
2. Select agent
3. Load always-active skills
4. Evaluate context
5. Load contextual skills (language/task/domain)
6. Execute
7. Store in memory

### Progressive Disclosure
- Load ONLY what's needed
- Skills ≤5KB, vault for details
- Never load all skills

---

## Memory & Knowledge (MANDATORY)

### MCP Services
1. **memory** - Session/project state, search before investigating
2. **vault-rag** - Obsidian knowledge, query before duplicating

### Discipline
- Use skills for domain knowledge
- Use MCP over manual lookups
- Never duplicate knowledge
- Search then investigate
- Store all discoveries

---

## Parallel Execution (MANDATORY)

### When to Parallel
**Independent tasks** (no output dependencies, no shared state, order irrelevant):
- Read multiple files
- Run tests in different packages
- Search directories
- Multiple checks (lint/test/arch)

**Dependent tasks** (MUST sequence):
- Write → Read
- Branch → Commit
- Build → Test
- Investigate → Fix → Verify

### Patterns

**1. Fan-Out Investigation**
```
ONE question → MANY agents → COMBINE
```

**2. Parallel Verification**
```
ONE change → MANY checks → GATHER
```

**3. Scatter-Gather Research**
```
ONE bug → MANY investigations → IDENTIFY root cause
```

### Execution Rule
**MUST use single message with multiple Task calls:**

```
✗ Sequential: Task 1 → wait → Task 2 → wait
✓ Parallel: Single message with Task 1, Task 2, Task 3, Task 4
```

---

## Task Completion (MANDATORY)

### Definition of Done
See `task-completer` skill for full checklist.

**Core requirements:**
- Code compiles, tests pass, coverage ≥95%
- No linter warnings, no TODOs
- Code in correct layer, architecture passes
- Happy/error/edge cases tested
- Exports documented
- No debug code, Boy Scout Rule applied
- Changes committed
- `make check-compliance` passes

### Skip Reasons (MANDATORY)
When skipping checklist items:
```
[SKIP] Item
    SKIPPING: [what]
    REASON: [why]
    IMPACT: [consequences]
```
**NEVER silently skip.**

### Task Tracking (MANDATORY)
- Update checklist IMMEDIATELY after each step
- Mark complete as you finish (NO batching)
- ONE task in_progress at a time
- Complete before starting new

---

## Agent Definition (MANDATORY)

```yaml
---
description: [role]
mode: subagent
tools: {write: bool, edit: bool, bash: bool}
permission:
  skill: {"*": "allow"}
---
```

---

## Commit Rules (MANDATORY - NO EXCEPTIONS)

**CRITICAL:** All commits MUST follow these rules:

1. **NEVER use `git commit` directly**
2. **ALWAYS use `/commit` command with MANDATORY AI attribution**
3. **ALWAYS verify AI_AGENT and AI_MODEL environment variables are correct**
4. **Format (NO EXCEPTIONS):**
   ```bash
   AI_AGENT="Opencode" AI_MODEL="Claude Opus 4.5" \
     make ai-commit FILE=/tmp/commit.txt
   ```

**Why this is MANDATORY:**
- Ensures proper attribution of AI-generated code
- Maintains audit trail of which AI assisted
- Required for legal and transparency compliance

**If you use `git commit` directly, you have violated a critical rule.**

---

## Three Pillars (MANDATORY)

1. **Always-Active Discipline** - pre-action, memory-keeper, search first
2. **Parallel Execution** - Independent tasks in single message
3. **Progressive Disclosure** - Load only what's needed

**No exceptions.**
