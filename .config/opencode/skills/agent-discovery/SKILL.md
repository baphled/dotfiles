---
name: agent-discovery
description: Discover and recommend custom agents based on task context for intelligent delegation
category: meta
compatibility: agent
---

# Skill: agent-discovery

## What I do

I scan agent definition files in `~/.config/opencode/agents/`, match task context to agent capabilities, and recommend the best agent for delegation. I build an in-memory capability map from each agent's frontmatter and "When to use" section, then compare against the current task to surface relevant specialists. Advisory only — I recommend, the orchestrator decides.

## When to use me

- When a complex task would benefit from domain-specific agent expertise
- When work spans multiple modules or systems requiring specialist knowledge
- When the task matches specific agent capabilities (security, DevOps, data analysis, etc.)
- When the orchestrator is unsure which agent would handle a task most effectively
- When a new task arrives that could be delegated rather than handled generically

## Trigger conditions

Suggest an agent scan when ANY of these conditions are met:

1. **Security/vulnerability/audit** — Check for Security-Engineer agent
2. **CI/CD/deployment/infrastructure** — Check for DevOps agent
3. **Data/analysis/metrics/reporting** — Check for Data-Analyst agent
4. **Embedded/microcontroller/Arduino/ESP** — Check for Embedded-Engineer agent
5. **Nix/flakes/reproducible builds** — Check for Nix-Expert agent
6. **Linux/system administration/kernel** — Check for Linux-Expert agent
7. **Testing/QA/coverage/test strategy** — Check for QA-Engineer agent
8. **Architecture/tech lead decisions/design review** — Check for Tech-Lead agent
9. **Writing/documentation/blog/content** — Check for Writer agent
10. **Terminal recording/demos/VHS** — Check for vhs-director agent
11. **System operations/maintenance/monitoring** — Check for SysOp agent
12. **KB/documentation sync/audit** — Check for Knowledge Base Curator agent
13. **Skill/agent file changes** — Trigger KB Curator in background (see KB Curator auto-trigger)

## Core principles

1. **Advisory-only** — Recommend agents, never auto-invoke them. The orchestrator always has final say
2. **Suggest-then-delegate** — Announce recommendation with reason, then proceed unless the user objects
3. **Maximum 2 recommendations** — At most 2 agent recommendations per task to avoid decision fatigue
4. **70% confidence threshold** — Only recommend when confident the agent would materially improve the outcome. If unsure, stay silent
5. **Complexity threshold** — Skip agent-discovery for trivial tasks (single file edits, typo fixes, simple queries). Not every task needs a specialist
6. **Self-recommendation suppression** — If you ARE the recommended agent, suppress that recommendation and skip to the next best match

## Registry building

### Step 1: Scan agent definition files

```bash
# Scan all agent definition files
ls ~/.config/opencode/agents/*.md
```

### Step 2: Extract capabilities from each agent

For each `.md` file found:

1. **Extract `description`** from the YAML frontmatter (between `---` markers)
2. **Extract bullet points** from the `## When to use this agent` section
3. **Build capability map:** agent name → [capabilities list]

### Step 3: Handle edge cases

- **Files with spaces in names** — Quote paths properly (e.g., `"Knowledge Base Curator.md"`)
- **Malformed files** — Skip gracefully if frontmatter is missing or "When to use" section is absent
- **No persistent cache** — Scan fresh each time; do NOT create index or cache files
- **No recursive scanning** — Only scan `~/.config/opencode/agents/` root directory
- **Read-only** — Never modify agent files during registry building

### Current agent registry (13 agents)

| Agent File | Domain |
|------------|--------|
| Data-Analyst.md | Data analysis, metrics, reporting |
| DevOps.md | CI/CD, deployment, infrastructure |
| Embedded-Engineer.md | Embedded systems, microcontrollers |
| Knowledge Base Curator.md | KB sync, documentation audit |
| Linux-Expert.md | Linux administration, system config |
| Nix-Expert.md | Nix, flakes, reproducible builds |
| QA-Engineer.md | Testing, QA, coverage strategy |
| Security-Engineer.md | Security audits, vulnerability assessment |
| Senior-Engineer.md | General senior engineering tasks |
| SysOp.md | System operations, maintenance |
| Tech-Lead.md | Architecture decisions, design review |
| vhs-director.md | Terminal recording, VHS demos |
| Writer.md | Writing, documentation, blog content |

## Matching heuristics

### Step 1: Extract task keywords

Parse the current task description and extract keywords and phrases relevant to agent capabilities. Focus on domain-specific terms, action verbs, and technology names.

### Step 2: Compare against capability map

For each agent in the registry:
- Compare extracted task keywords against the agent's capabilities (from "When to use" bullets)
- Score based on keyword overlap and specificity

### Step 3: Select best match

- **Most-specific match wins** — The agent whose capabilities have the most overlap with task keywords ranks highest
- **Tiebreaker** — If multiple agents match equally well, present the top 2 and let the orchestrator choose
- **Silence threshold** — If no agent exceeds the 70% confidence threshold, do not recommend. Stay silent rather than guess
- **Self-suppression** — If the current agent matches, skip to the next best match

