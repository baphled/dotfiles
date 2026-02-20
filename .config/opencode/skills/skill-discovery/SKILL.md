---
name: skill-discovery
description: Automatically discover/load local skills and suggest external skills based on task context
category: Core Universal
---

# Skill: skill-discovery

**classification:** Core Universal  
**tier:** T0 (System Behavior)  
**confidence:** 10/10  
**source:** system-mandatory  
**dependencies:** pre-action, memory-keeper
**aliases:** skill-discovery, automatic-skill-discovery

---

## Purpose

Skill Discovery ensures the agent has the correct domain expertise for every task. It performs two critical functions:
1. **Internal Auto-loading (Phase 0)**: Automatically identifies and loads installed skills based on task context.
2. **External Suggestion**: Proactively identifies gaps and suggests relevant community skills from [skills.sh](https://skills.sh).

---

## Phase 0: Automatic Classification

**Execute BEFORE any tool call.**

### Algorithm

1. **PARSE** request for complexity signals.
2. **IF** any are true → **COMPLEX**:
   - Multiple files/modules/packages
   - "write/create/build" + "app/project/feature"
   - Tests required
   - Architecture decisions needed
   - Multiple domains
3. **IF COMPLEX** → Load relevant domain skills and delegate if necessary.
4. **IF SIMPLE** → Work directly (single file edit, typo fix, direct answer).

---

## Internal Skill Selection Matrix

| Trigger | Category | Skills |
|---------|----------|--------|
| Go/golang | unspecified-high | golang, clean-code, architecture |
| Tests | unspecified-high | ginkgo-gomega, bdd-workflow, tdd-workflow |
| CLI/TUI | unspecified-high | bubble-tea-expert, ui-design, ux-design |
| API | unspecified-high | api-design, api-documentation |
| Database | unspecified-high | gorm-repository, db-operations |
| Git | quick | git-master, create-pr, auto-rebase |
| Architecture | ultrabrain | architecture, design-patterns |
| Documentation | writing | documentation-writing |

---

## External Skill Suggestion (skills.sh)

Suggest an external skill when ALL local options are exhausted and ANY of these conditions are met:
1. **Unfamiliar technology** — The task involves a library not covered by installed skills.
2. **Explicit skill gap** — The agent recognises it lacks domain expertise.
3. **User signals need** — The user asks for help with a specific technology.
4. **Repeated uncertainty** — 2+ uncertain statements about the same technology in one session.

### Guardrails for Suggestions
- **Max 1 suggestion per session** — Do not nag.
- **User consent required** — NEVER auto-import.
- **70% confidence threshold** — Only suggest when highly confident it helps.
- **Max size 5KB** — Per system convention.

---

## Execution Rules

1. **Classify Context FIRST** - Before tools, before thinking, classify the request context.
2. **Auto-select Internal Skills** - Match keywords from the prompt to the skill matrix.
3. **Inject load_skills** - Ensure all selected skills are injected into the task call.
4. **Identify External Gaps** - If local skills are insufficient, check skills.sh (max once).
5. **Phase 0 Gate** - Prevents proceeding without appropriate skill coverage.

---

## Anti-Patterns

❌ Proceeding without domain-specific skills loaded  
❌ Manual skill loading when skill-discovery is possible  
❌ Suggesting external skills more than once per session  
❌ Auto-importing external skills without explicit user consent  
❌ Loading irrelevant skills that waste token context  

---

## Integration Points

- **Phase 0 gate** - Runs before all other processing.
- **Skill-auto-loader-config.jsonc** - Source of truth for baseline and keyword mappings.
- **Universal Skill** - Always loaded by default.
