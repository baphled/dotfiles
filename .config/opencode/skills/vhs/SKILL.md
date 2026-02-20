---
name: vhs
description: Terminal recording and demos with VHS for creating compelling KaRiya demonstrations
category: DevOps Operations
---

# Skill: vhs

## What I do

I provide expertise in terminal recording and automated demonstration generation using [VHS](https://github.com/charmbracelet/vhs) for KaRiya, including happy-path scenarios, error handling, and multi-step intent interactions.

## When to use me

- When creating visual demos for new features or bug fixes.
- When automating the verification of TUI (Terminal User Interface) behaviour via BDD tests.
- When generating consistent onboarding materials for new KaRiya users or contributors.
- When troubleshooting timing-related UI issues that only appear during interaction.

## Core principles

1. **Deterministic**: Use temporary databases and isolated configurations for reproducible results.
2. **Visual Pacing**: Pace interactions with `Sleep` so viewers can follow the logic.
3. **KaRiya Conventions**: Use standard terminal dimensions and key bindings for consistency.

## VHS Tape Syntax Reference

### Essential Commands
- `Output <path>`: Specifies the file format and location (e.g., `Output demos/vhs/generated/feature.gif`).
- `Set <Key> <Value>`: Configures terminal settings (e.g., `Set FontSize 18`, `Set Width 1200`, `Set Height 600`).
- `Type "<text>"`: Simulates character-by-character typing.
- `Key <name>`: Sends a specific key press (e.g., `Key Enter`, `Key Tab`, `Key Escape`).
- `Sleep <duration>`: Pauses the execution (e.g., `Sleep 500ms`, `Sleep 2s`).
- `Screenshot <path>`: Captures a single frame at the current state.
- `Source <file>`: Includes another `.tape` file (useful for common setup scripts).
- `Hide` / `Show`: Wraps commands that should not be visible in the final recording (e.g., setup/cleanup).

## KaRiya-Specific Patterns

### Terminal Configuration
Consistent visual presentation is maintained via standard settings usually found in `config.tape`:
- **Width**: 1200
- **Height**: 600
- **FontSize**: 18

### Menu Navigation
- Select intent: Use `Down` key followed by `Enter`.
- Don't hardcode positions; reference intent names in comments.

### Form Interactions
- **Navigation**: Use `Tab` to move between fields.
- **Dropdowns**: Press `/` to search, type match, then `Enter`.
- **Confirm**: Send `Left` then `Enter` to confirm "Yes".

### Key Bindings
Standard TUI bindings to record:
- `a`: Add a new record.
- `d`: Delete the selected record.
- `e`: Edit the current record.
- `?`: Open the help overlay (useful for instructional demos).
- `Escape`: Navigate back to the previous screen or close modals.

## Tape File Conventions

### Directory Structure
- `demos/vhs/generated/`: Storage for auto-generated tapes from `vhsgen` and BDD test runs.
- `demos/vhs/features/{feature}/`: Hand-crafted tapes documenting specific features.
    - `happy-path.tape`: Standard successful workflow.
    - `sad-path.tape`: How the app handles errors or invalid input.
    - `edge-cases.tape`: Documentation for complex or rare scenarios.
- `demos/vhs/features/template/`: Boilerplate tape files to use as a starting point.

## Timing Guidelines

- **Launch**: `Sleep 3s` after starting the application.
- **Inter-action**: `Sleep 500ms` between key presses.
- **Result Display**: `Sleep 2s` after significant actions.

## Common Issues and Fixes

| Issue | Solution |
|-------|----------|
| **Tape Hangs** | Ensure `Enter` follows every `Type` action. |
| **Form Doesn't Submit** | Send `Key Left` then `Key Enter` on confirm fields. |
| **Dropdown Fails** | Use `/` to search instead of counting `Down` presses. |
| **UI Not Rendering** | Increase `Sleep` after launch and transitions. |

## Setup Pattern

Wrap application launch in `Hide`/`Show`:

```vhs
Hide
Type "mkdir -p /tmp/demo && cp config.yaml /tmp/demo/"
Key Enter
Type "./kariya --config /tmp/demo/config.yaml --db /tmp/demo/demo.db"
Key Enter
Sleep 3s
Show
```

## Related skills

- `bubble-tea-expert` – Understanding the underlying TUI framework.
- `bdd-workflow` – Using VHS for automated acceptance testing.
- `ui-design` – Evaluating the visual clarity of recorded interactions.
- `british-english` – Ensuring all demo text and documentation follows project spelling standards.

