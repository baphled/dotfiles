---
name: obsidian-mermaid-expert
description: Mermaid diagram plugin expertise for flowcharts and diagrams
category: Session Knowledge
---

# Skill: obsidian-mermaid-expert

## What I do

I provide comprehensive expertise in creating and maintaining Mermaid diagrams within Obsidian. I enable agents to transform complex technical concepts, architectures, and workflows into clear, text-based visual documentation that remains version-controllable and easily editable.

## When to use me

- When documenting system architecture or component relationships in the knowledge base.
- When visualising complex logic, decision trees, or algorithm control flows.
- When creating sequence diagrams for API interactions or object-oriented message passing.
- When mapping state machines, lifecycles, or business processes.
- When designing database schemas (ER diagrams) or class structures.
- When project timelines require Gantt charts or branch strategies require Git graphs.

## Core principles

1. **Declarative Clarity**: Describe *what* the structure is, not *how* to draw it. Focus on relationships and logical grouping.
2. **Atomic Modularity**: Prefer multiple focused diagrams over a single monolithic "god-diagram". Split complexity across notes using sub-headings or linked files.
3. **Progressive Disclosure**: Use subgraphs and clear labelling to hide implementation details until necessary. Start with high-level flows before diving into sub-processes.
4. **Consistency**: Use uniform node shapes (e.g., diamonds for decisions, rectangles for processes) and consistent terminology that matches the codebase.

## Diagram types

### Flowchart (Most Common)
Used for process flows, decision trees, and algorithm logic.
- **Direction**: `TD` (Top-Down) or `LR` (Left-Right). `LR` is often better for wide terminal-based workflows.
- **Syntax Example**:
  ```mermaid
  flowchart TD
      subgraph Process [Core Logic]
          A[Start] --> B{Valid?}
          B -- Yes --> C[[Process Data]]
          B -- No --> D[(Error Log)]
      end
      C --> E(End)
  ```

### Sequence Diagram
Visualises object interactions and temporal message passing.
- **Syntax Example**:
  ```mermaid
  sequenceDiagram
      participant C as Client
      participant S as Server
      C->>S: Request Data
      activate S
      S-->>C: Response (JSON)
      deactivate S
      Note over C,S: Connection closed
  ```

### State Diagram
Ideal for object lifecycles and workflow transitions.
- **Syntax Example**:
  ```mermaid
  stateDiagram-v2
      [*] --> Idle
      Idle --> Busy: Start
      state Busy {
          [*] --> Processing
          Processing --> Validating
      }
      Busy --> [*]: Success
  ```

### Class Diagram
Useful for documenting Go interfaces, Ruby classes, or generic OO structures.
- **Syntax Example**:
  ```mermaid
  classDiagram
      class Repository {
          <<interface>>
          +Save(data) error
          +Find(id) Entity
      }
      Repository <|.. SQLRepo : implements
  ```

### Entity-Relationship Diagram (ERD)
Standard for database schema documentation and data modeling.
- **Syntax Example**:
  ```mermaid
  erDiagram
      USER ||--o{ POST : "writes"
      USER {
          string email PK
          string username
      }
  ```

### Gantt Chart & Git Graph
Used for project management and branch strategy visualisations.
- **Gantt**: `gantt`, `section`, `task name :a1, 2024-01-01, 30d`
- **GitGraph**: `gitGraph`, `commit`, `branch`, `merge`

## Obsidian-specific considerations

- **Theme Compatibility**: Mermaid in Obsidian automatically adapts to dark and light themes. Avoid hardcoding colours; use `classDef` and `class` for semantic styling instead.
- **Rendering Limits**: Extremely large diagrams (100+ nodes) may lag or fail to render. Break them into subgraphs or separate files.
- **Interactivity**: You can use `click` commands to link nodes to other Obsidian notes: `click NodeID "[[Other Note]]"`.
- **Live Preview**: Always verify the diagram in Obsidian's Live Preview or Reading mode, as syntax errors in the `mermaid` block will prevent rendering entirely.

## When to use Mermaid vs alternatives

- **Use Mermaid for**: Technical documentation, architecture, logic flows, and state machines where the structure is the primary focus.
- **Use ChartJS (via plugin)**: For data-heavy visualisations, bar charts, line graphs, and statistical representations.
- **Use Canvas**: For non-linear brainstorming or when spatial layout is more important than declarative structure.
- **Use DataViewJS**: For dynamic tables or lists generated from vault metadata.

## Anti-patterns to avoid

❌ **Monolithic Diagrams**: Trying to fit an entire system into one `flowchart`. It becomes unreadable.
❌ **Missing Labels**: Using `A --> B` without describing the transition or relationship.
❌ **Inconsistent Naming**: Mixing `CamelCase` and `snake_case` in node IDs or labels.
❌ **Over-styling**: Using too many custom colours that clash with the user's Obsidian theme.
❌ **Deep Nesting**: Subgraphs inside subgraphs inside subgraphs (max 2 levels recommended).

## Related skills

- `architecture` – Mapping system components.
- `documentation-writing` – Enhancing prose with visual aids.
- `obsidian-structure` – Organising diagrams within the PARA framework.
- `domain-modeling` – Using ERDs and Class diagrams to define domains.
