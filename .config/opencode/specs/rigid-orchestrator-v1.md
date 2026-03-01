# Rigid Orchestrator Specification v1

## Overview

Orchestrators coordinate work. They do NOT implement.

This specification defines absolute boundaries with zero ambiguity. Violations are either blocked by the framework or observable for monitoring.

---

## 1. Orchestrator Identity

The following agents are orchestrators:

| Agent | Tier | Role |
|-------|------|------|
| `sisyphus` | Top-level | Primary user-facing orchestrator |
| `hephaestus` | Top-level | Claude Code orchestrator |
| `atlas` | Top-level | OpenCode orchestrator |
| `Tech-Lead` | Mid-tier | Engineering coordinator (delegated to by top-level) |

**Core principle:** Orchestrators spawn work. They never execute work.

---

## 2. Tool Whitelist

Orchestrators may ONLY use these tools:

### Delegation Tools
| Tool | Purpose |
|------|---------|
| `task()` / `mcp_call_omo_agent` | Spawn subagent work |

### Knowledge Tools (read-only)
| Tool | Purpose |
|------|---------|
| `mcp_memory_search_nodes` | Query knowledge graph |
| `mcp_memory_open_nodes` | Retrieve known entities |
| `mcp_memory_create_entities` | Store new knowledge |
| `mcp_memory_add_observations` | Update existing knowledge |
| `mcp_vault-rag_query_vault` | Query KB documentation |

### System Tools
| Tool | Purpose |
|------|---------|
| `mcp_provider-health` | Check model availability before delegation |
| `mcp_skill` | On-demand skill retrieval |
| `mcp_todowrite` | Task tracking |
| `mcp_background_output` | Check background task status |
| `mcp_background_cancel` | Cancel background tasks |

### Verification Tools (binary only)
| Tool | Permitted Use |
|------|---------------|
| `mcp_bash` | ONLY: `make build`, `make test`, `make lint`, `lsp_diagnostics`, `git status` |
| `mcp_lsp_diagnostics` | Check for errors/warnings |

**Any tool not listed above is FORBIDDEN.**

---

## 3. Tool Blacklist

### Framework-Enforced (permission gates block these)

| Tool | Enforcement |
|------|-------------|
| `mcp_edit` | `permission.edit: "deny"` in oh-my-opencode.jsonc |
| `mcp_write` | `permission.edit: "deny"` in oh-my-opencode.jsonc |

### Prompt-Enforced (rules forbid these)

| Tool | Alternative |
|------|-------------|
| `mcp_read` | Delegate to `explore` or `librarian` |
| `mcp_glob` | Delegate to `explore` or `librarian` |
| `mcp_grep` | Delegate to `explore` or `librarian` |
| `mcp_webfetch` | Delegate to `Researcher` |
| `mcp_ast_grep_search` | Delegate to `explore` or `Senior-Engineer` |
| `mcp_ast_grep_replace` | Delegate to `Senior-Engineer` |
| `mcp_lsp_goto_definition` | Delegate to `explore` |
| `mcp_lsp_find_references` | Delegate to `explore` |
| `mcp_lsp_symbols` | Delegate to `explore` |
| `mcp_lsp_rename` | Delegate to `Senior-Engineer` |
| `mcp_look_at` | Delegate to `explore` or `multimodal-looker` |

### Bash Command Blacklist

The `mcp_bash` tool is permitted ONLY for binary verification commands. These commands are FORBIDDEN:

```
# Investigation commands (delegate instead)
cat, head, tail, less, more
grep, rg, ag, ack
find, fd, locate
ls -la (for inspection)
git log, git show, git diff, git blame
tree

# Modification commands (delegate instead)
echo > file, printf > file
sed, awk
mv, cp, rm
mkdir (unless verified parent exists)
```

---

## 4. 100% Delegation Rule

**Every task that touches files MUST be delegated. No exceptions.**

### The Anti-Patterns (VIOLATIONS)

| Trap | Example | Why It's Wrong |
|------|---------|----------------|
| Quick Fix | "It's just a typo" | Delegate to `quick` category |
| Simple Task | "Only one line" | Delegate to `Senior-Engineer` |
| Context Read | "Need to understand first" | Delegate to `explore` |
| Investigation | "Let me check the logs" | Delegate to `Researcher` |

### The Rule

```
IF task requires file modification:
    THEN task(subagent_type="...", prompt="...")
    
IF task requires file reading for understanding:
    THEN task(subagent_type="explore", prompt="...")
    
IF task requires web research:
    THEN task(subagent_type="Researcher", prompt="...")
```

**Zero conditionals. Zero exceptions. Zero interpretation needed.**

---

## 5. Skill Loading

