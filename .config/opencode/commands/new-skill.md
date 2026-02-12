---
description: Create a new skill, command, or agent with full integration into all workflows and documentation
agent: senior-engineer
---

# Create New Skill, Command, or Agent

Create a new OpenCode component (skill, command, or agent) with full integration across the entire system.

## Skills Loaded

- `new-skill`
- `knowledge-base`
- `obsidian-structure`
- `obsidian-frontmatter`
- `memory-keeper`

## Purpose

Scaffold and fully integrate a new skill, command, or agent into all required locations. This command eliminates repeated discovery by encoding every integration point.

## Workflow

### Phase 0: Determine Component Type

Ask the user what they want to create:

1. **Skill** -- A composable knowledge module (SKILL.md + KB doc + inventory + workflows)
2. **Command** -- A slash command entry point (command.md + Commands Reference + workflow docs)
3. **Agent** -- A specialised subagent (agent.md + Agents Reference + flowchart)

Get from the user:
- **Name** (kebab-case, e.g. `investigation`, `new-intent`)
- **Description** (one sentence)
- **Category/Domain** for skills (e.g. Workflow Orchestration, Testing BDD, Code Quality)
- **Agent assignment** for commands (e.g. senior-engineer, data-analyst)

---

### Phase 1: Create the Component File

Use the **senior-engineer** agent.

#### If Skill:

Create `~/.config/opencode/skills/{name}/SKILL.md`:

```markdown
---
name: {name}
description: {description}
---

# Skill: {name}

## What I do
2-3 sentences explaining core purpose.

## When to use me
- Bullet points for specific contexts

## Core principles
1. Principle one
2. Principle two
3. Principle three

## Patterns & examples
Concrete patterns with code examples.

## Anti-patterns to avoid
- Common mistakes

## Related skills
- `skill-a` - Pairs with this when doing X
```

**Constraints:** Max 5KB. Frontmatter: ONLY name + description.

#### If Command:

Create `~/.config/opencode/commands/{name}.md`:

```markdown
---
description: {description}
agent: {agent}
---

# {Title}

{Brief explanation}

## Skills Loaded

- `skill-1`
- `skill-2`

## Purpose

{What this command does and when to use it}

$ARGUMENTS
```

#### If Agent:

Create `~/.config/opencode/agents/{name}.md`:

```markdown
---
description: {description}
mode: subagent
tools:
  write: {bool}
  edit: {bool}
  bash: {bool}
permission:
  skill:
    "*": "allow"
---

# {Name} Agent

{Role description}

## When to use this agent
- {contexts}

## Key responsibilities
1. {responsibility}

## Always-active skills
- `pre-action` - {reason}
- `{skill}` - {reason}

## Skills to load
- `{skill}` - {description}
```

---

### Phase 2: Create Knowledge Base Documentation

Use the **writer** agent. Create the Obsidian KB doc.

#### For Skills:

Create `/home/baphled/vaults/baphled/3. Resources/Knowledge Base/Skills/{Category}/{Name}.md`:

```yaml
---
id: {name}
aliases:
  - {Display Name}
category: {Category}
tags:
  - type/note
  - skill/{name}
  - area/{domain}
  - system/opencode
created: {YYYY-MM-DDTHH:MM}
modified: {YYYY-MM-DDTHH:MM}
lead: {description}
---
```

Include: When to Use, full workflow/process, conventions, anti-patterns, related skills, related notes.

#### For Commands:

Update `/home/baphled/vaults/baphled/3. Resources/Tech/OpenCode/Commands Reference.md`:
- Add the command to the correct category table
- Update the "By Agent" counts section

#### For Agents:

Create `/home/baphled/vaults/baphled/3. Resources/Knowledge Base/Agents/{name}.md`

Update `/home/baphled/vaults/baphled/3. Resources/Tech/OpenCode/Agents Reference.md`:
- Add to the agents table
- Add a Mermaid flowchart
- Update agent count

---

### Phase 3: Update Inventories and Dashboards

Use the **senior-engineer** agent. Run these updates in parallel:

#### For Skills (ALL of these are required):

1. **Skills Inventory** (`3. Resources/Tech/OpenCode/Skills Inventory.md`):
   - Add skill to correct domain section with sequential number
   - Update domain count in Domain Overview table
   - Update total skill count in header and body

2. **Skills Dashboard** (`3. Resources/Knowledge Base/Skills.md`):
   - Update category count in the Skill Organisation table
   - Update total skill count in header (`lead:`) and body
   - Add to Common Skill Pairings table if it has notable pairings

3. **Skills Relationship Mapping** (`3. Resources/Tech/OpenCode/Skills Relationship Mapping.md`):
   - Add agent flow diagram showing when/how the skill loads
   - Add to the correct skill grouping section
   - Add to "When Skills Appear Together" pairings table

