# OpenCode Agent System

## Phase 0: Automatic Classification

**Execute BEFORE any tool call.**

### Algorithm

```
1. PARSE request for complexity signals
2. IF any are true → COMPLEX:
   - Multiple files/modules/packages
   - "write/create/build" + "app/project/feature"
   - Tests required
   - Architecture decisions needed
   - Multiple domains
3. IF COMPLEX → DELEGATE (no permission needed)
4. IF SIMPLE → work directly
```

### SIMPLE
- Single file edit, typo fix, direct answer from context

### COMPLEX (auto-discovery)
- Multi-file tasks, tests, CLI, architecture, new features

### DEFAULT BIAS: DELEGATE

---

## Universal Skills (AUTO-LOAD)

These skills load on EVERY task() call:
- `pre-action` — Decision framework
- `memory-keeper` — Capture discoveries  
- `auto-discovery` — Automatically discover and load appropriate skills based on task context
- `agent-discovery` — Automatically discover and route to appropriate specialist agents

---

## Commit Rules

**MANDATORY:** Use `git_master` skill for planning, `make ai-commit` for execution.

1. **Planning:** `git_master` for atomic commits, style detection, dependency ordering
2. **New commits:** Write to `tmp/commit.txt`, run `make ai-commit FILE=tmp/commit.txt`
3. **Fixups:** `git commit --fixup=<hash>` directly
4. **Before first commit:** Run `make check-compliance`

**NEVER use raw `git commit -m` for new commits.**

---

## Change Request Verification

When addressing review feedback:
1. **Identify** — Locate each request
2. **Understand** — What exactly is being asked?
3. **Verify** — Read actual code to confirm change
4. **Document** — File, before/after, verification
5. **Report** — Status: ADDRESSED, FALSE POSITIVE, or REJECTED

**Evidence required:** File path, before state, after state, proof of change.

---

## Model Routing

**Match complexity to tier:**

| Tier | When | Models |
|------|------|--------|
| T1 | Exploration, search | gpt-5-mini, Haiku |
| T2 | Implementation, tests, writing | gpt-5, Sonnet 4 |
| T3 | Architecture, novel problems | Opus 4.6 |

| Category | Tier |
|----------|------|
| quick, unspecified-low | T1 |
| deep, visual-engineering, writing, unspecified-high | T2 |
| ultrabrain, artistry | T3 |

**Failover:** If rate limited, auto-switch to next provider in tier.

---

## Three Pillars

1. **Always-Active Discipline** — pre-action, memory-keeper, search first
2. **Parallel Execution** — Independent tasks in single message
3. **Progressive Disclosure** — Load only what's needed

---

## Communication

**Style:** Direct, plain, no validation.

- No "Great question!" or "I love that idea!"
- No over-apologising
- No verbose intros/outros
- Disagree plainly
- Get to the point