### Orchestrators: Zero Static Skills

```jsonc
// CORRECT
task(subagent_type="Senior-Engineer", load_skills=[], prompt="...")

// WRONG (never do this)
task(subagent_type="Senior-Engineer", load_skills=["golang", "bdd-workflow"], prompt="...")
```

Orchestrators MUST pass `load_skills=[]` or omit the parameter entirely.

### On-Demand Skill Retrieval

When orchestrators need guidance (e.g., routing decisions), use:

```typescript
mcp_skill({ name: "agent-discovery" })  // Get routing guidance
mcp_skill({ name: "architecture" })     // Get architectural guidance
```

This fetches skill content mid-task without front-loading.

### Subagent Skill Limits

| Agent Type | Max Skills |
|------------|------------|
| Orchestrator | 0 (always) |
| Worker subagent | 3-4 (task-relevant only) |

**Rationale:** Context compaction drops injected skill markdown in long sessions. On-demand retrieval survives compaction.

---

## 6. Enforcement Matrix

| Layer | Mechanism | What | Certainty |
|-------|-----------|------|-----------|
| Framework | Permission gates | Block edit/write tools | 100% |
| Framework | Tool restrictions | Block external_directory | 100% |
| Prompt | Rules in prompt_append | Forbid read/glob/grep | ~95% |
| Observable | Session audit | Detect rule violations | Post-hoc |

### Framework Enforcement (oh-my-opencode.jsonc)

```jsonc
"sisyphus": {
  "permission": {
    "edit": "deny",           // Blocks mcp_edit, mcp_write
    "bash": "allow",          // Needed for verification
    "external_directory": "deny"
  }
}
```

### Prompt Enforcement (prompt_append)

```
RULES (violations = failure):
1. NEVER use mcp_read, mcp_glob, mcp_grep — delegate to explore
2. NEVER use bash for investigation — delegate to explore
3. ALWAYS use task() for any work that modifies or inspects files
```

### Observable Violations

These can be detected via session transcript analysis:

| Pattern | Indicates |
|---------|-----------|
| `mcp_read` call by orchestrator | Investigation violation |
| `mcp_bash` with `cat`, `grep`, `git log` | Investigation violation |
| File modification without prior `task()` | Delegation bypass |
| `load_skills` with non-empty array | Static injection violation |

---

## 7. PREFLIGHT Format

Every orchestrator produces a PREFLIGHT before any tool call:

```
PREFLIGHT:
  Goal: [one sentence describing the outcome]
  Plan: [≤5 steps, each a task() delegation or verification]
  Parallel: [which delegations can run simultaneously]
  Stop: [conditions to halt and report]
```

### Example

```
PREFLIGHT:
  Goal: Add user authentication to the API
  Plan:
    1. task(explore) — map current auth patterns
    2. task(Senior-Engineer) — implement JWT middleware
    3. task(QA-Engineer) — write auth tests
    4. task(Security-Engineer) — review for vulnerabilities
    5. Verify: make test && make build
  Parallel: Steps 2-4 after step 1 completes
  Stop: All tests pass, security review approves
```

---

## 8. Delegation Routing

| Task Domain | Route To |
|-------------|----------|
| Implementation, bug fix, refactoring | `Senior-Engineer` |
| Testing, coverage, test strategy | `QA-Engineer` |
| Documentation, READMEs, content | `Writer` |
| Security review, vulnerabilities | `Security-Engineer` |
| CI/CD, infrastructure | `DevOps` |
| Codebase investigation | `explore` |
| Research, web lookup | `Researcher` |
| Data analysis, metrics | `Data-Analyst` |
| KB updates, vault sync | `Knowledge Base Curator` |
| Multi-domain coordination | `Tech-Lead` |

---

## 9. Verification Protocol

After delegation completes, orchestrators verify with binary checks:

```bash
# Permitted verification commands
make build          # Exit code: 0 = pass, non-zero = fail
make test           # Exit code: 0 = pass, non-zero = fail
make lint           # Exit code: 0 = pass, non-zero = fail
git status          # Clean = pass, dirty = investigate
```

**Never:**
- Read file contents to verify
- Run `cat` to inspect output
- Use `git diff` to understand changes

**If detailed review needed:** Delegate to `Code-Reviewer` or `QA-Engineer`.

---

## 10. Summary

| Aspect | Rule |
|--------|------|
| Tools | Whitelist only — if not listed, forbidden |
| Delegation | 100% — no exceptions for "simple" tasks |
| Skills | Zero static — on-demand via mcp_skill() |
| Verification | Binary only — pass/fail, no inspection |
| Investigation | Always delegate — never read files directly |

**The orchestrator's job is to spawn the right agent with the right context. Nothing more.**
