---
name: obsidian-customjs-expert
description: CustomJS plugin expertise for scripting in Obsidian
category: Session Knowledge
---

# Skill: obsidian-customjs-expert

## What I do

I provide expertise in the CustomJS plugin for Obsidian, enabling complex, reusable logic to be offloaded from individual notes into shared JavaScript classes. I specialise in architecting these scripts for maintainability, integrating them with DataviewJS, and leveraging the full Obsidian API to automate vault management.

## When to use me

- When complex DataviewJS logic is repeated across multiple notes (e.g. project health calculation).
- When you need to create custom helpers for date manipulation, vault statistics, or automated indexing.
- When you want to trigger vault-level operations (like moving files or updating frontmatter) from a script.
- When optimizing vault performance by moving heavy logic into external script files that are loaded once.

## Core principles

1. **Encapsulation** — Group related functions into exported classes within the scripts folder.
2. **API Isolation** — Wrap Obsidian API calls in service-like methods to make scripts easier to test and reason about.
3. **Performance Awareness** — Avoid complex, synchronous operations in scripts that are called frequently by DataviewJS, as they can lag the UI.
4. **Defensive Coding** — Always include error handling and check for the existence of files or metadata before attempting to process them.

## Patterns & examples

### CustomJS Script Structure
Create a file in your configured scripts folder (e.g. `scripts/VaultStats.js`).
```javascript
class VaultStats {
    getNoteCount(dv) {
        return dv.pages().length;
    }

    getTaskSummary(dv) {
        const tasks = dv.pages().file.tasks;
        return {
            total: tasks.length,
            completed: tasks.where(t => t.completed).length
        };
    }
}
```

### Calling CustomJS from DataviewJS
Ensure the class is exported and call it using the `customJS` object.
```dataviewjs
const { VaultStats } = customJS;
const stats = VaultStats.getTaskSummary(dv);

dv.header(2, "Task Progress");
dv.paragraph(`You have completed ${stats.completed} out of ${stats.total} tasks.`);
```

## Anti-patterns to avoid

- ❌ **Spaghetti Scripts** — Writing long, procedural scripts without class-based organization.
- ❌ **Direct API Abuse** — Accessing `app.vault` directly for simple operations that Dataview already handles efficiently.
- ❌ **Hardcoded Paths** — Using absolute or hardcoded folder paths within scripts; prefer using relative paths or configuration-based lookups.
- ❌ **Missing Class Exports** — Forgetting to define methods as part of a class, which prevents CustomJS from exposing them to the vault.

## KB Reference

`~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/Session-Knowledge/Obsidian CustomJS Expert.md`

## Related skills

- `obsidian-dataview-expert` — For the primary integration point of CustomJS logic.
- `javascript` — For the underlying language expertise required to write effective scripts.
- `obsidian-frontmatter` — For defining the metadata that scripts often read and manipulate.
- `obsidian-structure` — For organizing the script folder and related resources.
- `documentation-writing` — For documenting the public methods of your custom script classes.
