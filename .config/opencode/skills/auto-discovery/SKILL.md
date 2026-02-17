---
name: auto-discovery
description: Automatically discover and load appropriate skills based on task context
category: Core Universal
---

# Skill: auto-discovery

**classification:** Core Universal  
**tier:** T0 (System Behavior)  
**confidence:** 10/10  
**source:** system-mandatory  
**dependencies:** pre-action, memory-keeper
**aliases:** automatic-skill-discovery

---

## Purpose

Automatically discover and load appropriate skills based on task context. This skill enforces Phase 0 classification and ensures the orchestrator has the correct domain expertise loaded for every task.

---

## When to Apply

**ALWAYS apply this skill FIRST, before ANY other action.**

Every user request must pass through Phase 0 classification to determine required skills.

---

## Classification Rules (Skill Context)

### SIMPLE (Direct Action)
- Single file edit with known location
- Typo fix, rename, small config change
- Direct answer from existing context

### COMPLEX (Requires Skill Discovery)
- "write/create/build" + "app/program/project/feature"
- "tests/testing/TDD"
- "CLI/TUI/command-line"
- "2+ files/modules/packages"
- "architecture/design/refactor"
- "database/ORM/SQL"
- Multi-domain task

---

## Skill Selection Matrix

| Trigger | Category | Skills |
|---------|----------|--------|
| Go/golang | unspecified-high | golang, clean-code, architecture |
| Tests | unspecified-high | ginkgo-gomega, tdd-workflow, test-fixtures-go |
| CLI/TUI | unspecified-high | bubble-tea-expert, ui-design, ux-design |
| API | unspecified-high | api-design, api-documentation |
| Database | unspecified-high | gorm-repository, db-operations |
| Git | quick | git-master, create-pr, auto-rebase |
| Architecture | ultrabrain | architecture, design-patterns |
| Documentation | writing | documentation-writing |

---

## Execution Rules

1. **Classify Context FIRST** - Before tools, before thinking, classify the request context
2. **Auto-select skills** - Match keywords from the prompt to the skill matrix
3. **Inject load_skills** - Ensure all selected skills are injected into the task call
4. **No empty load_skills** - Every delegation MUST include relevant domain skills
5. **Phase 0 Gate** - Prevents proceeding without appropriate skill coverage

---

## Anti-Patterns

❌ Proceeding without domain-specific skills loaded  
❌ Manual skill loading when auto-discovery is possible  
❌ Loading irrelevant skills that waste token context  
❌ Empty load_skills on complex tasks without justification

---

## Integration Points

- **Phase 0 gate** - Runs before all other processing
- **Skill-auto-loader-config.jsonc** - Source of truth for keyword/skill mappings
- **Universal Skill** - Always loaded by default to ensure system-wide consistency
