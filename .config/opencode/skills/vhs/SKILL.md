---
name: vhs
description: Terminal recording and demos with VHS for creating compelling KaRiya demonstrations
category: DevOps Operations
---

# Skill: vhs

## What I do

I provide comprehensive expertise in terminal recording and automated demonstration generation using [VHS](https://github.com/charmbracelet/vhs). This skill focuses on creating high-quality, repeatable visual documentation for the KaRiya project, including happy-path scenarios, sad-path error handling, and complex multi-step intent interactions.

## When to use me

- When creating visual demos for new features or bug fixes.
- When automating the verification of TUI (Terminal User Interface) behaviour via BDD tests.
- When generating consistent onboarding materials for new KaRiya users or contributors.
- When troubleshooting timing-related UI issues that only appear during interaction.

## Core principles

1. **Deterministic Interaction**: Every tape should produce the same result regardless of the environment. Use temporary databases and isolated configurations.
2. **Visual Pacing**: Demos are for humans. Pace interactions (using `Sleep`) so viewers can follow the logic, especially when displaying error messages or final results.
3. **KaRiya Conventions**: Adhere to project-standard terminal dimensions and key bindings to ensure visual consistency across all project demos.

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
KaRiya's main menu order is defined in `DefaultMenuItems()`.
- To select an intent: Use `Down` key followed by `Enter`.
- **Warning**: Do not hardcode absolute positions (e.g., "press Down 4 times") as `DefaultMenuItems()` may change. Reference the intent name in comments.

### Form Interactions
KaRiya forms (built with `huh`) follow specific interaction rules:
- **Field Navigation**: Use `Tab` to move between form fields.
- **Dropdowns/Selects**: Press `/` to open search, type a partial match, then `Enter`.
- **Confirm Fields**: These require a `Left` arrow press followed by `Enter` to confirm "Yes" (the default is often "No").

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

To ensure the viewer can keep up with the action:
- **Launch**: `Sleep 3s` after starting the application to allow the UI and database to initialize.
- **Inter-action**: `Sleep 500ms` between key presses to prevent the demo from feeling "jittery".
- **Result Display**: `Sleep 2s` after a significant action (like submitting a form) before navigating away, giving the viewer time to see the confirmation message.

## Common Issues and Fixes

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| **Tape Hangs** | Incorrect key sequence or missing `Enter`. | Verify the sequence manually in a terminal first. Ensure `Enter` follows every `Type` action that requires submission. |
| **Form Doesn't Submit** | Missing `Left` on Confirm fields. | In `huh` confirm fields, explicitly send `Key Left` then `Key Enter`. |
| **Dropdown Fails** | Position changed or item not focused. | Use `/` to trigger search, `Type` the item name, and then `Key Enter`. This is more robust than counting `Down` presses. |
| **UI Not Rendering** | Too fast typing/interaction. | Increase `Sleep` after launch and between major transitions. |

## Setup Pattern

Always wrap the application launch in `Hide`/`Show` to avoid showing environmental setup:

```vhs
Hide
Type "mkdir -p /tmp/kariya-demo && cp config.yaml /tmp/kariya-demo/"
Key Enter
Type "./kariya --config /tmp/kariya-demo/config.yaml --db /tmp/kariya-demo/demo.db"
Key Enter
Sleep 3s
Show
# ... demo steps ...
```

## Related skills

- `bubble-tea-expert` – Understanding the underlying TUI framework.
- `bdd-workflow` – Using VHS for automated acceptance testing.
- `ui-design` – Evaluating the visual clarity of recorded interactions.
- `british-english` – Ensuring all demo text and documentation follows project spelling standards.

