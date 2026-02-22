---
name: obsidian-codeblock-expert
description: Code block and syntax highlighting expertise in Obsidian
category: Session Knowledge
---

# Skill: obsidian-codeblock-expert

## What I do

I provide expertise in managing and optimising code blocks within Obsidian. I ensure that technical snippets are readable, correctly highlighted, and integrated with Obsidian's ecosystem through proper language identifiers and plugin-specific syntax.

## When to use me

- When documenting code snippets, configuration files, or terminal commands.
- When setting up language-specific syntax highlighting for obscure or custom languages.
- When using plugins that extend code block functionality (e.g. Execute Code, Code Block Copy).
- When deciding between using a code block and a callout for technical instructions.

## Core principles

1. **Semantic Tagging** — Always use the correct language identifier (e.g. ```go, ```json) to ensure accurate syntax highlighting and searchability.
2. **Readability First** — Use line highlighting and comments within code blocks to draw attention to critical sections.
3. **Consistency** — Maintain a uniform style for terminal commands, ensuring they are distinct from source code snippets.
4. **Integration** — Leverage Obsidian-specific extensions like line numbers and "copy" buttons for improved developer experience.

## Patterns & examples

### Fenced Code Blocks with Identifiers
Always include the language tag immediately after the opening triple backticks.
```typescript
interface Config {
  vaultPath: string;
  enableDataview: boolean;
}
```

### Line Highlighting Syntax
Some themes and plugins support highlighting specific lines (e.g. using `{1,3-5}` after the language tag).
```python {2}
def hello():
    print("This line is highlighted")
    return True
```

### Callouts vs Code Blocks
Use code blocks for raw data or code, but wrap them in callouts for high-level "How-to" or "Warning" context.
> [!info] Configuration
> Edit your `config.yaml` as follows:
> ```yaml
> theme: dark
> font: JetBrains Mono
> ```

## Anti-patterns to avoid

- ❌ **Language-less Blocks** — Using ``` without an identifier defaults to plain text and loses highlighting.
- ❌ **Inline Bloat** — Putting long code snippets in backticks (`code`) instead of fenced blocks; this breaks line flow.
- ❌ **Screenshots of Code** — Capturing code as images instead of text; this prevents searching and copying.
- ❌ **Mixing Environments** — Combining shell commands and file contents in the same block without clear separation.

## KB Reference

`~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/Session-Knowledge/Obsidian Codeblock Expert.md`

## Related skills

- `obsidian-dataview-expert` — For querying metadata stored within or alongside code blocks.
- `obsidian-mermaid-expert` — For creating diagrams using specialised code block syntax.
- `documentation-writing` — For integrating code blocks into comprehensive technical guides.
- `javascript` — For writing scripts often embedded in DataviewJS or CustomJS blocks.
