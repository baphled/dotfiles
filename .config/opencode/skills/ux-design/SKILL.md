---
name: ux-design
description: Intuitive user experiences in terminal applications - mental models, interaction patterns
category: UI Frameworks
---

# Skill: ux-design

## What I do

I help you create intuitive and user-friendly experiences in terminal applications. I focus on matching user expectations, providing clear feedback, and ensuring that complex tasks are easy to perform. I ensure that your CLI or TUI is a tool that users enjoy using rather than a source of frustration.

## When to use me

- When you're designing the interaction flow of a new CLI tool.
- When you're writing error messages or help text.
- When you're adding confirmation prompts for destructive actions.
- When you're designing the onboarding process for new users.

## Core principles

1. **Match user expectations**, follow established CLI conventions and use familiar terms and patterns.
2. **Progressive disclosure**, provide a simple default experience while allowing advanced users to access more features via flags or sub-commands.
3. **Immediate feedback**, always provide a clear and immediate response to user actions so they know what happened.
4. **Forgiving design**, make it easy for users to undo actions or get help when they're stuck.

## Patterns & examples

### Error message quality
Provide clear information about what went wrong and how to fix it.
- **Good**, "Error: Could not find config file at `~/.config/app.json`. Run `app init` to create one."
- **Bad**, "File not found."

### Confirmation for destructive actions
Prevent accidental data loss.
- **Example**, "Are you sure you want to delete all records? This action cannot be undone. [y/N]"

### Help text design
Ensure that help text is readable and useful.
- **Pattern**, Group flags by category (e.g., Output, Authentication) and provide clear examples of common commands.

### Feedback loops
Keep the user updated on the status of their request.
- **Action**, Use success messages like "Successfully updated record #123" or failure messages with specific error codes.

## Anti-patterns to avoid

- ❌ **Silent failures**, failing to provide any output when a command doesn't work as expected.
- ❌ **Inconsistent flags**, using different names for the same action across different commands (e.g., `-f` for force in one command and `--force` in another).
- ❌ **Hostile error messages**, using jargon or blaming the user for mistakes.
- ❌ **Opaque progress**, making the user wait for a long-running task without any indication of progress.

## KB Reference

`~/vaults/baphled/3. Resources/Knowledge Base/AI Development System/Skills/UI-Frameworks/UX Design.md`

## Related skills

- `ui-design`, for the visual layer of the interface.
- `information-architecture`, for structuring content and navigation.
- `accessibility`, for ensuring the experience is inclusive.
- `huh`, for building user-friendly interactive forms.
