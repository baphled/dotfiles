---
name: new-skill
description: Create new skills, commands, or agents with full integration into all workflows and documentation
category: Workflow Orchestration
---

# Skill: new-skill

## What I do

I provide the complete checklist, templates, and file locations for creating new OpenCode components (skills, commands, agents), encoding every integration point.

## When to use me

- Creating a new skill, command, or agent
- When `/new-skill` command is invoked
- When extending the OpenCode system with new capabilities

## Core principles

1. **Complete integration** -- Every new component must update ALL touchpoints (not just the file itself)
2. **Template consistency** -- Follow established templates exactly (frontmatter, sections, naming)
3. **Parallel execution** -- Independent updates (inventory, dashboard, mapping) run simultaneously
4. **No discovery tax** -- All file paths, conventions, and steps are encoded here

## Required integration points

### For a new Skill (11 touchpoints):

1. `~/.config/opencode/skills/{name}/SKILL.md` -- The skill file (max 5KB, name + description frontmatter only)
2. `~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/{Category}/{Name}.md` -- KB doc with full frontmatter
3. `~/vaults/baphled/3. Resources/Tech/OpenCode/Skills Inventory.md` -- Add to domain, update counts
4. `~/vaults/baphled/3. Resources/Knowledge Base/Skills.md` -- Update category count, total, pairings
5. `~/vaults/baphled/3. Resources/Tech/OpenCode/Skills Relationship Mapping.md` -- Add flow, grouping, pairings
6. `~/.config/opencode/commands/*.md` -- Add to relevant commands' Skills Loaded sections
7. `~/.config/opencode/agents/*.md` -- Add to relevant agents' Skills to load sections
8. `~/vaults/baphled/3. Resources/Tech/OpenCode/Common Workflows.md` -- Add workflow if applicable
9. Related skills' SKILL.md files -- Back-reference the new skill
10. Memory graph -- Create entity with observations and relations
11. `make vault-sync` (from `~/.config/opencode/`) -- Regenerate vault JSON cache so dashboards reflect the new skill

### For a new Command (5 touchpoints):

1. `~/.config/opencode/commands/{name}.md` -- The command file
2. `~/vaults/baphled/3. Resources/Tech/OpenCode/Commands Reference.md` -- Add to table, update agent counts
3. `~/vaults/baphled/3. Resources/Tech/OpenCode/Common Workflows.md` -- Add to selection guide
4. Memory graph -- Create entity
5. `make vault-sync` (from `~/.config/opencode/`) -- Regenerate vault JSON cache

### For a new Agent (6 touchpoints):

1. `~/.config/opencode/agents/{name}.md` -- The agent file
2. `~/vaults/baphled/3. Resources/Knowledge Base/Agents/{name}.md` -- KB doc
3. `~/vaults/baphled/3. Resources/Tech/OpenCode/Agents Reference.md` -- Table, flowchart, count
4. `~/vaults/baphled/3. Resources/Tech/OpenCode/Commands Reference.md` -- Update agent counts
5. Memory graph -- Create entity
6. `make vault-sync` (from `~/.config/opencode/`) -- Regenerate vault JSON cache

## Skill categories (for KB doc placement)

| Category | Path under `Knowledge Base/Skills/` |
|----------|--------------------------------------|
| Core Universal | `Core Universal/` |
| Testing BDD | `Testing BDD/` |
| Code Quality | `Code Quality/` |
| Git | `Git/` |
| Delivery | `Delivery/` |
| Communication Writing | `Communication Writing/` |
| Thinking Analysis | `Thinking Analysis/` |
| UI Frameworks | `UI Frameworks/` |
| Database Persistence | `Database Persistence/` |
| Security | `Security/` |
| DevOps Operations | `DevOps Operations/` |
| Workflow Orchestration | `Workflow Orchestration/` |
| Session Knowledge | `Session Knowledge/` |
| Performance Profiling | `Performance Profiling/` |
| Domain Architecture | `Domain Architecture/` |
| General Cross Cutting | `General Cross Cutting/` |

## Anti-patterns to avoid

- Creating only the SKILL.md without updating inventories and dashboards
- Forgetting to update counts (total skills, category count) in multiple files
- Skipping the KB doc (Obsidian is the comprehensive reference; skills are max 5KB)
- Not back-referencing in related skills
- Not storing in memory graph (future sessions lose context)
- Running updates sequentially when they can be parallel
- Forgetting `make vault-sync` after creating a component — dashboards show stale data until the post-commit hook auto-syncs
- Omitting the `## KB Reference` section — skills cap at 5KB; point agents to the KB doc for comprehensive coverage and extended examples

## KB Reference

`~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/Core-Universal/New Skill.md`

## Related skills

- `knowledge-base` - Storage and retrieval of findings
- `obsidian-structure` - PARA structure for vault placement
- `obsidian-frontmatter` - Frontmatter standards for KB docs
- `memory-keeper` - Storing new component in knowledge graph
- `skill-integration` - Integrating skills into workflows
