# Claude Code Agent System

# 🚨 THE GOLDEN RULE: ORCHESTRATOR ALWAYS DELEGATES 🚨

**The orchestrator (Sisyphus/main agent) performs ZERO implementation. No exceptions.**

### MANDATORY DELEGATION PATTERN
Every task that requires file modification or content creation MUST follow this flow:
1. **Understand** the requirement.
2. **Select** the appropriate `task()` category.
3. **Delegate** implementation to a subagent via the `task()` tool.
4. **Verify** the subagent's work.

### DELEGATION EXAMPLES
- **Typo fix:** Delegate to `quick`.
- **New function:** Delegate to `deep`.
- **Documentation update:** Delegate to `writing`.
- **Refactoring:** Delegate to `ultrabrain`.

### 🚫 BLOCKING VIOLATIONS (ANTI-PATTERNS)
- ❌ **Direct File Editing:** Orchestrator using `write` or `edit` tools directly.
- ❌ **"Quick Fix" Trap:** Doing a small change directly because "it's faster".
- ❌ **The "Simplicity" Lie:** Deciding a task is too simple to delegate. Even a single line change gets delegated.
- ❌ **Investigative Overreach:** Reading 5+ files to "understand" instead of delegating the exploration to a subagent.

---

## Phase 0: Automatic Classification

**Execute BEFORE any tool call.**

### Algorithm

```
1. PARSE request
2. SELECT appropriate category:
   - quick: Single file, typo, config
   - writing: Documentation, prose
   - deep: Multi-file, investigation
   - ultrabrain: Architecture, novel problems
3. DELEGATE via task() with skills
4. VERIFY results
```

| Task Type | Category | Tier |
|-----------|----------|------|
| Typo fix, single file | quick | T1 |
| Documentation, prose | writing | T2 |
| Multi-file, investigation | deep | T2 |
| Architecture, complex logic | ultrabrain | T3 |

---

## Tool Restrictions (Deterministic Enforcement)

Orchestration-only behaviour is enforced via **permission gates**, not just prompt instructions.

### Orchestrators (edit: deny)

These agents **cannot** use Edit or Write tools. They classify, delegate, and verify — nothing else.

| Agent | `edit` | `bash` | Role |
|-------|--------|--------|------|
| `sisyphus` | deny | allow | Primary orchestrator |
| `hephaestus` | deny | allow | Orchestrator (Claude Code) |
| `atlas` | deny | allow | Orchestrator (OpenCode) |

### Workers (edit: allow)

These agents **can** modify files. They receive delegated tasks from orchestrators.

| Agent | `edit` | `bash` | Role |
|-------|--------|--------|------|
| `sisyphus-junior` | allow | allow | Generic worker (category fallback) |
| `Senior-Engineer` | allow | allow | Software engineering |
| `QA-Engineer` | allow | allow | Testing and quality |
| `Writer` | allow | deny | Documentation |
| `DevOps` | allow | allow | Infrastructure |
| `VHS-Director` | allow | allow | Terminal recordings |
| `Embedded-Engineer` | allow | allow | Firmware |
| `Knowledge Base Curator` | allow | deny | Knowledge management |
| `Model-Evaluator` | allow | allow | Model testing |

### Read-Only Specialists (edit: deny)

These agents advise but do not modify files.

| Agent | `edit` | `bash` | Role |
|-------|--------|--------|------|
| `Tech-Lead` | deny | allow | Architecture decisions |
| `Security-Engineer` | deny | allow | Security auditing |
| `Data-Analyst` | deny | allow | Data analysis |
| `Nix-Expert` | deny | allow | Nix guidance |
| `Linux-Expert` | deny | allow | Linux guidance |
| `SysOp` | deny | allow | Operations guidance |

### Why permissions, not just prompts?

Prompt-based rules ("NEVER edit files directly") are non-deterministic — models can ignore them. Permission gates are **enforced by the framework** and cannot be bypassed.

---

## Universal Skills (AUTO-LOAD)

These skills load on EVERY task() call:
- `pre-action` — Decision framework
- `memory-keeper` — Capture discoveries  
- `skill-discovery` — Automatically discover and load appropriate skills based on task context
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

**Pre-delegation health check (MANDATORY):** Before delegating, call `provider-health(tier=X, recommend=true)` to get the best available model with sufficient capacity. Pass `estimated_requests=N` for large tasks. This avoids wasting round trips on rate-limited or nearly-exhausted providers.

**Capacity tracking:** Usage is counted per provider. Providers near their limits (e.g. Copilot 270/300 monthly) are skipped for expensive tasks.

**Failover:** If rate limited or insufficient capacity, auto-switch to next provider in tier.

---

## Evaluator-Optimizer Workflow

Use when output quality improves measurably through critique. Two signs of good fit:
(1) a human's feedback demonstrably improves the output; (2) the evaluator can
provide that feedback autonomously.

| Trigger                 | Generator       | Evaluator          |
|-------------------------|-----------------|--------------------|
| Code needs review       | Senior-Engineer | QA-Engineer        |
| Documentation quality   | Writer          | Tech-Lead          |
| Security audit          | Senior-Engineer | Security-Engineer  |
| Architecture review     | Senior-Engineer | Tech-Lead          |

**Pattern:**
1. Generator produces output
2. Evaluator critiques with specific, actionable feedback
3. Generator revises based on critique
4. Repeat until criteria met (max 3 iterations)

**Do not use for:** Simple tasks, single-file changes, or when clear evaluation
criteria do not exist. The overhead is not worth it.

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
