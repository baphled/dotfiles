# Agent System

# 🚨 THE GOLDEN RULE: ORCHESTRATOR ALWAYS DELEGATES 🚨

**The orchestrator performs ZERO implementation and ZERO investigation. No exceptions.**

Pattern: Classify → Delegate via `task()` → Verify → Report.

🚫 Orchestrators MUST NOT: edit files directly, do "quick fixes", read files for context (delegate to `explore`/`Researcher` instead).

### Orchestrator Allowed Actions

- **Classify** task and select specialist
- **Delegate** via `task()` or `call_omo_agent()`
- **Verify** via automated checks (build, test, lsp_diagnostics, git status)
- **Confirm** final `read` of changed files ONLY to confirm subagent work
- **Report** progress and outcomes

---

## Specialist Agent Routing

Agents are composable. **Tech-Lead** orchestrates multi-domain tasks. Single-domain → route directly.

| Task                                       | Route to               |
| ------------------------------------------ | ---------------------- |
| Multi-domain coordination                  | Tech-Lead              |
| Implementation, bug fix, refactoring       | Senior-Engineer        |
| Testing strategy, test writing, coverage   | QA-Engineer            |
| Documentation, READMEs, tutorials, content | Writer                 |
| Editorial review, structural editing, tone | Editor                 |
| Research, investigation, synthesis         | Researcher             |
| Security review, vulnerability assessment  | Security-Engineer      |
| CI/CD, infrastructure, deployment          | DevOps                 |
| Data analysis, metrics, reporting          | Data-Analyst           |
| KB, vault, knowledge management            | Knowledge Base Curator |
| Terminal recordings, demos                 | VHS-Director           |
| Embedded/microcontroller work              | Embedded-Engineer      |
| Nix/flakes, reproducible builds            | Nix-Expert             |
| Linux administration, system configuration | Linux-Expert           |
| System operations, monitoring              | SysOp                  |
| Model testing, evaluation                  | Model-Evaluator        |
| Planning, task decomposition, pre-flight analysis | Prometheus (Plan Builder) |

---

## Pre-Delegation Gate (MANDATORY)

Before EVERY `task()` call:
0. For complex or ambiguous requests: fire `task(subagent_type="Prometheus", ...)` first — Prometheus is the Plan Builder that decomposes requests into structured, sequenced work plans before delegating implementation work.
1. Look up routing table for specialist match.
2. ≥70% confidence → use `subagent_type="{Specialist}"`. Do NOT use `category=`.
3. No match → fall back to `category=` routing.
4. NEVER use `subagent_type="Sisyphus-Junior"` directly.

🚫 Using `category=` when a specialist exists, using Sisyphus-Junior for routable work, or skipping the routing table lookup are all **blocking violations**.

---

## Delegation Rules

- **Atomicity:** One concern per delegation. No batching distinct changes.
- **Session cap:** 15 tasks max. Decompose larger plans into phases.
- **Background default:** `run_in_background=true` for explore/librarian.
- **Specialists over generics:** Never use Sisyphus-Junior as a catch-all.
- **Exception:** Deviations only for genuine production incidents.

---

## Tool Restrictions

### Orchestrators (edit: deny)

| Agent        | `edit` | `bash` | Role                       |
| ------------ | ------ | ------ | -------------------------- |
| `sisyphus`   | deny   | allow  | Primary orchestrator       |
| `hephaestus` | deny   | allow  | Orchestrator (Claude Code) |
| `atlas`      | deny   | allow  | Orchestrator (OpenCode)    |
| `Tech-Lead`  | deny   | allow  | Engineering orchestrator   |

### Workers (edit: allow)

| Agent                    | `edit` | `bash` | Role                               |
| ------------------------ | ------ | ------ | ---------------------------------- |
| `sisyphus-junior`        | allow  | allow  | Generic worker (category fallback) |
| `Senior-Engineer`        | allow  | allow  | Software engineering               |
| `QA-Engineer`            | allow  | allow  | Testing and quality                |
| `Code-Reviewer`          | allow  | allow  | PR change request response         |
| `Writer`                 | allow  | deny   | Documentation                      |
| `DevOps`                 | allow  | allow  | Infrastructure                     |
| `VHS-Director`           | allow  | allow  | Terminal recordings                |
| `Embedded-Engineer`      | allow  | allow  | Firmware                           |
| `Knowledge Base Curator` | allow  | deny   | Knowledge management               |
| `Editor`                  | allow  | deny   | Editorial review                     |
| `Model-Evaluator`        | allow  | allow  | Model testing                      |
| `Oracle`                 | allow  | allow  | Deep analysis + implementation     |