## Delegation protocol

Use this EXACT format when recommending an agent:

```
🔍 **Agent recommendation:** `{agent-name}` is well-suited for this task.

**Why:** {one-sentence reason tied to the current task}
**Capabilities:** {2-3 key capabilities from the agent's "When to use" section}
**Action:** Proceeding with delegation unless you object.
```

After presenting the recommendation:

1. **Proceed** — Load the agent's `default_skills` and spawn the appropriate task
2. **User objects** — Acknowledge and continue without that agent
3. **Multiple matches** — Present up to 2 recommendations, let orchestrator choose

## Self-recommendation suppression

When the agent running agent-discovery IS the recommended agent (e.g., Senior-Engineer recommends Senior-Engineer):

1. **Detect** — Compare the current agent identity against the top recommendation
2. **Suppress** — Do not present the self-referential recommendation
3. **Skip** — Move to the next best match in the capability ranking
4. **No match** — If the only viable recommendation is self, stay silent

Never recommend delegating to yourself. This prevents circular delegation and wasted context.

## KB Curator auto-trigger

When ANY file in `~/.config/opencode/skills/` or `~/.config/opencode/agents/` is created, modified, or deleted during a task:

1. **Detect the change** — Monitor for file operations in skill/agent directories
2. **Spawn KB Curator in background:**
   ```
   task(category="unspecified-low", load_skills=["obsidian-structure", "obsidian-frontmatter", "research", "documentation-writing", "british-english"], prompt="Sync KB after skill/agent change: [list changed files]. Update Obsidian vault documentation to reflect the changes.", run_in_background=true)
   ```
3. **One instance only** — If a KB Curator is already running, skip. Never spawn multiple concurrent instances
4. **Fire-and-forget** — Do not wait for the result. Do not block the primary task
5. **Purpose** — Ensures the knowledge base stays in sync with actual skill/agent state

## Guardrails

1. **Maximum 2 recommendations per task** — Do not overwhelm with suggestions
2. **70% confidence threshold** — Only recommend when confident
3. **Advisory only** — NEVER auto-invoke agents; the orchestrator decides
4. **No recursive scanning** — Only scan `~/.config/opencode/agents/` root directory
5. **No network calls** — Registry scanning must be instant and offline
6. **No persistent cache** — Scan fresh each time, never create index files
7. **Complexity threshold** — Skip for trivial tasks (single-file edits, typo fixes, simple queries)
8. **One KB Curator instance** — Never spawn multiple concurrent KB Curator tasks
9. **Read-only scanning** — Never modify agent files during registry building
10. **Self-suppression** — Never recommend the current agent to itself

## Anti-patterns to avoid

- ❌ **Recommending for trivial tasks** — Single file changes don't need specialist agents
- ❌ **Auto-invoking agents** — Always advisory, never executive
- ❌ **Merging with skill-discovery** — They serve different purposes (skill-discovery finds external community skills; agent-discovery finds internal custom agents)
- ❌ **Creating cache/index files** — Scan on demand, no persistence
- ❌ **Recursive directory scanning** — Only scan the agents root directory
- ❌ **Modifying agent files during scanning** — Read-only operation
- ❌ **Suggesting when uncertain** — Below 70% confidence, stay silent
- ❌ **Recommending yourself** — Suppress self-referential suggestions
- ❌ **Spawning multiple KB Curator instances** — One at a time maximum

## Patterns & examples

### Example 1: Security task

**Context:** User asks "Audit this code for security vulnerabilities"

**Agent scan:** Security-Engineer.md → "When to use: Security audits of code changes, Vulnerability assessment"

**Recommendation:**
```
🔍 **Agent recommendation:** `Security-Engineer` is well-suited for this task.

**Why:** The task requires a security audit, which is Security-Engineer's core specialisation.
**Capabilities:** Security audits of code changes, vulnerability assessment, defensive programming review
**Action:** Proceeding with delegation unless you object.
```

### Example 2: DevOps task

**Context:** User asks "Set up CI/CD pipeline for this project"

**Agent scan:** DevOps.md → "When to use: CI/CD pipeline work, Infrastructure as code"

**Recommendation:**
```
🔍 **Agent recommendation:** `DevOps` is well-suited for this task.

**Why:** CI/CD pipeline setup is a core DevOps capability and benefits from infrastructure expertise.
**Capabilities:** CI/CD pipeline configuration, infrastructure as code, deployment automation
**Action:** Proceeding with delegation unless you object.
```

### Example 3: No match — trivial task

**Context:** User asks "Fix this typo in the README"

**Agent scan:** Complexity threshold not met — single-file trivial edit.

**Result:** No recommendation. Stay silent. The orchestrator handles this directly without specialist delegation.

## Related skills

- `skill-discovery` — Discovers external community skills (this skill discovers internal agents)
- `core-auto-detect` — Detects project environment for skill recommendations
- `tool-usage-discipline` — Ensures proper tool and skill usage patterns
- `clean-code` — Applies across all agent domains