#### For Commands:

4. **Commands Reference** (`3. Resources/Tech/OpenCode/Commands Reference.md`):
   - Add to the correct category table
   - Update "By Agent" counts

#### For Agents:

5. **Agents Reference** (`3. Resources/Tech/OpenCode/Agents Reference.md`):
   - Add to the 10 Agents table (now 11)
   - Add Mermaid flowchart
   - Update count references

---

### Phase 4: Integrate into Workflows

Use the **senior-engineer** agent.

#### For Skills:

1. **Identify commands that should load this skill**:
   - Check all 42 commands in `~/.config/opencode/commands/`
   - Add the skill to the `## Skills Loaded` section of relevant commands

2. **Identify agents that should have access**:
   - Check all agents in `~/.config/opencode/agents/`
   - Add to `## Skills to load` section of relevant agents

3. **Update Common Workflows** (`3. Resources/Tech/OpenCode/Common Workflows.md`):
   - If the skill defines a new workflow, add a full workflow section
   - Add to the Workflow Selection Guide table
   - Add a cross-workflow pattern if applicable

#### For Commands:

4. **Update Common Workflows**:
   - Add command to the Workflow Selection Guide table
   - Add cross-workflow patterns showing where this command fits

#### For Agents:

5. **Update Commands Reference** to show which commands use the new agent

---

### Phase 5: Update Related Skills

Use the **senior-engineer** agent.

For each skill listed in the new skill's "Related skills" section:
- Read the related skill's SKILL.md
- Add a back-reference to the new skill in their "Related skills" section
- Only if the reference is meaningful (don't force it)

---

### Phase 6: Store in Memory

Use the **memory-keeper** pattern.

1. Create a memory entity for the new component
2. Add observations about its purpose, location, and integration points
3. Create relations to related entities (commands, agents, other skills)

---

## Checklist (Must Complete ALL)

### Skill Creation Checklist

- [ ] SKILL.md created at `~/.config/opencode/skills/{name}/SKILL.md`
- [ ] KB doc created at `3. Resources/Knowledge Base/Skills/{Category}/{Name}.md`
- [ ] Skills Inventory updated (number, count, total)
- [ ] Skills Dashboard updated (count, total, pairings)
- [ ] Skills Relationship Mapping updated (flow, grouping, pairings)
- [ ] Relevant commands updated with skill in `## Skills Loaded`
- [ ] Relevant agents updated with skill in `## Skills to load`
- [ ] Common Workflows updated (if new workflow)
- [ ] Related skills back-referenced
- [ ] Memory graph updated

### Command Creation Checklist

- [ ] Command file created at `~/.config/opencode/commands/{name}.md`
- [ ] Commands Reference updated (table, agent counts)
- [ ] Common Workflows updated (selection guide, cross-patterns)
- [ ] Memory graph updated

### Agent Creation Checklist

- [ ] Agent file created at `~/.config/opencode/agents/{name}.md`
- [ ] KB doc created at `3. Resources/Knowledge Base/Agents/{name}.md`
- [ ] Agents Reference updated (table, flowchart, count)
- [ ] Commands Reference updated (agent counts)
- [ ] Memory graph updated

---

## File Locations Reference

| What | Where |
|------|-------|
| Skills | `~/.config/opencode/skills/{name}/SKILL.md` |
| Commands | `~/.config/opencode/commands/{name}.md` |
| Agents | `~/.config/opencode/agents/{name}.md` |
| Skill KB docs | `~/vaults/baphled/3. Resources/Knowledge Base/Skills/{Category}/{Name}.md` |
| Agent KB docs | `~/vaults/baphled/3. Resources/Knowledge Base/Agents/{Name}.md` |
| Skills Inventory | `~/vaults/baphled/3. Resources/Tech/OpenCode/Skills Inventory.md` |
| Skills Dashboard | `~/vaults/baphled/3. Resources/Knowledge Base/Skills.md` |
| Skills Mapping | `~/vaults/baphled/3. Resources/Tech/OpenCode/Skills Relationship Mapping.md` |
| Common Workflows | `~/vaults/baphled/3. Resources/Tech/OpenCode/Common Workflows.md` |
| Commands Reference | `~/vaults/baphled/3. Resources/Tech/OpenCode/Commands Reference.md` |
| Agents Reference | `~/vaults/baphled/3. Resources/Tech/OpenCode/Agents Reference.md` |
| Skill Structure | `~/vaults/baphled/3. Resources/Tech/OpenCode/Skill Structure.md` |
| Skills Creation Guide | `~/vaults/baphled/3. Resources/Tech/OpenCode/Skills Creation Guide.md` |

$ARGUMENTS
