---
name: investigation
description: Systematic codebase investigation producing structured Obsidian documentation with DataviewJS auto-indexing
---

# Skill: investigation

## What I do

I conduct systematic codebase investigations using parallel agent exploration, synthesise findings into a structured set of Obsidian documents, and create auto-generated DataviewJS indexes for discovery and navigation. The output is a reproducible, searchable investigation record stored in the user's Obsidian vault.

## When to use me

- When conducting a discovery or audit of an application or codebase
- When asked to investigate, explore, or assess a project
- When producing structured findings for a codebase review
- When the user wants a documented record of a project investigation

---

## Investigation Workflow

### Phase 1: Plan

1. **Identify the project** — name, language, worktree/branch, entry point
2. **Identify the vault** — default: `/home/baphled/vaults/baphled/`
3. **Determine folder path** — `1. Projects/{Project}/Investigations/{YYYY-MM-DD}/`
4. **Create a todo list** to track progress through all phases

### Phase 2: Explore (Parallel Agents)

Launch **6 parallel agents** (use a single message with multiple Task calls):

| Agent | Focus | Key Questions |
|-------|-------|---------------|
| 1 | Directory structure & project overview | Languages, frameworks, entry points, total files/LOC |
| 2 | Architecture & design patterns | Layers, boundaries, dependency flow, DI approach |
| 3 | Technical debt & code quality | Deprecated code, panics, magic numbers, linter suppressions, complexity |
| 4 | Testing strategy | Frameworks, coverage, test types (unit/integration/e2e), fixtures, mocking |
| 5 | CI/CD & tooling | Workflows, linters, Makefile targets, pre-commit hooks, automation |
| 6 | Documentation & developer experience | Doc files, README quality, onboarding, developer tooling |

Each agent should return structured findings with:
- Quantitative metrics (counts, percentages, LOC)
- Specific file paths and line numbers as evidence
- Assessment rating where appropriate
- Categorised issues (good/bad/ugly or similar)

### Phase 3: Synthesise Documents

Create **6 numbered documents** in the investigation folder:

| # | Filename | Content |
|---|----------|---------|
| 00 | `00-Executive-Summary.md` | The Good/Bad/Ugly, key metrics, architecture overview, overall assessment |
| 01 | `01-Architecture-Deep-Dive.md` | Layer analysis, patterns, dependency flow, violations |
| 02 | `02-Technical-Debt-Analysis.md` | Prioritised debt inventory with effort estimates |
| 03 | `03-Testing-Strategy.md` | Framework analysis, coverage, test patterns, gaps |
| 04 | `04-CI-CD-Assessment.md` | Pipeline evaluation, linting, automation maturity |
| 05 | `05-Recommendations.md` | Prioritised action plan (immediate/short/long term) |

### Phase 4: Create Auto-Generated Indexes

Create **2 DataviewJS index files**:

1. **Project-level index**: `1. Projects/{Project}/Investigations.md`
   - Auto-discovers dated folders under `Investigations/`
   - Renders a status grid showing which documents exist per investigation
   - Shows quick stats (total investigations, latest, total docs)

2. **Dated investigation page**: `1. Projects/{Project}/Investigations/{YYYY-MM-DD}.md`
   - Lists all documents in that dated folder
   - Shows document status, type, and descriptions
   - Links back to the main index

### Phase 5: Store in Memory

Create memory entities for key findings and link them together.

---

## Document Conventions

### Frontmatter Schema

Every investigation document MUST have this frontmatter:

```yaml
---
title: "{Project} {Topic}"
date: YYYY-MM-DD
type: discovery
project: {project-slug}
status: complete
created: YYYY-MM-DDTHH:MM
modified: YYYY-MM-DDTHH:MM
---
```

For index files, use `type: investigation` instead of `type: discovery`.

### Cross-Linking

Use relative wikilinks within the investigation folder:

```markdown
[[01-Architecture-Deep-Dive|Architecture Deep Dive]]
[[02-Technical-Debt-Analysis|Technical Debt Analysis]]
```

Do NOT prefix with the project name (e.g., `[[KaRiya-01-...]]`). Keep links relative to the folder.

### Tags

Add tags at the bottom of dated investigation pages:

```markdown
**Tags**: #investigation #{project-slug} #{YYYY-MM-DD} #discovery
```

