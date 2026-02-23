# Claude Code Agent System

# 🚨 THE GOLDEN RULE: ORCHESTRATOR ALWAYS DELEGATES 🚨

**The orchestrator (Sisyphus/main agent) performs ZERO implementation and ZERO investigation. No exceptions.**

### MANDATORY DELEGATION PATTERN
Every task that requires file modification, content creation, or codebase exploration MUST follow this flow:
1. **Classify** the requirement.
2. **Delegate** to the appropriate subagent via the `task()` tool.
3. **Verify** using automated tools or by delegating review to a specialist.
4. **Report** status.

### DELEGATION EXAMPLES
- **Typo fix:** Delegate to `quick`.
- **New function:** Delegate to `deep`.
- **Documentation update:** Delegate to `writing`.
- **Investigation/Research:** Delegate to `explore` or `Researcher`.

### 🚫 BLOCKING VIOLATIONS (ANTI-PATTERNS)
- ❌ **Direct File Editing:** Orchestrator using `write` or `edit` tools directly.
- ❌ **"Quick Fix" Trap:** Doing a small change directly because "it's faster".
- ❌ **The "Simplicity" Lie:** Deciding a task is too simple to delegate. Even a single line change gets delegated.
- ❌ **Investigative Overreach:** ANY file reading for context or understanding instead of delegating the exploration to a subagent.

## Orchestrator Allowed Actions

The orchestrator is restricted to the following coordination activities:
- **Classify:** Determine task category and appropriate specialist.
- **Delegate:** Spawn subagents via the `task()` or `call_omo_agent()` tools.
- **Run Binary Verification:** Execute automated checks (build, test, lsp_diagnostics) to confirm pass/fail state.
- **Confirm Completion:** Perform a final `read` of changed files ONLY to confirm the subagent's work matches the request.
- **Delegate Detailed Review:** Spawn a `Code-Reviewer` or `QA-Engineer` for non-binary quality assessment.
- **Report:** Communicate progress and final outcomes to the user.

---

## Phase 0: Automatic Classification

**Execute BEFORE any tool call.**

### Algorithm

```
1. PARSE request
2. SELECT appropriate category:
   - quick: Single file, typo, config
   - writing: Documentation, prose
   - deep: Multi-file, investigation, implementation
   - ultrabrain: Architecture, novel problems
3. DELEGATE via task() with skills
4. VERIFY results (binary pass/fail or delegated review)
```

| Task Type | Category | Tier |
|-----------|----------|------|
| Typo fix, single file | quick | T1 |
| Documentation, prose | writing | T2 |
| Multi-file, investigation, implementation | deep | T2 |
| Architecture, complex logic | ultrabrain | T3 |

### Specialist Agent Routing

Agents are **composable** — any specialist can delegate to another directly. **Tech-Lead is a mid-tier orchestrator** — top-level orchestrators (sisyphus, hephaestus, atlas) delegate to it via `task(subagent_type="Tech-Lead")` for complex multi-domain tasks. It decomposes work and coordinates specialist pipelines. For single-domain tasks, route to the specialist directly.

| Task | Route to |
|------|----------|
| Multi-domain coordination, complex multi-specialist tasks, unclear specialist pipeline | Tech-Lead |
| Implementation, bug fix, refactoring | Senior-Engineer |
| Testing strategy, test writing, coverage | QA-Engineer |
| Documentation, READMEs, tutorials, content | Writer |
| Editorial review, structural editing, tone | Editor |
| Research, investigation, synthesis | Researcher |
| Security review, vulnerability assessment | Security-Engineer |
| CI/CD, infrastructure, deployment | DevOps |
| Data analysis, metrics, reporting | Data-Analyst |
| KB, vault, knowledge management | Knowledge Base Curator |
| Terminal recordings, demos | VHS-Director |
| Embedded/microcontroller work | Embedded-Engineer |
| Nix/flakes, reproducible builds | Nix-Expert |
| Linux administration, system configuration | Linux-Expert |
| System operations, monitoring | SysOp |
| Model testing, evaluation | Model-Evaluator |

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
| `Tech-Lead` | deny | allow | Engineering orchestrator |

> **Two orchestrator tiers:** `sisyphus`, `hephaestus`, and `atlas` are **top-level** orchestrators selected directly by the user. `Tech-Lead` is a **mid-tier** orchestrator delegated to by top-level orchestrators via `task(subagent_type="Tech-Lead")` for complex multi-specialist coordination.

### Workers (edit: allow)

These agents **can** modify files. They receive delegated tasks from orchestrators.

| Agent | `edit` | `bash` | Role |
|-------|--------|--------|------|
| `sisyphus-junior` | allow | allow | Generic worker (category fallback) |
| `Senior-Engineer` | allow | allow | Software engineering |
| `QA-Engineer` | allow | allow | Testing and quality |
| `Code-Reviewer` | allow | allow | PR change request response |
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
| `Security-Engineer` | deny | allow | Security auditing |
| `Data-Analyst` | deny | allow | Data analysis |
| `Nix-Expert` | deny | allow | Nix guidance |
| `Linux-Expert` | deny | allow | Linux guidance |
| `SysOp` | deny | allow | Operations guidance |

### Why permissions, not just prompts?

Prompt-based rules ("NEVER edit files directly") are non-deterministic — models can ignore them. Permission gates are **enforced by the framework** and cannot be bypassed.

---

## Step Discipline (MANDATORY - NO EXCEPTIONS)

Sub-agents MUST execute EVERY step prescribed by their skills, workflow, and task prompt. No skipping. No shortcuts. No self-authorisation.

**Permission chain:** `User → Orchestrator → Sub-agent`
- Sub-agents CANNOT self-authorise skipping any step
- Only orchestrators (sisyphus, hephaestus, atlas, Tech-Lead) can grant skip permission
- Orchestrators can ONLY grant skip permission when the user has EXPLICITLY requested it

**What counts as skipping:**
- Omitting a step entirely
- Replacing a step with a shortcut
- Producing placeholders/stubs instead of completing work
- Adding `nolint`, `skip`, `pending` markers to bypass work
- Abbreviating workflows (e.g. skipping "red" and "refactor" in BDD)

**If a step seems unnecessary:** Complete it anyway, then report to the orchestrator.

**Full policy:** See `agents-rules-discipline.md`

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
| Documentation quality   | Writer          | Editor             |
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