### Read-Only Specialists (edit: deny)

| Agent               | `edit` | `bash` | Role                |
| ------------------- | ------ | ------ | ------------------- |
| `Security-Engineer` | deny   | allow  | Security auditing   |
| `Data-Analyst`      | deny   | allow  | Data analysis       |
| `Nix-Expert`        | deny   | allow  | Nix guidance        |
| `Linux-Expert`      | deny   | allow  | Linux guidance      |
| `SysOp`             | deny   | allow  | Operations guidance |
| `Researcher`          | deny   | deny   | Research and investigation |
| `Prometheus`           | deny   | deny   | Plan Builder (built-in OMO agent) — pre-flight planning and task decomposition |

---

## Step Discipline

Sub-agents MUST execute EVERY prescribed step. No skipping. No self-authorisation. Permission chain: `User → Orchestrator → Sub-agent`.

---

## Universal Skills (AUTO-LOAD)

`pre-action`, `memory-keeper`, `skill-discovery` — loaded on every `task()` call.

## Knowledge Lookup Protocol

**Before any investigation:** 1) `mcp_memory_search_nodes` 2) `mcp_vault-rag_query_vault` 3) Codebase/web as last resort.

**After significant work:** capture via `mcp_memory_create_entities` or `mcp_memory_add_observations`.

## KB Curator Auto-Trigger

After significant work, fire as background task: `task(subagent_type="Knowledge Base Curator", run_in_background=true, load_skills=[], prompt="Sync: {what changed}")`

Mandatory triggers: agentic flow changes, project deliverables, configuration changes, new knowledge captured.

---

## Skill Injection Limits

- **Orchestrators:** `load_skills=[]` always.
- **Subagents:** Maximum 3–4 task-relevant skills per `task()` call.
- **On-demand:** Use `mcp_skill` tool mid-task instead of front-loading.
- **Orchestrators only:** `agent-discovery` — only load on orchestrating agents (sisyphus, hephaestus, atlas, Tech-Lead). Never on workers or specialists.
- **Prometheus only:** Thinking skills (`critical-thinking`, `epistemic-rigor`, `assumption-tracker`, `systems-thinker`, `scope-management`, `estimation`) — only load when delegating to `Prometheus`.

### 🚫 Skill Content in Prompts (BLOCKING VIOLATION)

- ❌ NEVER paste skill content (`<skill name="...">` XML blocks) into `task()` prompts.
- ❌ NEVER inline skill markdown into the `prompt` field.
- ✅ ALWAYS use `load_skills=["skill-name"]` — the plugin handles injection.
- Applies to ALL `task()` calls including `explore`, `librarian`, and specialist agents.

---

## Commit Rules

1. New commits: write to `tmp/commit.txt`, run `make ai-commit FILE=tmp/commit.txt`
2. Fixups: `git commit --fixup=<hash>` directly
3. Before first commit: run `make check-compliance`
4. **NEVER use raw `git commit -m` for new commits.**

---

## Model Routing

| Tier | When                           | Models            |
| ---- | ------------------------------ | ----------------- |
| T1   | Exploration, search            | gpt-5-mini, Haiku |
| T2   | Implementation, tests, writing | gpt-5, Sonnet 4   |
| T3   | Architecture, novel problems   | gpt-5.2, Opus 4.6 |

| Category                                            | Tier |
| --------------------------------------------------- | ---- |
| quick, unspecified-low                              | T1   |
| deep, visual-engineering, writing, unspecified-high | T2   |
| ultrabrain, artistry                                | T3   |

**Pre-delegation health check (MANDATORY):** Call `provider-health(tier=X, recommend=true)` before delegating.