### Numbering

Documents are numbered `00-05` with kebab-case names:
- `00-Executive-Summary`
- `01-Architecture-Deep-Dive`
- `02-Technical-Debt-Analysis`
- `03-Testing-Strategy`
- `04-CI-CD-Assessment`
- `05-Recommendations`

---

## DataviewJS Rules

### CRITICAL: Table Rendering

**ALWAYS** use `dv.table(headers, rows)` for tables:

```javascript
dv.table(
  ["Column A", "Column B"],
  [
    ["row1-a", "row1-b"],
    ["row2-a", "row2-b"]
  ]
);
```

**NEVER** use `dv.paragraph()` with markdown table strings — this renders as raw text, not a table.

### Project-Level Index Template

```javascript
// Auto-discover dated investigation folders
const folderPath = "1. Projects/{Project}/Investigations";

const datedFolders = dv.pages(`"${folderPath}"`)
  .where(p => p.file.folder.includes("/Investigations/20"))
  .map(p => p.file.folder)
  .distinct()
  .sort();

const headers = ["Date", "Summary", "Architecture", "Debt", "Testing", "CI/CD", "Recommendations"];
const rows = [];

for (const folder of datedFolders) {
  const date = folder.match(/(\d{4}-\d{2}-\d{2})/)?.[1] || "Unknown";
  const link = `[[${date}|${date}]]`;
  const files = dv.pages(`"${folder}"`).map(p => p.file.name.toLowerCase());

  rows.push([
    link,
    files.some(f => f.includes("summary")) ? "✅" : "❌",
    files.some(f => f.includes("architecture")) ? "✅" : "❌",
    files.some(f => f.includes("debt")) ? "✅" : "❌",
    files.some(f => f.includes("testing") || f.includes("test")) ? "✅" : "❌",
    files.some(f => f.includes("ci-") || f.includes("ci_cd") || f.includes("assessment")) ? "✅" : "❌",
    files.some(f => f.includes("recommendation")) ? "✅" : "❌"
  ]);
}

dv.table(headers, rows);
```

### Dated Investigation Page Template

```javascript
const folderPath = "1. Projects/{Project}/Investigations/{YYYY-MM-DD}";

const docs = dv.pages(`"${folderPath}"`)
  .sort(p => p.file.name, "asc");

dv.table(
  ["Document", "Status"],
  docs.map(p => [
    `[[${folderPath}/${p.file.name}|${p.file.name}]]`,
    "✅"
  ])
);
```

---

## Folder Structure

```
{vault}/
  1. Projects/
    {Project}/
      Investigations.md              ← DataviewJS auto-index (project-level)
      Investigations/
        {YYYY-MM-DD}.md              ← DataviewJS dated page
        {YYYY-MM-DD}/
          00-Executive-Summary.md
          01-Architecture-Deep-Dive.md
          02-Technical-Debt-Analysis.md
          03-Testing-Strategy.md
          04-CI-CD-Assessment.md
          05-Recommendations.md
      Guides/                        ← Knowledge base guides (optional)
```

---

## Anti-patterns to avoid

- **Hardcoding investigation data in index files** — indexes MUST use DataviewJS to auto-discover content
- **Using `dv.paragraph()` for tables** — always use `dv.table(headers, rows)`
- **Prefixing wikilinks with project name** — keep links relative (e.g., `[[01-Architecture-Deep-Dive]]` not `[[KaRiya-01-Architecture-Deep-Dive]]`)
- **Running exploration agents sequentially** — always launch all 6 in a single message for parallel execution
- **Skipping the memory storage phase** — findings must be stored as memory entities for future reference
- **Creating manual index files** — the project-level and dated indexes must be fully auto-generated
- **Forgetting frontmatter** — every document needs the full frontmatter schema
- **Mixing assessment with raw data** — the Executive Summary assesses; other documents present evidence

---

## Related skills

- `research` - General research methodology (investigation is a specialised form)
- `obsidian-structure` - PARA structure conventions for the vault
- `obsidian-dataview-expert` - DataviewJS queries and dashboards
- `memory-keeper` - Storing discoveries in the knowledge graph
- `parallel-execution` - Running exploration agents concurrently
- `note-taking` - General note creation conventions
